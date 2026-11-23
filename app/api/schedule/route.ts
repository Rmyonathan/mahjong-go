import { NextResponse } from "next/server"
import type { MeetBoardType } from "@prisma/client"

import { getSessionUser, requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  DEFAULT_MEET_FEE_IDR,
  DEFAULT_MEET_LOCATION,
  listUpcomingMeets,
  type CreateMeetBody,
} from "@/lib/schedule/meet-service"

export async function GET() {
  const user = await getSessionUser()
  const meets = await listUpcomingMeets(user?.id ?? null)
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

export async function POST(request: Request) {
  let host
  try {
    host = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Admin/host only" }, { status: 403 })
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
  // EDIT HERE — falls back to default venue / fee when host leaves blanks
  const location = body.location?.trim() || DEFAULT_MEET_LOCATION
  const feeIdr =
    typeof body.feeIdr === "number" && body.feeIdr >= 0
      ? body.feeIdr
      : DEFAULT_MEET_FEE_IDR

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
      proOnly: Boolean(body.proOnly),
      status: "OPEN",
      hostId: host.id,
    },
  })

  return NextResponse.json({ meet }, { status: 201 })
}
