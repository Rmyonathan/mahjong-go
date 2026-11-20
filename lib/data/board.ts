import type { BoardTier, FormResult } from "@prisma/client"

import { prisma } from "@/lib/db"
import {
  EXPERIENCE_LEVELS,
  skillForPoints,
  type JadePlayer,
} from "@/lib/mock/jade-data"
import type {
  BoardStandingRow,
  FormResult as MockForm,
  SeasonKpi,
  SeasonMeta,
  SessionDetail,
  RecentSessionCard,
} from "@/lib/mock/jade-board"

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
  }
}

export async function getActiveSeason(): Promise<SeasonMeta | null> {
  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (!season) return null
  return {
    id: season.id,
    label: season.label,
    rangeLabel: season.rangeLabel,
    sessionsPlayed: season.sessionsPlayed,
    gamesPlayed: season.gamesPlayed,
    hoursAtTable: season.hoursAtTable,
  }
}

export async function getSeasonKpi(): Promise<SeasonKpi | null> {
  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (!season) return null
  return {
    sessionsPlayed: season.sessionsPlayed,
    gamesPlayed: season.gamesPlayed,
    hoursAtTable: season.hoursAtTable,
    biggestHand: {
      playerId: season.biggestHandPlayerId,
      points: season.biggestHandPts,
      combo: season.biggestHandCombo,
    },
    topCombo: {
      name: season.topComboName,
      count: season.topComboCount,
    },
    hotStreak: {
      playerId: season.hotStreakPlayerId,
      streak: season.hotStreak,
    },
  }
}

export async function getWinMethodsSeason() {
  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (!season) return { selfDraw: 0, discard: 0 }
  return { selfDraw: season.selfDrawWins, discard: season.discardWins }
}

export async function getDbBoardStandings(
  board: BoardTier | "all" = "advanced",
): Promise<BoardStandingRow[]> {
  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (!season) return []

  const rows = await prisma.boardStanding.findMany({
    where: {
      seasonId: season.id,
      ...(board === "all" ? {} : { board }),
    },
    include: { player: true },
    orderBy: [{ points: "desc" }, { rank: "asc" }],
  })

  return rows.map((row, index) => {
    const player = toJadePlayer(row.player)
    const experienceLevel =
      EXPERIENCE_LEVELS.find((level) => level.id === player.experienceLevelId) ??
      EXPERIENCE_LEVELS[EXPERIENCE_LEVELS.length - 1]
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
      skillTier: skillForPoints(row.points),
      experienceLevel,
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
  const sessions = await prisma.gameSession.findMany({
    orderBy: { startedAt: "desc" },
    take: 12,
  })
  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt.toISOString(),
    venueName: session.venueName,
    winnerId: session.winnerId,
    games: session.games,
    durationMinutes: session.durationMinutes,
  }))
}

export async function getDbPlayer(id: string) {
  return prisma.player.findUnique({ where: { id } })
}

export async function getDbSessionDetail(id: string): Promise<SessionDetail | null> {
  const session = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      seatPlayers: { orderBy: { seatOrder: "asc" } },
      standings: { orderBy: { rank: "asc" } },
      hands: {
        orderBy: { handNo: "asc" },
        include: { combos: true, deltas: true },
      },
      highlights: true,
      claimedCombos: { orderBy: { count: "desc" } },
    },
  })
  if (!session) return null

  const playerIds = session.seatPlayers.map((seat) => seat.playerId) as [
    string,
    string,
    string,
    string,
  ]

  const race: Record<string, number[]> = {}
  for (const playerId of playerIds) race[playerId] = [0]
  const totals: Record<string, number> = Object.fromEntries(
    playerIds.map((playerId) => [playerId, 0]),
  )
  for (const hand of session.hands) {
    for (const playerId of playerIds) {
      const delta =
        hand.deltas.find((entry) => entry.playerId === playerId)?.delta ?? 0
      totals[playerId] = (totals[playerId] ?? 0) + delta
      race[playerId].push(totals[playerId])
    }
  }

  return {
    id: session.id,
    seasonId: session.seasonId,
    title: session.title,
    venueName: session.venueName,
    district: session.district,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt.toISOString(),
    status: session.status,
    seats: 4,
    games: session.games,
    handsWon: session.handsWon,
    draws: session.draws,
    biggestHand: session.biggestHand,
    durationMinutes: session.durationMinutes,
    playerIds,
    standings: session.standings.map((standing) => ({
      rank: standing.rank as 1 | 2 | 3 | 4,
      playerId: standing.playerId,
      net: standing.net,
      wins: standing.wins,
      selfDraw: standing.selfDraw,
      dealtIn: standing.dealtIn,
      form: mapForm(standing.form),
    })),
    race,
    hands: session.hands.map((hand) => ({
      id: hand.id,
      handNo: hand.handNo,
      winnerId: hand.winnerId,
      method: hand.method === "self_draw" ? "self-draw" : "discard",
      dealtById: hand.dealtById,
      combos: hand.combos.map((combo) => ({
        label: combo.label,
        fan: combo.fan,
      })),
      tileIds: hand.tileIds,
      winningTileId: hand.winningTileId,
      bonusTileIds: hand.bonusTileIds,
      deltas: Object.fromEntries(
        hand.deltas.map((delta) => [delta.playerId, delta.delta]),
      ),
    })),
    highlights: session.highlights
      ? {
          biggestHand: {
            playerId: session.highlights.biggestHandPlayerId,
            points: session.highlights.biggestHandPoints,
            combo: session.highlights.biggestHandCombo,
          },
          biggestPayout: {
            playerId: session.highlights.biggestPayoutPlayerId,
            points: session.highlights.biggestPayoutPoints,
          },
          mostWins: {
            playerId: session.highlights.mostWinsPlayerId,
            wins: session.highlights.mostWins,
          },
          longestDeal: {
            playerId: session.highlights.longestDealPlayerId,
            hands: session.highlights.longestDealHands,
          },
          mostDealtIn: {
            playerId: session.highlights.mostDealtInPlayerId,
            count: session.highlights.mostDealtIn,
          },
        }
      : {
          biggestHand: { playerId: playerIds[0], points: 0, combo: "—" },
          biggestPayout: { playerId: playerIds[0], points: 0 },
          mostWins: { playerId: playerIds[0], wins: 0 },
          longestDeal: { playerId: playerIds[0], hands: 0 },
          mostDealtIn: { playerId: playerIds[0], count: 0 },
        },
    winMethods: {
      selfDraw: session.selfDrawWins,
      discard: session.discardWins,
    },
    claimedCombos: session.claimedCombos.map((combo) => ({
      label: combo.label,
      count: combo.count,
    })),
  }
}
