import { NextResponse } from "next/server"
import type { MeetStatus } from "@prisma/client"

import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { syncMeetStatus } from "@/lib/schedule/meet-service"

interface Params {
  params: Promise<{ id: string }>
}

/** Admin-only: edit meet fields / toggle status. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = (await request.json()) as {
    title?: string
    status?: MeetStatus
    maxSeats?: number
    feeIdr?: number
    startsAt?: string
    endsAt?: string
    startTime?: string
    endTime?: string
    dateLabel?: string
  }

  const existing = await prisma.meet.findUnique({
    where: { id },
    include: {
      bookings: { where: { status: "CONFIRMED" }, select: { id: true } },
    },
  })
  if (!existing) {
    return NextResponse.json({ error: "Meet not found" }, { status: 404 })
  }

  const data: {
    title?: string
    status?: MeetStatus
    maxSeats?: number
    feeIdr?: number
    startsAt?: Date
    endsAt?: Date
    startTime?: string
    endTime?: string
    dateLabel?: string
  } = {}

  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim()
  }
  if (
    body.status === "OPEN" ||
    body.status === "FULL" ||
    body.status === "COMPLETED"
  ) {
    data.status = body.status
  }
  if (typeof body.maxSeats === "number" && body.maxSeats >= 1) {
    data.maxSeats = Math.floor(body.maxSeats)
  }
  if (typeof body.feeIdr === "number" && body.feeIdr >= 0) {
    data.feeIdr = Math.floor(body.feeIdr)
  }
  if (typeof body.startsAt === "string") {
    const startsAt = new Date(body.startsAt)
    if (!Number.isNaN(startsAt.getTime())) data.startsAt = startsAt
  }
  if (typeof body.endsAt === "string") {
    const endsAt = new Date(body.endsAt)
    if (!Number.isNaN(endsAt.getTime())) data.endsAt = endsAt
  }
  if (typeof body.startTime === "string" && body.startTime.trim()) {
    data.startTime = body.startTime.trim()
  }
  if (typeof body.endTime === "string" && body.endTime.trim()) {
    data.endTime = body.endTime.trim()
  }
  if (typeof body.dateLabel === "string" && body.dateLabel.trim()) {
    data.dateLabel = body.dateLabel.trim()
  }

  // If admin didn't force status, keep OPEN/FULL in sync with seats
  if (!data.status && data.maxSeats != null) {
    data.status = syncMeetStatus(
      existing.bookings.length,
      data.maxSeats,
      existing.status,
    )
  }

  const meet = await prisma.meet.update({
    where: { id },
    data,
  })

  return NextResponse.json({
    meet: {
      id: meet.id,
      title: meet.title,
      status: meet.status,
      maxSeats: meet.maxSeats,
      feeIdr: meet.feeIdr,
      startsAt: meet.startsAt.toISOString(),
      endsAt: meet.endsAt.toISOString(),
    },
  })
}

/**
 * Admin-only: remove meet from schedule UI.
 * Soft-delete (CANCELLED) — meet, bookings, and GameSessions stay in DB
 * so session history / archives keep working.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.meet.findUnique({
    where: { id },
    include: {
      sessions: { where: { status: "LIVE" }, select: { id: true } },
    },
  })
  if (!existing) {
    return NextResponse.json({ error: "Meet not found" }, { status: 404 })
  }
  if (String(existing.status) === "CANCELLED") {
    return NextResponse.json({ ok: true, alreadyRemoved: true })
  }
  if (existing.sessions.length > 0) {
    return NextResponse.json(
      { error: "End live table first" },
      { status: 409 },
    )
  }

  // Soft-remove from schedule; keep meet + sessions for history.
  // Raw SQL so this works even before `prisma generate` picks up CANCELLED.
  await prisma.$executeRaw`
    UPDATE "Meet"
    SET status = 'CANCELLED'::"MeetStatus", "updatedAt" = NOW()
    WHERE id = ${id}
  `

  return NextResponse.json({ ok: true })
}
