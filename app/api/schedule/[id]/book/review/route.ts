import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  makeCheckInCode,
  nextAvailableSeatNumber,
  syncMeetStatus,
} from "@/lib/schedule/meet-service"

interface Params {
  params: Promise<{ id: string }>
}

/** Host / club owner accepts or rejects a PENDING seat request. */
export async function POST(request: Request, { params }: Params) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { id: meetId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    bookingId?: string
    action?: "approve" | "reject" | "release"
  }

  if (!body.bookingId || !body.action) {
    return NextResponse.json(
      { error: "bookingId and action are required" },
      { status: 400 },
    )
  }

  const meet = await prisma.meet.findUnique({ where: { id: meetId } })
  if (!meet) {
    return NextResponse.json({ error: "Meet not found" }, { status: 404 })
  }

  const isHost = meet.hostId === user.id || user.role === "ADMIN"
  if (!isHost) {
    return NextResponse.json(
      { error: "Only the table host can review seat requests" },
      { status: 403 },
    )
  }

  const booking = await prisma.booking.findFirst({
    where: { id: body.bookingId, meetId },
  })
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  if (body.action === "reject") {
    if (booking.status !== "PENDING" && booking.status !== "WAITLIST") {
      return NextResponse.json(
        { error: "Only pending / waitlist requests can be rejected" },
        { status: 400 },
      )
    }
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        seatNumber: null,
        paymentMethod: null,
        checkInCode: null,
      },
    })
    return NextResponse.json({ booking: updated })
  }

  if (body.action === "release") {
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Only confirmed seats can be released" },
        { status: 400 },
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          seatNumber: null,
          paymentMethod: null,
          checkInCode: null,
        },
      })

      const nextWait = await tx.booking.findFirst({
        where: { meetId, status: "WAITLIST" },
        orderBy: { createdAt: "asc" },
      })
      let promoted = null
      if (nextWait) {
        // Waitlist still needs host approval → move to PENDING
        promoted = await tx.booking.update({
          where: { id: nextWait.id },
          data: {
            status: "PENDING",
            seatNumber: null,
            checkInCode: null,
          },
        })
      }

      const nextConfirmed = await tx.booking.count({
        where: { meetId, status: "CONFIRMED" },
      })
      await tx.meet.update({
        where: { id: meetId },
        data: {
          status: syncMeetStatus(nextConfirmed, meet.maxSeats, meet.status),
        },
      })

      return { promoted }
    })

    return NextResponse.json({ ok: true, promoted: result.promoted })
  }

  // approve
  if (booking.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending requests can be approved" },
      { status: 400 },
    )
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const [confirmedCount, liveSession] = await Promise.all([
        tx.booking.count({
          where: { meetId, status: "CONFIRMED" },
        }),
        tx.gameSession.findFirst({
          where: { meetId, status: "LIVE" },
          include: { seats: { orderBy: { seatOrder: "asc" } } },
        }),
      ])

      const occupiedLiveSeats = liveSession
        ? liveSession.seats.filter(
            (s) => s.userId != null || s.guestName !== "Retired (Open)",
          ).length
        : 0

      if (Math.max(confirmedCount, occupiedLiveSeats) >= meet.maxSeats) {
        throw new Error("FULL")
      }

      const seatNumber = await nextAvailableSeatNumber(
        meetId,
        meet.maxSeats,
        tx,
      )
      const next = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          seatNumber,
          checkInCode: makeCheckInCode(meetId),
          paymentMethod:
            booking.paymentMethod ?? (meet.feeIdr > 0 ? "QRIS" : null),
        },
      })

      let joinedLiveSeatId: string | null = null
      if (liveSession) {
        const openSeat = liveSession.seats.find(
          (s) => s.userId == null && s.guestName === "Retired (Open)",
        )
        if (openSeat) {
          joinedLiveSeatId = openSeat.id
          await tx.sessionSeat.update({
            where: { id: openSeat.id },
            data: {
              userId: booking.userId,
              guestName: null,
              netPoints: 0,
              wins: 0,
              selfDraws: 0,
              dealtInCount: 0,
            },
          })
        }
      }

      const nextOccupied = Math.max(confirmedCount + 1, occupiedLiveSeats)
      await tx.meet.update({
        where: { id: meetId },
        data: {
          status: syncMeetStatus(nextOccupied, meet.maxSeats, meet.status),
        },
      })

      return { next, liveSessionId: liveSession?.id ?? null, joinedLiveSeatId }
    })

    if (updated.liveSessionId && updated.joinedLiveSeatId) {
      const { markSeatResetAtCurrentHand } = await import(
        "@/lib/session/manage"
      )
      await markSeatResetAtCurrentHand(
        updated.liveSessionId,
        updated.joinedLiveSeatId,
      )
    }

    return NextResponse.json({ booking: updated.next })
  } catch (error) {
    if (error instanceof Error && error.message === "FULL") {
      return NextResponse.json(
        { error: "Table is full — wait until a player retires" },
        { status: 409 },
      )
    }
    throw error
  }
}
