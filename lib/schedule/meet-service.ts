import type {
  BookingStatus,
  MeetBoardType,
  MeetStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client"

import { prisma } from "@/lib/db"
import {
  DEFAULT_MEET_FEE_IDR,
  DEFAULT_MEET_LOCATION,
} from "@/lib/schedule/types"

export type ScheduleFilter = "all" | "BEGINNER" | "ADVANCED" | "MCR" | "GUIDED"

export { DEFAULT_MEET_FEE_IDR, DEFAULT_MEET_LOCATION }

const meetInclude = {
  bookings: {
    where: { status: { in: ["CONFIRMED", "WAITLIST"] as BookingStatus[] } },
    orderBy: [{ status: "asc" as const }, { createdAt: "asc" as const }],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          membershipTier: true,
          player: {
            select: {
              id: true,
              nickname: true,
              initials: true,
              experienceLevelId: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MeetInclude

export type MeetWithBookings = Prisma.MeetGetPayload<{ include: typeof meetInclude }>

export async function getActiveSeasonId() {
  const season = await prisma.season.findFirst({
    where: { isActive: true },
    select: { id: true },
  })
  return season?.id ?? null
}

export async function ratingMapForPlayers(playerIds: string[]) {
  const seasonId = await getActiveSeasonId()
  if (!seasonId || playerIds.length === 0) return new Map<string, number>()
  const rows = await prisma.boardStanding.findMany({
    where: { seasonId, playerId: { in: playerIds } },
    select: { playerId: true, points: true },
    orderBy: { points: "desc" },
  })
  const map = new Map<string, number>()
  for (const row of rows) {
    if (!map.has(row.playerId)) map.set(row.playerId, row.points)
  }
  return map
}

export function syncMeetStatus(
  confirmedCount: number,
  maxSeats: number,
  current: MeetStatus,
): MeetStatus {
  if (current === "COMPLETED") return "COMPLETED"
  return confirmedCount >= maxSeats ? "FULL" : "OPEN"
}

export function serializeMeet(
  meet: MeetWithBookings,
  ratings: Map<string, number>,
  viewerUserId?: string | null,
) {
  const confirmed = meet.bookings
    .filter((booking) => booking.status === "CONFIRMED")
    .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0))
  const waitlist = meet.bookings.filter((booking) => booking.status === "WAITLIST")
  const yours = viewerUserId
    ? meet.bookings.find((booking) => booking.userId === viewerUserId) ?? null
    : null

  return {
    id: meet.id,
    title: meet.title,
    dateLabel: meet.dateLabel,
    startTime: meet.startTime,
    endTime: meet.endTime,
    whenLabel: `${meet.dateLabel} · ${meet.startTime}–${meet.endTime} WIB`,
    startsAt: meet.startsAt.toISOString(),
    endsAt: meet.endsAt.toISOString(),
    location: meet.location,
    boardType: meet.boardType,
    maxSeats: meet.maxSeats,
    tables: meet.tables,
    feeIdr: meet.feeIdr,
    proEarlyBirdUntil: meet.proEarlyBirdUntil?.toISOString() ?? null,
    proOnly: meet.proOnly,
    status: meet.status,
    hostId: meet.hostId,
    confirmedCount: confirmed.length,
    waitlistCount: waitlist.length,
    seatsFilled: confirmed.length,
    isFull: confirmed.length >= meet.maxSeats || meet.status === "FULL",
    earlyBirdActive: Boolean(
      meet.proEarlyBirdUntil && meet.proEarlyBirdUntil.getTime() > Date.now(),
    ),
    roster: confirmed.map((booking) => {
      const player = booking.user.player
      const rating = player ? (ratings.get(player.id) ?? 1400) : 1400
      return {
        bookingId: booking.id,
        userId: booking.userId,
        name: booking.user.name,
        nickname: player?.nickname ?? booking.user.name.split(" ")[0] ?? booking.user.name,
        badge: player?.initials?.slice(0, 1) ?? booking.user.name.slice(0, 1),
        rating,
        levelId: player?.experienceLevelId ?? "pemula",
        seatNumber: booking.seatNumber,
        isYou: booking.userId === viewerUserId,
      }
    }),
    yourBooking: yours
      ? {
          id: yours.id,
          status: yours.status,
          seatNumber: yours.seatNumber,
          paymentMethod: yours.paymentMethod,
          checkInCode: yours.checkInCode,
        }
      : null,
  }
}

/** Start of "today" in Asia/Jakarta as a UTC Date for Prisma filters. */
export function startOfTodayJakarta(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  return new Date(`${ymd}T00:00:00+07:00`)
}

export async function listUpcomingMeets(viewerUserId?: string | null) {
  // Show anything from the start of today (WIB) onward — not only the last 6h.
  const meets = await prisma.meet.findMany({
    where: {
      status: { in: ["OPEN", "FULL"] },
      startsAt: { gte: startOfTodayJakarta() },
    },
    include: meetInclude,
    orderBy: { startsAt: "asc" },
  })
  const playerIds = meets.flatMap((meet) =>
    meet.bookings
      .map((booking) => booking.user.player?.id)
      .filter((id): id is string => Boolean(id)),
  )
  const ratings = await ratingMapForPlayers(playerIds)
  return meets.map((meet) => serializeMeet(meet, ratings, viewerUserId))
}

export function makeCheckInCode(meetId: string) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6)
  const tag = meetId.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase()
  return `JADE-${tag}-${stamp}`
}

export async function userCanBookProWindow(options: {
  userId: string
  proEarlyBirdUntil: Date | null
  proOnly: boolean
}) {
  const { isProMembership, syncExpiredPro } = await import("@/lib/membership")
  const user = await syncExpiredPro(options.userId)
  if (!user) return { ok: false as const, reason: "User not found" }
  if (user.role === "ADMIN") return { ok: true as const, user }

  const earlyBirdActive =
    options.proEarlyBirdUntil != null &&
    options.proEarlyBirdUntil.getTime() > Date.now()
  const isPro = isProMembership(user)
  if ((options.proOnly || earlyBirdActive) && !isPro) {
    return {
      ok: false as const,
      reason: options.proOnly
        ? "Pro members only"
        : "Pro early-bird window is still active",
      user,
    }
  }
  return { ok: true as const, user }
}

export type CreateMeetBody = {
  title: string
  dateLabel: string
  startTime: string
  endTime: string
  startsAt: string
  endsAt: string
  location?: string
  boardType: MeetBoardType
  maxSeats: number
  tables?: number
  feeIdr?: number
  proEarlyBirdUntil?: string | null
  proOnly?: boolean
}
