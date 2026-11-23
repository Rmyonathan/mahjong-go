import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const [bookings, seats] = await Promise.all([
    prisma.coachingBooking.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    session.id
      ? prisma.sessionSeat.findMany({
          where: {
            userId: session.id,
            session: { status: "FINISHED" },
          },
          include: {
            session: {
              select: {
                id: true,
                title: true,
                startedAt: true,
                endedAt: true,
              },
            },
          },
          orderBy: { session: { startedAt: "desc" } },
          take: 20,
        })
      : Promise.resolve([]),
  ])

  const sessions = seats.map((seat) => ({
    id: seat.session.id,
    title: seat.session.title,
    startedAt: seat.session.startedAt.toISOString(),
    endedAt: seat.session.endedAt?.toISOString() ?? null,
    netPoints: seat.netPoints,
  }))

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      ...b,
      preferredAt: b.preferredAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
    })),
    sessions,
  })
}

export async function POST(request: Request) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json()) as {
    sessionId?: string | null
    preferredAt?: string | null
    notes?: string
  }

  if (body.sessionId) {
    const seat = await prisma.sessionSeat.findFirst({
      where: {
        userId: session.id,
        sessionId: body.sessionId,
        session: { status: "FINISHED" },
      },
    })
    if (!seat) {
      return NextResponse.json(
        { error: "Session not in your finished history" },
        { status: 400 },
      )
    }
  }

  const booking = await prisma.coachingBooking.create({
    data: {
      userId: session.id,
      sessionId: body.sessionId || null,
      preferredAt: body.preferredAt ? new Date(body.preferredAt) : null,
      notes: body.notes?.trim().slice(0, 500) ?? "",
    },
  })

  return NextResponse.json({
    booking: {
      ...booking,
      preferredAt: booking.preferredAt?.toISOString() ?? null,
      createdAt: booking.createdAt.toISOString(),
    },
  })
}
