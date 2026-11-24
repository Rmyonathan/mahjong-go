import { NextResponse } from "next/server"
import type { PaymentMethod } from "@prisma/client"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
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
    inviteCode?: string
    inviteCodes?: string[]
  }
  const paymentMethod: PaymentMethod =
    body.paymentMethod === "VENUE" ? "VENUE" : "QRIS"
  const inviteCodes = Array.from(
    new Set(
      [...(body.inviteCodes ?? []), body.inviteCode]
        .map((code) => code?.trim().toUpperCase() || null)
        .filter((code): code is string => Boolean(code)),
    ),
  )

  const meet = await prisma.meet.findUnique({ where: { id: meetId } })
  if (!meet || meet.status === "COMPLETED") {
    return NextResponse.json({ error: "Meet not found" }, { status: 404 })
  }

  if (meet.visibility === "PRIVATE") {
    const isInsider =
      user.role === "ADMIN" ||
      meet.hostId === user.id ||
      meet.captainId === user.id
    const codeOk =
      Boolean(meet.inviteCode) && inviteCodes.includes(meet.inviteCode!)
    if (!isInsider && !codeOk) {
      return NextResponse.json(
        {
          error:
            "This is a private table — enter the invite code to unlock it",
        },
        { status: 403 },
      )
    }
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
    const status = isFull ? "WAITLIST" : "PENDING"

    const booking = existing
      ? await tx.booking.update({
          where: { id: existing.id },
          data: {
            status,
            paymentMethod: isFull ? null : paymentMethod,
            seatNumber: null,
            checkInCode: null,
          },
        })
      : await tx.booking.create({
          data: {
            meetId,
            userId: user.id,
            status,
            paymentMethod: isFull ? null : paymentMethod,
            seatNumber: null,
            checkInCode: null,
          },
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

  if (existing.status === "CONFIRMED") {
    return NextResponse.json(
      {
        error:
          "Confirmed seats need host approval to release. Ask the table host.",
      },
      { status: 403 },
    )
  }

  await prisma.booking.update({
    where: { id: existing.id },
    data: {
      status: "CANCELLED",
      seatNumber: null,
      paymentMethod: null,
      checkInCode: null,
    },
  })

  return NextResponse.json({ ok: true })
}
