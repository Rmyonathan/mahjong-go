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
  const boardType: MeetBoardType =
    body.boardType === "ADVANCED" ||
    body.boardType === "MCR" ||
    body.boardType === "GUIDED"
      ? body.boardType
      : "BEGINNER"
  const scoringRuleset =
    body.scoringRuleset === "CHICKEN" ? "CHICKEN" : "JADE_HK"

  if (
    !title ||
    !dateLabel ||
    !startTime ||
    !endTime ||
    !startsAt ||
    !endsAt ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime())
  ) {
    return NextResponse.json(
      { error: "Title, date, and times are required" },
      { status: 400 },
    )
  }

  const tables = 1
  const maxSeats = Number(body.maxSeats) === 3 ? 3 : 4
  const location = body.location?.trim() || DEFAULT_MEET_LOCATION

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
  let isCertifiedMentor = isClub
  if (!isClub && boardType === "GUIDED") {
    const { getMentorStatusForUser } = await import("@/lib/mentors/service")
    const mentor = await getMentorStatusForUser(hostRow.id)
    isCertifiedMentor = mentor.isCertifiedMentor
  }
  const canChargeSeats = isClub || (isCertifiedMentor && boardType === "GUIDED")
  const feeIdr = canChargeSeats
    ? typeof body.feeIdr === "number" && body.feeIdr >= 0
      ? body.feeIdr
      : DEFAULT_MEET_FEE_IDR
    : 0
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

  const meetBase = {
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
    status: "OPEN" as const,
    hostId: host.id,
    captainId,
    scanLimit,
  }

  let meet
  try {
    meet = await prisma.meet.create({
      data: { ...meetBase, scoringRuleset },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("Unknown argument `scoringRuleset`")) {
      meet = await prisma.meet.create({ data: meetBase })
    } else {
      console.error("[POST /api/schedule]", err)
      return NextResponse.json(
        {
          error:
            "Could not create meet. Stop the dev server, run `npx prisma generate`, then restart.",
        },
        { status: 500 },
      )
    }
  }

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
