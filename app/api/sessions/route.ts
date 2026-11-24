import { NextResponse } from "next/server"

import { getSessionUser, requireUser } from "@/lib/auth"
import { userCanLaunchMeetLive } from "@/lib/schedule/meet-service"
import {
  createGameSession,
  findLiveSessionByMeetId,
  listLiveSessionsForUser,
  serializeSession,
  type CreateSessionSeatInput,
} from "@/lib/session/service"
import type { LiveBoard, LiveWind } from "@/lib/session/live-demo"

type CreateBody = {
  title?: string
  board?: LiveBoard
  meetId?: string | null
  captainUserId?: string | null
  seats?: CreateSessionSeatInput[]
}

const VALID_BOARDS: LiveBoard[] = ["beginner", "advanced", "mcr"]
const VALID_WINDS: LiveWind[] = ["east", "south", "west", "north"]

export async function POST(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json()) as CreateBody
  const title = body.title?.trim()
  const board = body.board
  const seats = body.seats
  const meetId = body.meetId ?? null

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }
  if (!board || !VALID_BOARDS.includes(board)) {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 })
  }
  if (!seats || seats.length < 3 || seats.length > 4) {
    return NextResponse.json(
      { error: "Provide 3 or 4 seats" },
      { status: 400 },
    )
  }

  for (const seat of seats) {
    if (!VALID_WINDS.includes(seat.wind)) {
      return NextResponse.json(
        { error: `Invalid wind: ${seat.wind}` },
        { status: 400 },
      )
    }
  }

  try {
    // Reopen existing LIVE table for this meet instead of spawning a duplicate
    if (meetId) {
      const access = await userCanLaunchMeetLive({
        userId: user.id,
        role: user.role,
        meetId,
      })
      if (!access.ok) {
        return NextResponse.json({ error: access.reason }, { status: 403 })
      }

      const existing = await findLiveSessionByMeetId(meetId)
      if (existing) {
        return NextResponse.json({
          session: serializeSession(existing),
          resumed: true,
        })
      }
    }

    const session = await createGameSession({
      title,
      board,
      seats,
      meetId,
      captainUserId: body.captainUserId?.trim() || user.id,
    })
    return NextResponse.json(
      { session: serializeSession(session), resumed: false },
      { status: 201 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create session"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ viewer: null, liveSessions: [] })
  }

  const { searchParams } = new URL(request.url)
  const meetId = searchParams.get("meetId")

  if (meetId) {
    const existing = await findLiveSessionByMeetId(meetId)
    return NextResponse.json({
      viewer: { id: user.id, name: user.name, role: user.role },
      liveSession: existing ? serializeSession(existing) : null,
    })
  }

  const sessions = await listLiveSessionsForUser(
    user.id,
    user.role === "ADMIN",
  )
  return NextResponse.json({
    viewer: { id: user.id, name: user.name, role: user.role },
    liveSessions: sessions.map((session) => {
      const seats = [...session.seats].sort(
        (a, b) => a.seatOrder - b.seatOrder,
      )
      const serialized = serializeSession(session)
      return {
        id: session.id,
        title: session.title,
        meetId: session.meetId,
        boardType: session.boardType,
        startedAt: session.startedAt.toISOString(),
        handCount: session.hands.length,
        seatCount: seats.length,
        captainUserId: session.captainUserId,
        captainName: session.captain.name,
        isCaptain:
          session.captainUserId === user.id || user.role === "ADMIN",
        durationTier: serialized.durationTier,
        maxHours: serialized.maxHours,
        expiresAt: serialized.expiresAt,
        seats: seats.map((seat) => ({
          id: seat.id,
          wind: seat.wind,
          name:
            seat.user?.player?.name ??
            seat.user?.name ??
            seat.guestName ??
            "Guest",
          nickname:
            seat.user?.player?.nickname ??
            seat.user?.name?.split(" ")[0] ??
            seat.guestName?.split(" ")[0] ??
            "Guest",
          netPoints: seat.netPoints,
          userId: seat.userId,
        })),
      }
    }),
  })
}
