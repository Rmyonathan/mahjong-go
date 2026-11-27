import { prisma } from "@/lib/db"
import {
  FREE_SESSION_HISTORY_LIMIT,
  isProMembership,
} from "@/lib/membership"
import { formatSignedPoints } from "@/lib/mock/jade-board"

export type PersonalSessionHistoryRow = {
  id: string
  title: string
  boardType: "BEGINNER" | "ADVANCED" | "MCR" | "GUIDED"
  startedAt: string
  endedAt: string | null
  status: "LIVE" | "FINISHED"
  wind: "east" | "south" | "west" | "north"
  netPoints: number
  netLabel: string
  placement: number
  placementLabel: string
  wins: number
}

export type PersonalSessionHistory = {
  total: number
  visible: PersonalSessionHistoryRow[]
  locked: boolean
  isPro: boolean
  limit: number
}

const WIND_FROM_DB = {
  EAST: "east",
  SOUTH: "south",
  WEST: "west",
  NORTH: "north",
} as const

function placementLabel(place: number) {
  if (place === 1) return "1st"
  if (place === 2) return "2nd"
  if (place === 3) return "3rd"
  if (place === 4) return "4th"
  return `${place}th`
}

/**
 * GameSessions where `userId` sat a SessionSeat, newest first.
 * Free tier is capped to FREE_SESSION_HISTORY_LIMIT unless `forceUnlimited`.
 */
export async function getPersonalSessionHistory(
  userId: string,
  options?: {
    isPro?: boolean
    /** When true, ignore Free limit (admin viewing). */
    forceUnlimited?: boolean
  },
): Promise<PersonalSessionHistory> {
  let isPro = options?.isPro
  if (isPro == null) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, membershipTier: true, proExpiresAt: true },
    })
    isPro = user ? isProMembership(user) : false
  }

  const seats = await prisma.sessionSeat.findMany({
    where: { userId },
    include: {
      session: {
        include: {
          seats: { select: { id: true, netPoints: true } },
        },
      },
    },
    orderBy: { session: { startedAt: "desc" } },
  })

  // Prefer finished tables; keep LIVE at top of “active” consumers separately
  const rows: PersonalSessionHistoryRow[] = seats
    .filter((seat) => seat.session.status === "FINISHED")
    .map((seat) => {
      const ranked = [...seat.session.seats].sort(
        (a, b) => b.netPoints - a.netPoints,
      )
      const placement =
        ranked.findIndex((entry) => entry.id === seat.id) + 1 ||
        ranked.length
      return {
        id: seat.session.id,
        title: seat.session.title,
        boardType: seat.session.boardType,
        startedAt: seat.session.startedAt.toISOString(),
        endedAt: seat.session.endedAt?.toISOString() ?? null,
        status: seat.session.status,
        wind: WIND_FROM_DB[seat.wind],
        netPoints: seat.netPoints,
        netLabel: formatSignedPoints(seat.netPoints),
        placement,
        placementLabel: placementLabel(placement),
        wins: seat.wins,
      }
    })

  const total = rows.length
  const unlimited = Boolean(options?.forceUnlimited || isPro)
  const visible = unlimited
    ? rows
    : rows.slice(0, FREE_SESSION_HISTORY_LIMIT)

  return {
    total,
    visible,
    locked: !unlimited && total > FREE_SESSION_HISTORY_LIMIT,
    isPro: Boolean(isPro),
    limit: FREE_SESSION_HISTORY_LIMIT,
  }
}

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/**
 * Pro archive search — finished club sessions matching title or player
 * name/nickname with flexible token + compact matching.
 */
export async function searchPersonalSessions(
  _userId: string,
  query: string,
  options?: { limit?: number },
) {
  const q = query.trim()
  if (!q) return []

  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 24)
  const tokens = normalizeSearchText(q).split(/\s+/).filter(Boolean)
  const compactQuery = q.toLowerCase().replace(/[^a-z0-9]/g, "")

  const recentFinished = await prisma.gameSession.findMany({
    where: { status: "FINISHED" },
    include: {
      seats: {
        select: {
          guestName: true,
          user: {
            select: {
              name: true,
              player: { select: { nickname: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 150,
  })

  const matched = recentFinished.filter((session) => {
    const parts = [
      session.title,
      ...session.seats.flatMap((seat) => [
        seat.guestName ?? "",
        seat.user?.name ?? "",
        seat.user?.player?.name ?? "",
        seat.user?.player?.nickname ?? "",
      ]),
    ]
    const haystack = normalizeSearchText(parts.join(" "))
    const compactHaystack = haystack.replace(/\s+/g, "")
    if (compactQuery && compactHaystack.includes(compactQuery)) return true
    return tokens.length > 0 && tokens.every((token) => haystack.includes(token))
  })

  return matched.slice(0, limit).map((session) => ({
    id: session.id,
    title: session.title,
    boardType: session.boardType,
    startedAt: session.startedAt.toISOString(),
    netLabel: "",
    wind: "",
  }))
}

/** LIVE tables for this user (captain, seated member, or admin). */
export async function getLiveSessionsForUser(userId: string, isAdmin = false) {
  const sessions = await prisma.gameSession.findMany({
    where: {
      status: "LIVE",
      ...(isAdmin
        ? {}
        : {
            OR: [
              { captainUserId: userId },
              { seats: { some: { userId } } },
            ],
          }),
    },
    include: {
      seats: {
        where: { userId },
        select: { wind: true },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 6,
  })
  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    startedAt: session.startedAt.toISOString(),
    boardType: session.boardType,
    wind: session.seats[0] ? WIND_FROM_DB[session.seats[0].wind] : null,
  }))
}

/** Next confirmed booking for the member dashboard. */
export async function getNextBookedMeet(userId: string) {
  const booking = await prisma.booking.findFirst({
    where: {
      userId,
      status: "CONFIRMED",
      meet: {
        status: { in: ["OPEN", "FULL"] },
        startsAt: { gte: new Date() },
      },
    },
    include: {
      meet: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          location: true,
          boardType: true,
        },
      },
    },
    orderBy: { meet: { startsAt: "asc" } },
  })
  if (!booking) return null
  return {
    meetId: booking.meet.id,
    title: booking.meet.title,
    startsAt: booking.meet.startsAt.toISOString(),
    location: booking.meet.location,
    boardType: booking.meet.boardType,
    seatNumber: booking.seatNumber,
  }
}
