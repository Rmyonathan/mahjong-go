import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  getSessionManageState,
  markSeatResetAtCurrentHand,
  removeHandFromSession,
  retireSeat,
  saveSessionManageState,
} from "@/lib/session/manage"
import { getGameSession, serializeSession } from "@/lib/session/service"

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { id: sessionId } = await params
  const existing = await getGameSession(sessionId)
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const isOwner = user.id === existing.captainUserId || user.role === "ADMIN"
  if (!isOwner) {
    return NextResponse.json(
      { error: "Only the table owner can manage this table" },
      { status: 403 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string
    seatIndex?: number
    roundNumber?: number
    userId?: string
    seatId?: string
    bookingId?: string
    replacementName?: string
    handId?: string
  }

  const seatCount = Math.max(existing.seats.length, 1)
  const baseHands = existing.hands.length
  const baseDealer = baseHands % seatCount
  const cur = await getSessionManageState(sessionId)

  try {
    if (body.action === "set_dealer") {
      const target = Math.max(0, Math.min(seatCount - 1, Number(body.seatIndex ?? 0)))
      const dealerOffset = (((target - baseDealer) % seatCount) + seatCount) % seatCount
      await saveSessionManageState(sessionId, { ...cur, dealerOffset })
    } else if (body.action === "set_round") {
      const targetRound = Math.max(1, Math.min(16, Number(body.roundNumber ?? 1)))
      const targetHandNumber = (targetRound - 1) * seatCount + 1
      const baseHandNumber = baseHands + 1
      await saveSessionManageState(sessionId, {
        ...cur,
        roundOffset: targetHandNumber - baseHandNumber,
      })
    } else if (body.action === "toggle_scanner" && body.userId) {
      const has = cur.scannerUserIds.includes(body.userId)
      const next = has
        ? cur.scannerUserIds.filter((id) => id !== body.userId)
        : [...cur.scannerUserIds, body.userId].slice(0, 3)
      await saveSessionManageState(sessionId, {
        ...cur,
        scannerUserIds: next,
      })
    } else if (
      (body.action === "retire_seat" || body.action === "kick_seat") &&
      body.seatId
    ) {
      await retireSeat({
        sessionId,
        seatId: body.seatId,
        captainUserId: existing.captainUserId,
        replacementName: body.replacementName,
      })
    } else if (body.action === "remove_hand" && body.handId) {
      await removeHandFromSession({
        sessionId,
        handId: body.handId,
      })
    } else if (
      body.action === "seat_waitlist" &&
      body.seatId &&
      body.bookingId
    ) {
      if (!existing.meetId) {
        return NextResponse.json(
          { error: "This table is not linked to a schedule meet" },
          { status: 400 },
        )
      }
      const meetId = existing.meetId
      const targetSeat = existing.seats.find((s) => s.id === body.seatId)
      if (!targetSeat) {
        return NextResponse.json({ error: "Seat not found" }, { status: 404 })
      }
      if (targetSeat.userId) {
        return NextResponse.json(
          { error: "Retire the current player first before seating from waitlist" },
          { status: 400 },
        )
      }

      const { makeCheckInCode, syncMeetStatus } = await import(
        "@/lib/schedule/meet-service"
      )
      await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({
          where: {
            id: body.bookingId,
            meetId,
            status: { in: ["PENDING", "WAITLIST"] },
          },
        })
        if (!booking) {
          throw new Error("Waitlist booking not found")
        }

        await tx.sessionSeat.update({
          where: { id: targetSeat.id },
          data: {
            userId: booking.userId,
            guestName: null,
            netPoints: 0,
            wins: 0,
            selfDraws: 0,
            dealtInCount: 0,
          },
        })
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            seatNumber: targetSeat.seatOrder + 1,
            checkInCode: booking.checkInCode ?? makeCheckInCode(meetId),
          },
        })

        const meet = await tx.meet.findUnique({
          where: { id: meetId },
          select: { maxSeats: true, status: true },
        })
        if (meet) {
          const allSeats = await tx.sessionSeat.findMany({
            where: { sessionId },
            select: { userId: true, guestName: true },
          })
          const occupied = allSeats.filter(
            (s) => s.userId != null || s.guestName !== "Retired (Open)",
          ).length
          await tx.meet.update({
            where: { id: meetId },
            data: {
              status: syncMeetStatus(occupied, meet.maxSeats, meet.status),
            },
          })
        }
      })
      await markSeatResetAtCurrentHand(sessionId, targetSeat.id)
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const [updatedSession, updatedManage, waitlistRows] = await Promise.all([
      getGameSession(sessionId),
      getSessionManageState(sessionId),
      existing.meetId
        ? prisma.booking.findMany({
            where: {
              meetId: existing.meetId,
              status: { in: ["PENDING", "WAITLIST"] },
            },
            orderBy: [{ status: "asc" }, { createdAt: "asc" }],
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  player: { select: { nickname: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
    ])

    const waitlistQueue = waitlistRows.map((b) => ({
      bookingId: b.id,
      userId: b.userId,
      name:
        b.user.player?.nickname ?? b.user.name.split(" ")[0] ?? b.user.name,
      status: b.status,
    }))

    return NextResponse.json({
      session: updatedSession
        ? { ...serializeSession(updatedSession, updatedManage), waitlistQueue }
        : null,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update table" },
      { status: 400 },
    )
  }
}
