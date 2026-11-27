import type { BoardTier, FormResult, MeetBoardType } from "@prisma/client"

import { prisma } from "@/lib/db"
import { type JadePlayer } from "@/lib/mock/jade-data"
import { eloStampFromRating } from "@/lib/mock/jade-levels"
import {
  ACTIVE_SEASON,
  BOARD_STANDINGS,
  type BoardStandingRow,
  type FormResult as MockForm,
  type RecentSessionCard,
  type SeasonKpi,
  type SeasonMeta,
  type SessionDetail,
} from "@/lib/mock/jade-board"
import { countFinishedSessions } from "@/lib/session/service"

function mapForm(form: FormResult[]): MockForm[] {
  return form as MockForm[]
}

function toJadePlayer(player: {
  id: string
  name: string
  nickname: string
  initials: string
  city: string
  district: string
  house: string
  experienceLevelId: string
  memberSince: Date
  avatarUrl?: string | null
  frameId?: string
}): JadePlayer {
  return {
    id: player.id,
    name: player.name,
    nickname: player.nickname,
    initials: player.initials,
    city: player.city,
    district: player.district,
    house: player.house,
    experienceLevelId: player.experienceLevelId as JadePlayer["experienceLevelId"],
    memberSince: player.memberSince.toISOString().slice(0, 10),
    avatarUrl: player.avatarUrl ?? null,
    frameId: player.frameId ?? "classic",
  }
}

function boardFromMeet(boardType: MeetBoardType): BoardTier {
  if (boardType === "BEGINNER" || boardType === "GUIDED") return "beginner"
  if (boardType === "MCR") return "mcr"
  return "advanced"
}

const EMPTY_SEASON_KPI: SeasonKpi = {
  sessionsPlayed: 0,
  gamesPlayed: 0,
  hoursAtTable: 0,
  biggestHand: { playerId: "", points: 0, combo: "—" },
  topCombo: { name: "—", count: 0 },
  hotStreak: { playerId: "", streak: 0 },
}

export async function getActiveSeason(): Promise<SeasonMeta | null> {
  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (!season) return null

  const finished = await countFinishedSessions()
  if (finished === 0) {
    return {
      id: season.id,
      label: season.label,
      rangeLabel: season.rangeLabel,
      sessionsPlayed: 0,
      gamesPlayed: 0,
      hoursAtTable: 0,
    }
  }

  const [sessionCount, handCount] = await Promise.all([
    prisma.gameSession.count({ where: { status: "FINISHED" } }),
    prisma.handRecord.count({ where: { session: { status: "FINISHED" } } }),
  ])

  return {
    id: season.id,
    label: season.label,
    rangeLabel: season.rangeLabel,
    sessionsPlayed: sessionCount,
    gamesPlayed: handCount,
    hoursAtTable: season.hoursAtTable,
  }
}

