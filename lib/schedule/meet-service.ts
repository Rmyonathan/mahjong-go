import type {
  BookingStatus,
  MeetBoardType,
  MeetStatus,
  Prisma,
} from "@prisma/client"

import { prisma } from "@/lib/db"
import {
  isClubHost,
  isProMembership,
  scanLimitForHost,
} from "@/lib/membership"
import {
  DEFAULT_MEET_FEE_IDR,
  DEFAULT_MEET_LOCATION,
} from "@/lib/schedule/types"

export type ScheduleFilter = "all" | "BEGINNER" | "ADVANCED" | "MCR" | "GUIDED"

export { DEFAULT_MEET_FEE_IDR, DEFAULT_MEET_LOCATION }

const hostSelect = {
  id: true,
  name: true,
  role: true,
  membershipTier: true,
  proExpiresAt: true,
  player: { select: { nickname: true } },
} satisfies Prisma.UserSelect

const meetInclude = {
  host: { select: hostSelect },
  captain: {
    select: {
      id: true,
      name: true,
      player: { select: { nickname: true } },
    },
  },
  bookings: {
    where: {
      status: {
        in: ["PENDING", "CONFIRMED", "WAITLIST"] as BookingStatus[],
      },
    },
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
  sessions: {
    orderBy: { startedAt: "desc" as const },
    take: 1,
    include: {
      seats: {
        orderBy: { seatOrder: "asc" as const },
        include: {
          user: {
            select: {
              id: true,
              name: true,
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
    },
  },
} satisfies Prisma.MeetInclude

export type MeetWithBookings = Prisma.MeetGetPayload<{
  include: typeof meetInclude
}>

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
  if (current === "COMPLETED" || current === "CANCELLED") return current
  return confirmedCount >= maxSeats ? "FULL" : "OPEN"
}

/** Lowest free seat after host releases / swaps (1…maxSeats). */
export async function nextAvailableSeatNumber(
  meetId: string,
  maxSeats: number,
  tx: Prisma.TransactionClient = prisma,
): Promise<number> {
  const taken = await tx.booking.findMany({
    where: { meetId, status: "CONFIRMED", seatNumber: { not: null } },
    select: { seatNumber: true },
  })
  const used = new Set(taken.map((row) => row.seatNumber as number))
  for (let seat = 1; seat <= maxSeats; seat++) {
    if (!used.has(seat)) return seat
  }
  throw new Error("FULL")
}

function displayName(user: {
  name: string
  player?: { nickname: string } | null
}) {
  return user.player?.nickname ?? user.name.split(" ")[0] ?? user.name
}

export function serializeMeet(
  meet: MeetWithBookings,
  ratings: Map<string, number>,
  viewerUserId?: string | null,
  viewerIsAdmin = false,
) {
  const confirmed = meet.bookings
    .filter((booking) => booking.status === "CONFIRMED")
    .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0))
  const pending = meet.bookings.filter((booking) => booking.status === "PENDING")
  const waitlist = meet.bookings.filter(
    (booking) => booking.status === "WAITLIST",
  )
  const latestSessionSeats = meet.sessions[0]?.seats ?? []
  const confirmedUserIds = new Set(confirmed.map((b) => b.userId))
  const extraSessionSeats = latestSessionSeats.filter(
    (seat) => !seat.userId || !confirmedUserIds.has(seat.userId),
  )
  const effectiveConfirmedCount = Math.min(
    meet.maxSeats,
    Math.max(confirmed.length, latestSessionSeats.length),
  )
  const yours = viewerUserId
    ? meet.bookings.find((booking) => booking.userId === viewerUserId) ?? null
    : null

  const clubTable = isClubHost(meet.host)
  const isHost =
    Boolean(viewerUserId) &&
    (meet.hostId === viewerUserId || viewerIsAdmin)
  const isCaptain =
    Boolean(viewerUserId) && meet.captainId === viewerUserId
  // Only host / appointed captain / admin may open the LIVE scorer for this meet
  const canLaunchLive = isHost || isCaptain || viewerIsAdmin
  const visibility = meet.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC"
  // Invite code only for host/admin (or when searching by code)
  const showInvite =
    visibility === "PRIVATE" && (isHost || viewerIsAdmin)

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
    scoringRuleset:
      meet.scoringRuleset === "CHICKEN" ? "CHICKEN" : "JADE_HK",
    maxSeats: meet.maxSeats,
    tables: meet.tables,
    feeIdr: meet.feeIdr,
    proEarlyBirdUntil: meet.proEarlyBirdUntil?.toISOString() ?? null,
    proOnly: meet.proOnly,
    status: meet.status,
    visibility,
    inviteCode: showInvite ? meet.inviteCode : null,
    invitePath:
      showInvite && meet.inviteCode
        ? `/schedule?code=${encodeURIComponent(meet.inviteCode)}`
        : null,
    hostId: meet.hostId,
    hostName: meet.host ? displayName(meet.host) : null,
    hostRole: meet.host?.role ?? null,
    isClubTable: clubTable,
    captainId: meet.captainId,
    captainName: meet.captain ? displayName(meet.captain) : null,
    scanLimit: meet.scanLimit,
    scanLabel:
      meet.scanLimit == null
        ? "Unlimited scans"
        : `${meet.scanLimit} scans`,
    confirmedCount: effectiveConfirmedCount,
    pendingCount: pending.length,
    waitlistCount: waitlist.length,
    seatsFilled: effectiveConfirmedCount,
    isFull: effectiveConfirmedCount >= meet.maxSeats || meet.status === "FULL",
    earlyBirdActive: Boolean(
      meet.proEarlyBirdUntil && meet.proEarlyBirdUntil.getTime() > Date.now(),
    ),
    isHost,
    canLaunchLive,
    roster: [
      ...confirmed.map((booking) => {
        const player = booking.user.player
        const rating = player ? (ratings.get(player.id) ?? 1400) : 1400
        return {
          bookingId: booking.id,
          userId: booking.userId,
          playerId: player?.id ?? null,
          name: booking.user.name,
          nickname:
            player?.nickname ??
            booking.user.name.split(" ")[0] ??
            booking.user.name,
          badge:
            player?.initials?.slice(0, 1) ?? booking.user.name.slice(0, 1),
          rating,
          levelId: player?.experienceLevelId ?? "pemula",
          seatNumber: booking.seatNumber,
          isYou: booking.userId === viewerUserId,
        }
      }),
      ...extraSessionSeats.map((seat) => {
        const player = seat.user?.player ?? null
        const display =
          player?.nickname ??
          seat.user?.name.split(" ")[0] ??
          seat.guestName?.trim() ??
          "Guest"
        const fullName = seat.user?.name ?? seat.guestName?.trim() ?? "Guest"
        const rating = player ? (ratings.get(player.id) ?? 1400) : 1400
        return {
          bookingId: `seat-${seat.id}`,
          userId: seat.userId ?? `guest-${seat.id}`,
          playerId: player?.id ?? null,
          name: fullName,
          nickname: display,
          badge:
            player?.initials?.slice(0, 1) ?? fullName.slice(0, 1).toUpperCase(),
          rating,
          levelId: player?.experienceLevelId ?? "pemula",
          seatNumber: seat.seatOrder + 1,
          isYou: seat.userId != null && seat.userId === viewerUserId,
        }
      }),
    ],
    pendingRequests: isHost
      ? pending.map((booking) => ({
          bookingId: booking.id,
          userId: booking.userId,
          name: booking.user.name,
          nickname:
            booking.user.player?.nickname ??
            booking.user.name.split(" ")[0] ??
            booking.user.name,
          paymentMethod: booking.paymentMethod,
          createdAt: booking.createdAt.toISOString(),
        }))
      : [],
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

export function makeInviteCode() {
  const chunk = Math.random().toString(36).slice(2, 6).toUpperCase()
  const stamp = Date.now().toString(36).toUpperCase().slice(-3)
  return `JADE-${chunk}${stamp}`
}

export async function listUpcomingMeets(
  viewerUserId?: string | null,
  viewerIsAdmin = false,
  options?: {
    inviteCode?: string | null
    inviteCodes?: string[] | null
    q?: string | null
  },
) {
  const inviteCodes = Array.from(
    new Set(
      [
        ...(options?.inviteCodes ?? []),
        options?.inviteCode ?? null,
      ]
        .map((code) => code?.trim().toUpperCase() || null)
        .filter((code): code is string => Boolean(code)),
    ),
  )
  const q = options?.q?.trim() || null

  const activeStatuses: BookingStatus[] = ["PENDING", "CONFIRMED", "WAITLIST"]
  const inviteFilter: Prisma.MeetWhereInput | null =
    inviteCodes.length === 1
      ? { inviteCode: inviteCodes[0] }
      : inviteCodes.length > 1
        ? { inviteCode: { in: inviteCodes } }
        : null

  const andFilters: Prisma.MeetWhereInput[] = []
  if (!viewerIsAdmin) {
    if (viewerUserId) {
      andFilters.push({
        OR: [
          { visibility: "PUBLIC" },
          { hostId: viewerUserId },
          { captainId: viewerUserId },
          {
            bookings: {
              some: {
                userId: viewerUserId,
                status: { in: activeStatuses },
              },
            },
          },
          ...(inviteFilter ? [inviteFilter] : []),
        ],
      })
    } else {
      andFilters.push({
        OR: [
          { visibility: "PUBLIC" },
          ...(inviteFilter ? [inviteFilter] : []),
        ],
      })
    }
  }

  if (q) {
    andFilters.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { inviteCode: { equals: q.toUpperCase(), mode: "insensitive" } },
      ],
    })
  }

  const visibilityWhere: Prisma.MeetWhereInput = andFilters.length
    ? { AND: andFilters }
    : {}
  const today = startOfTodayJakarta()

  const [upcoming, past] = await Promise.all([
    prisma.meet.findMany({
      where: {
        status: { in: ["OPEN", "FULL"] },
        startsAt: { gte: today },
        ...visibilityWhere,
      },
      include: meetInclude,
      orderBy: { startsAt: "asc" },
    }),
    // Past / completed — last ~21 days for schedule archive section
    // Explicit allow-list so CANCELLED never surfaces on the schedule
    prisma.meet.findMany({
      where: {
        status: { in: ["OPEN", "FULL", "COMPLETED"] },
        startsAt: {
          gte: new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000),
        },
        OR: [{ startsAt: { lt: today } }, { status: "COMPLETED" }],
        ...visibilityWhere,
      },
      include: meetInclude,
      orderBy: { startsAt: "desc" },
      take: 24,
    }),
  ])

  const meets = [...upcoming, ...past]
  const playerIds = meets.flatMap((meet) =>
    [
      ...meet.bookings.map((booking) => booking.user.player?.id),
      ...meet.sessions.flatMap((s) =>
        s.seats.map((seat) => seat.user?.player?.id),
      ),
    ].filter((id): id is string => Boolean(id)),
  )
  const ratings = await ratingMapForPlayers(playerIds)
  return meets.map((meet) =>
    serializeMeet(meet, ratings, viewerUserId, viewerIsAdmin),
  )
}

