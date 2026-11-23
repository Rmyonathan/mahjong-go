import { NextResponse } from "next/server"
import type { PaymentMethod } from "@prisma/client"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  makeCheckInCode,
  syncMeetStatus,
  userCanBookProWindow,
} from "@/lib/schedule/meet-service"

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

  const { id: meetId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    paymentMethod?: PaymentMethod
  }
  const paymentMethod: PaymentMethod =
    body.paymentMethod === "VENUE" ? "VENUE" : "QRIS"

  const meet = await prisma.meet.findUnique({ where: { id: meetId } })
  if (!meet || meet.status === "COMPLETED") {
    return NextResponse.json({ error: "Meet not found" }, { status: 404 })
  }

  const access = await userCanBookProWindow({
    userId: user.id,
    proEarlyBirdUntil: meet.proEarlyBirdUntil,
    proOnly: meet.proOnly,
  })
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 })
  }

  const existing = await prisma.booking.findUnique({
    where: { meetId_userId: { meetId, userId: user.id } },
  })
  if (existing && existing.status !== "CANCELLED") {
    return NextResponse.json(
      { error: "You already have a booking on this meet" },
      { status: 409 },
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    const confirmedCount = await tx.booking.count({
      where: { meetId, status: "CONFIRMED" },
    })
    const isFull = confirmedCount >= meet.maxSeats
    const status = isFull ? "WAITLIST" : "CONFIRMED"
    const seatNumber = isFull ? null : confirmedCount + 1
    const checkInCode = isFull ? null : makeCheckInCode(meetId)

    const booking = existing
      ? await tx.booking.update({
          where: { id: existing.id },
          data: {
            status,
            paymentMethod: isFull ? null : paymentMethod,
            seatNumber,
            checkInCode,
          },
        })
      : await tx.booking.create({
          data: {
            meetId,
            userId: user.id,
            status,
            paymentMethod: isFull ? null : paymentMethod,
            seatNumber,
            checkInCode,
          },
        })

    const nextConfirmed = await tx.booking.count({
      where: { meetId, status: "CONFIRMED" },
    })
    await tx.meet.update({
      where: { id: meetId },
      data: { status: syncMeetStatus(nextConfirmed, meet.maxSeats, meet.status) },
    })

    return booking
  })

  return NextResponse.json({ booking: result }, { status: 201 })
}

export async function DELETE(_request: Request, { params }: Params) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { id: meetId } = await params
  const meet = await prisma.meet.findUnique({ where: { id: meetId } })
  if (!meet) {
    return NextResponse.json({ error: "Meet not found" }, { status: 404 })
  }

  const existing = await prisma.booking.findUnique({
    where: { meetId_userId: { meetId, userId: user.id } },
  })
  if (!existing || existing.status === "CANCELLED") {
    return NextResponse.json({ error: "No active booking" }, { status: 404 })
  }

  const wasConfirmed = existing.status === "CONFIRMED"

  const result = await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        seatNumber: null,
        paymentMethod: null,
        checkInCode: null,
      },
    })

    let promoted = null
    if (wasConfirmed) {
      const nextWait = await tx.booking.findFirst({
        where: { meetId, status: "WAITLIST" },
        orderBy: { createdAt: "asc" },
      })
      if (nextWait) {
        const confirmedCount = await tx.booking.count({
          where: { meetId, status: "CONFIRMED" },
        })
        promoted = await tx.booking.update({
          where: { id: nextWait.id },
          data: {
            status: "CONFIRMED",
            seatNumber: confirmedCount + 1,
            paymentMethod: nextWait.paymentMethod ?? "VENUE",
            checkInCode: makeCheckInCode(meetId),
          },
        })
      }
    }

    const nextConfirmed = await tx.booking.count({
      where: { meetId, status: "CONFIRMED" },
    })
    await tx.meet.update({
      where: { id: meetId },
      data: { status: syncMeetStatus(nextConfirmed, meet.maxSeats, meet.status) },
    })

    return { promoted }
  })

  return NextResponse.json({ ok: true, promoted: result.promoted })
}