export async function getSeasonKpi(): Promise<SeasonKpi | null> {
  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (!season) return null

  const finished = await countFinishedSessions()
  if (finished === 0) return EMPTY_SEASON_KPI

  const [sessionCount, handCount, biggest, topStanding, handCombos] =
    await Promise.all([
      prisma.gameSession.count({ where: { status: "FINISHED" } }),
      prisma.handRecord.count({ where: { session: { status: "FINISHED" } } }),
      prisma.handRecord.findFirst({
        where: {
          session: { status: "FINISHED" },
          points: { gt: 0 },
        },
        orderBy: { points: "desc" },
        include: {
          winnerSeat: {
            include: { user: { select: { playerId: true } } },
          },
        },
      }),
      prisma.boardStanding.findFirst({
        where: { seasonId: season.id },
        orderBy: [{ streak: "desc" }, { points: "desc" }],
      }),
      prisma.handRecord.findMany({
        where: {
          session: { status: "FINISHED" },
          winMethod: { not: "DRAW" },
        },
        select: { combosJson: true },
      }),
    ])

  const comboFreq = new Map<string, number>()
  for (const row of handCombos) {
    if (!Array.isArray(row.combosJson)) continue
    for (const item of row.combosJson) {
      if (!item || typeof item !== "object") continue
      const label = (item as { label?: unknown }).label
      if (typeof label !== "string") continue
      const trimmed = label.trim()
      if (!trimmed || trimmed.toLowerCase() === "draw") continue
      comboFreq.set(trimmed, (comboFreq.get(trimmed) ?? 0) + 1)
    }
  }
  let topComboName = season.topComboName
  let topComboCount = season.topComboCount
  for (const [name, count] of comboFreq) {
    if (count > topComboCount) {
      topComboName = name
      topComboCount = count
    }
  }

  const durationMs = await prisma.gameSession.findMany({
    where: { status: "FINISHED", endedAt: { not: null } },
    select: { startedAt: true, endedAt: true },
  })
  const hoursAtTable =
    Math.round(
      (durationMs.reduce((sum, session) => {
        if (!session.endedAt) return sum
        return sum + (session.endedAt.getTime() - session.startedAt.getTime())
      }, 0) /
        3_600_000) *
        10,
    ) / 10

  return {
    sessionsPlayed: sessionCount,
    gamesPlayed: handCount,
    hoursAtTable: hoursAtTable || season.hoursAtTable,
    biggestHand: {
      playerId:
        biggest?.winnerSeat?.user?.playerId ??
        season.biggestHandPlayerId,
      points: biggest?.points ?? season.biggestHandPts,
      combo: season.biggestHandCombo || "Winning hand",
    },
    topCombo: {
      name: topComboName,
      count: topComboCount,
    },
    hotStreak: {
      playerId: topStanding?.playerId ?? season.hotStreakPlayerId,
      streak: topStanding?.streak ?? season.hotStreak,
    },
  }
}

export async function getWinMethodsSeason() {
  const finished = await countFinishedSessions()
  if (finished === 0) return { selfDraw: 0, discard: 0 }

  const [selfDraw, discard] = await Promise.all([
    prisma.handRecord.count({
      where: {
        session: { status: "FINISHED" },
        winMethod: "SELF_DRAW",
      },
    }),
    prisma.handRecord.count({
      where: {
        session: { status: "FINISHED" },
        winMethod: "DISCARD",
      },
    }),
  ])
  return { selfDraw, discard }
}

export async function getDbBoardStandings(
  board: BoardTier | "all" = "advanced",
): Promise<BoardStandingRow[]> {
  const finished = await countFinishedSessions()
  if (finished === 0) return []

  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (!season) return []

  // Live mode: standings come only from finished GameSessions (never seed mock).
  const liveSeats = await prisma.sessionSeat.findMany({
    where: {
      userId: { not: null },
      session: { status: "FINISHED" },
    },
    select: { user: { select: { playerId: true } } },
  })
  const expectedPlayers = new Set(
    liveSeats
      .map((row) => row.user?.playerId)
      .filter((id): id is string => Boolean(id)),
  )
  const standingCount = await prisma.boardStanding.count({
    where: { seasonId: season.id },
  })
  if (standingCount !== expectedPlayers.size) {
    const { rebuildStandingsFromFinishedSessions } = await import(
      "@/lib/data/rebuild-standings"
    )
    await rebuildStandingsFromFinishedSessions(season.id)
  }

  const { isProMembership } = await import("@/lib/membership")

  const rows = await prisma.boardStanding.findMany({
    where: {
      seasonId: season.id,
      ...(board === "all" ? {} : { board }),
      // Only people who actually sat a finished table
      playerId: { in: [...expectedPlayers] },
    },
    include: {
      player: {
        include: {
          user: {
            select: {
              role: true,
              membershipTier: true,
              proExpiresAt: true,
            },
          },
        },
      },
    },
    orderBy: [{ points: "desc" }, { rank: "asc" }],
  })

  // Empty board filter is fine — do NOT fall back to seed mock once live.
  if (rows.length === 0) {
    return []
  }

  const { experienceFromXp, getXpProgress } = await import("@/lib/xp/progression")

  return rows.map((row, index) => {
    const player = toJadePlayer({
      ...row.player,
      // Badge follows XP curve, not seed / games label
      experienceLevelId: getXpProgress(row.player.experienceXp).experienceLevelId,
    })
    const experienceLevel = experienceFromXp(row.player.experienceXp)
    return {
      rank: board === "all" ? index + 1 : row.rank,
      playerId: row.playerId,
      board: row.board,
      points: row.points,
      wins: row.wins,
      games: row.games,
      winRate: row.winRate,
      ptsPerWin: row.ptsPerWin,
      bonus: row.bonus,
      pen: row.pen,
      biggestHand: row.biggestHand,
      form: mapForm(row.form),
      streak: row.streak,
      selfDraw: row.selfDraw,
      discardWins: row.discardWins,
      player,
      skillTier: eloStampFromRating(row.player.skillRating),
      experienceLevel,
      isPro: row.player.user ? isProMembership(row.player.user) : false,
    }
  })
}