export function makeCheckInCode(meetId: string) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6)
  const tag = meetId.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase()
  return `JADE-${tag}-${stamp}`
}

export async function userCanLaunchMeetLive(options: {
  userId: string
  role: string
  meetId: string
}) {
  const meet = await prisma.meet.findUnique({
    where: { id: options.meetId },
    select: { hostId: true, captainId: true, status: true },
  })
  if (!meet || meet.status === "CANCELLED") {
    return { ok: false as const, reason: "Meet not found" }
  }
  if (options.role === "ADMIN") return { ok: true as const }
  if (meet.hostId === options.userId || meet.captainId === options.userId) {
    return { ok: true as const }
  }
  return {
    ok: false as const,
    reason: "Only the table host or captain can launch this live table",
  }
}

export async function userCanBookProWindow(options: {
  userId: string
  proEarlyBirdUntil: Date | null
  proOnly: boolean
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    select: {
      role: true,
      membershipTier: true,
      proExpiresAt: true,
    },
  })
  if (!user) return { ok: false, reason: "Account not found" }
  if (user.role === "ADMIN" || isProMembership(user)) return { ok: true }

  const earlyBirdActive =
    options.proEarlyBirdUntil &&
    options.proEarlyBirdUntil.getTime() > Date.now()
  if (options.proOnly) {
    return { ok: false, reason: "This table is Pro only" }
  }
  if (earlyBirdActive) {
    return {
      ok: false,
      reason: "Pro early-bird window — upgrade or wait",
    }
  }
  return { ok: true }
}

export function resolveScanLimitForUser(user: {
  role: string
  membershipTier: string
  proExpiresAt: Date | null
}) {
  return scanLimitForHost(user)
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
  /** CHICKEN | JADE_HK — hitungan for live tables from this meet */
  scoringRuleset?: "CHICKEN" | "JADE_HK"
  maxSeats?: number
  tables?: number
  feeIdr?: number
  proEarlyBirdUntil?: string | null
  proOnly?: boolean
  captainId?: string | null
  visibility?: "PUBLIC" | "PRIVATE"
}
