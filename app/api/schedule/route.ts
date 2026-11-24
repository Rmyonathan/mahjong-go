import { NextResponse } from "next/server"
import type { MeetBoardType, MeetVisibility } from "@prisma/client"

import { getSessionUser, requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  DEFAULT_MEET_FEE_IDR,
  DEFAULT_MEET_LOCATION,
  listUpcomingMeets,
  makeInviteCode,
  resolveScanLimitForUser,
  type CreateMeetBody,
} from "@/lib/schedule/meet-service"

export async function GET(request: Request) {
  const user = await getSessionUser()
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const codesParam = searchParams.get("codes")
  const inviteCodes = [
    ...(codesParam ? codesParam.split(",") : []),
    ...(code ? [code] : []),
    ...searchParams.getAll("code"),
  ]
  const q = searchParams.get("q")

  const meets = await listUpcomingMeets(
    user?.id ?? null,
    user?.role === "ADMIN",
    { inviteCodes, q },
  )
  return NextResponse.json({
    meets,
    viewer: user
      ? {
          id: user.id,
          name: user.name,
          role: user.role,
        }
      : null,
  })
}

/** Any logged-in member can open a table. Club (ADMIN) tables get unlimited scans. */
export async function POST(request: Request) {
  let host
  try {
    host = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json()) as Partial<CreateMeetBody>
  const title = body.title?.trim()
  const dateLabel = body.dateLabel?.trim()
  const startTime = body.startTime?.trim()
  const endTime = body.endTime?.trim()
  const startsAt = body.startsAt ? new Date(body.startsAt) : null
  const endsAt = body.endsAt ? new Date(body.endsAt) : null
  const boardType = body.boardType as MeetBoardType | undefined

  if (
    !title ||
    !dateLabel ||
    !startTime ||
    !endTime ||
    !startsAt ||
    !endsAt ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    !boardType
  ) {
    return NextResponse.json(
      { error: "Title, date, times, and board type are required" },
      { status: 400 },
    )
  }

  const maxSeats = Math.max(1, Number(body.maxSeats) || 4)
  const tables = Math.max(1, Number(body.tables) || Math.ceil(maxSeats / 4))
  const location = body.location?.trim() || DEFAULT_MEET_LOCATION
  const feeIdr =
    typeof body.feeIdr === "number" && body.feeIdr >= 0
      ? body.feeIdr
      : DEFAULT_MEET_FEE_IDR

  const hostRow = await prisma.user.findUnique({
    where: { id: host.id },
    select: {
      id: true,
      role: true,
      membershipTier: true,
      proExpiresAt: true,
    },
  })
  if (!hostRow) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  const scanLimit = resolveScanLimitForUser(hostRow)
  const isClub = hostRow.role === "ADMIN"
  const visibility: MeetVisibility =
    body.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC"
  const inviteCode = visibility === "PRIVATE" ? makeInviteCode() : null

  let captainId: string | null = hostRow.id
  if (isClub && body.captainId) {
    const captain = await prisma.user.findUnique({
      where: { id: body.captainId },
      select: { id: true },
    })
    if (captain) captainId = captain.id
  }

  const meet = await prisma.meet.create({
    data: {
      title,
      dateLabel,
      startTime,
      endTime,
      startsAt,
      endsAt,
      location,
      boardType,
      maxSeats,
      tables,
      feeIdr,
      proEarlyBirdUntil: body.proEarlyBirdUntil
        ? new Date(body.proEarlyBirdUntil)
        : null,
      proOnly: isClub ? Boolean(body.proOnly) : false,
      visibility,
      inviteCode,
      status: "OPEN",
      hostId: host.id,
      captainId,
      scanLimit,
    },
  })

  return NextResponse.json(
    {
      meet: {
        ...meet,
        isClubTable: isClub,
        scanLabel:
          scanLimit == null ? "Unlimited scans" : `${scanLimit} scans`,
        invitePath: inviteCode
          ? `/schedule?code=${encodeURIComponent(inviteCode)}`
          : null,
      },
    },
    { status: 201 },
  )
}