export async function getPlayersByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, JadePlayer>()
  const players = await prisma.player.findMany({
    where: { id: { in: [...new Set(ids)] } },
  })
  return new Map(players.map((player) => [player.id, toJadePlayer(player)]))
}

export async function getRecentSessions(): Promise<RecentSessionCard[]> {
  const finished = await countFinishedSessions()
  if (finished === 0) return []

  const sessions = await prisma.gameSession.findMany({
    where: { status: "FINISHED" },
    include: {
      seats: {
        include: { user: true },
        orderBy: { netPoints: "desc" },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 12,
  })

  return sessions.map((session) => {
    const top = session.seats[0]
    const winnerId =
      top?.user?.playerId ??
      top?.userId ??
      top?.guestName ??
      "unknown"
    const durationMinutes = session.endedAt
      ? Math.max(
          1,
          Math.round(
            (session.endedAt.getTime() - session.startedAt.getTime()) / 60_000,
          ),
        )
      : 0
    return {
      id: session.id,
      title: session.title,
      startedAt: session.startedAt.toISOString(),
      endedAt: (session.endedAt ?? session.startedAt).toISOString(),
      venueName: "Jade Mahjong Lounge",
      winnerId,
      games: session.seats.reduce((sum, seat) => sum + seat.wins, 0),
      durationMinutes,
    }
  })
}

export async function getDbPlayer(id: string) {
  return prisma.player.findUnique({ where: { id } })
}

export async function getDbSessionDetail(
  id: string,
): Promise<SessionDetail | null> {
  const session = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      seats: {
        include: { user: { include: { player: true } } },
        orderBy: { seatOrder: "asc" },
      },
      hands: { orderBy: { handNumber: "asc" } },
    },
  })

  if (!session) {
    return null
  }

  if (session.status !== "FINISHED" && session.hands.length === 0) {
    return null
  }

  const seats = session.seats
  const playerIds = seats.map((seat) => {
    if (seat.user?.playerId) return seat.user.playerId
    if (seat.userId) return seat.userId
    if (seat.guestName) {
      return `guest:${encodeURIComponent(seat.guestName)}:${seat.id.slice(-6)}`
    }
    return `guest:Guest:${seat.id.slice(-6)}`
  }) as [string, string, string, string] | [string, string, string]

  const seatIndexById = new Map(seats.map((seat, index) => [seat.id, index]))
  const race: Record<string, number[]> = {}
  for (const playerId of playerIds) race[playerId] = [0]
  const totals: Record<string, number> = Object.fromEntries(
    playerIds.map((playerId) => [playerId, 0]),
  )

  const hands = session.hands.map((hand) => {
    const deltasRaw = hand.deltasJson as number[] | Record<string, number>
    const deltasArr = Array.isArray(deltasRaw)
      ? deltasRaw
      : seats.map((seat) => Number(deltasRaw[seat.id] ?? 0))

    for (let i = 0; i < playerIds.length; i++) {
      const playerId = playerIds[i]
      const delta = deltasArr[i] ?? 0
      totals[playerId] = (totals[playerId] ?? 0) + delta
      race[playerId].push(totals[playerId])
    }

    const winnerIndex =
      hand.winnerSeatId != null
        ? (seatIndexById.get(hand.winnerSeatId) ?? -1)
        : -1
    const dealtIndex =
      hand.dealtInSeatId != null
        ? (seatIndexById.get(hand.dealtInSeatId) ?? null)
        : null
    const tiles = (hand.tilesJson as {
      tileIds?: string[]
      winningTileId?: string
    }) ?? { tileIds: [], winningTileId: "" }
    const combos =
      (hand.combosJson as { label: string; fan: number }[]) ?? []

    return {
      id: hand.id,
      handNo: hand.handNumber,
      winnerId: winnerIndex >= 0 ? playerIds[winnerIndex] : playerIds[0],
      method:
        hand.winMethod === "SELF_DRAW"
          ? ("self-draw" as const)
          : ("discard" as const),
      dealtById:
        dealtIndex != null && dealtIndex >= 0 ? playerIds[dealtIndex] : null,
      combos,
      tileIds: tiles.tileIds ?? [],
      winningTileId: tiles.winningTileId ?? "",
      bonusTileIds: [] as string[],
      points: hand.points,
      isDraw: hand.winMethod === "DRAW" || winnerIndex < 0,
      deltas: Object.fromEntries(
        playerIds.map((playerId, index) => [playerId, deltasArr[index] ?? 0]),
      ),
    }
  })

  const standings = [...seats]
    .sort((a, b) => b.netPoints - a.netPoints)
    .map((seat, index) => {
      const playerId =
        seat.user?.playerId ??
        seat.userId ??
        (seat.guestName
          ? `guest:${encodeURIComponent(seat.guestName)}:${seat.id.slice(-6)}`
          : `guest:Guest:${seat.id.slice(-6)}`)
      return {
        rank: (index + 1) as 1 | 2 | 3 | 4,
        playerId,
        net: seat.netPoints,
        wins: seat.wins,
        selfDraw: seat.selfDraws,
        dealtIn: seat.dealtInCount,
        form: [] as MockForm[],
      }
    })

  const selfDrawWins = seats.reduce((sum, seat) => sum + seat.selfDraws, 0)
  const discardWins = seats.reduce(
    (sum, seat) => sum + Math.max(0, seat.wins - seat.selfDraws),
    0,
  )
  const biggestHand = Math.max(0, ...session.hands.map((hand) => hand.points))
  const durationMinutes = session.endedAt
    ? Math.max(
        1,
        Math.round(
          (session.endedAt.getTime() - session.startedAt.getTime()) / 60_000,
        ),
      )
    : 0

  const paddedIds = [
    playerIds[0] ?? "unknown",
    playerIds[1] ?? "unknown",
    playerIds[2] ?? "unknown",
    playerIds[3] ?? playerIds[0] ?? "unknown",
  ] as [string, string, string, string]

  return {
    id: session.id,
    seasonId: ACTIVE_SEASON.id,
    title: session.title,
    venueName: "Jade Mahjong Lounge",
    district: "Bandar Lampung",
    startedAt: session.startedAt.toISOString(),
    endedAt: (session.endedAt ?? session.startedAt).toISOString(),
    status: session.status === "FINISHED" ? "finished" : "live",
    seats: 4,
    games: session.hands.length,
    handsWon: session.hands.filter((hand) => hand.winMethod !== "DRAW").length,
    draws: session.hands.filter((hand) => hand.winMethod === "DRAW").length,
    biggestHand,
    durationMinutes,
    playerIds: paddedIds,
    standings,
    race,
    hands,
    highlights: {
      biggestHand: {
        playerId: standings[0]?.playerId ?? paddedIds[0],
        points: biggestHand,
        combo: "—",
      },
      biggestPayout: {
        playerId: standings[0]?.playerId ?? paddedIds[0],
        points: Math.max(0, ...standings.map((row) => row.net)),
      },
      mostWins: {
        playerId:
          [...standings].sort((a, b) => b.wins - a.wins)[0]?.playerId ??
          paddedIds[0],
        wins: Math.max(0, ...standings.map((row) => row.wins)),
      },
      longestDeal: {
        playerId: paddedIds[0],
        hands: 0,
      },
      mostDealtIn: {
        playerId:
          [...standings].sort((a, b) => b.dealtIn - a.dealtIn)[0]?.playerId ??
          paddedIds[0],
        count: Math.max(0, ...standings.map((row) => row.dealtIn)),
      },
    },
    winMethods: {
      selfDraw: selfDrawWins,
      discard: discardWins,
    },
    claimedCombos: [],
  }
}

/** Expose seeded mock standings count for diagnostics */
export function getMockStandingCount() {
  return BOARD_STANDINGS.length
}

export function liveBoardLabel(board: BoardTier) {
  return board
}
