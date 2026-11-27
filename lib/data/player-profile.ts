import { prisma } from "@/lib/db"
import {
  type ExperienceLevel,
  type JadePlayer,
} from "@/lib/mock/jade-data"
import { formatSignedPoints, winRateLabel } from "@/lib/mock/jade-board"
import {
  skillBandFromRating,
  type SkillSubrank,
} from "@/lib/mock/jade-levels"

export type PlaystyleArchetype = {
  id: string
  name: string
  summary: string
}

export type RecentHandSummary = {
  id: string
  sessionId: string
  sessionTitle: string
  handNumber: number
  role: "win" | "dealt-in" | "played"
  method: string
  points: number
  at: string
}

export type ProMatchupStat = {
  playerId: string | null
  name: string
  points: number
  hands: number
  label: string
}

export type FanDnaStat = {
  label: string
  count: number
  totalFan: number
}

export type PlayerProInsights = {
  nemesis: ProMatchupStat | null
  victim: ProMatchupStat | null
  fanDna: FanDnaStat[]
}

export type PlayerProfile = {
  player: JadePlayer
  experienceLevel: ExperienceLevel
  /** Elo ladder label, e.g. "Silver II" (not season Raja Meja). */
  skillTierName: string
  skillRating: number
  eloTierId: string
  eloSubrank: SkillSubrank
  experienceXp: number
  experienceLevelNumber: number
  experienceBandTitle: string
  /** XP into current LV / XP needed for next LV */
  xpIntoLevel: number
  xpForNextLevel: number
  pctToNextLevel: number
  seasonPoints: number
  wins: number
  games: number
  winRate: number
  winRateLabel: string
  selfDraw: number
  discardWins: number
  dealtIn: number
  playstyle: PlaystyleArchetype
  recentHands: RecentHandSummary[]
  proInsights: PlayerProInsights
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
    experienceLevelId:
      player.experienceLevelId as JadePlayer["experienceLevelId"],
    memberSince: player.memberSince.toISOString().slice(0, 10),
    avatarUrl: player.avatarUrl ?? null,
    frameId: player.frameId ?? "classic",
  }
}

/**
 * Playstyle from real season / seat stats.
 * EDIT HERE — tweak thresholds to retune archetypes.
 */
export function playstyleFromStats(stats: {
  games: number
  winRate: number
  selfDraw: number
  discardWins: number
  dealtIn: number
  wins: number
}): PlaystyleArchetype {
  // EDIT HERE — min games before a specialized archetype is allowed
  const MIN_GAMES_FOR_ARCHETYPE = 3
  // EDIT HERE — self-draw share of wins → "Wall Reader"
  const SELF_DRAW_SHARE = 0.45
  // EDIT HERE — dealt-in per game → "Soft Discard"
  const DEAL_IN_PER_GAME = 0.55
  // EDIT HERE — win rate → "Table Shark"
  const SHARK_WIN_RATE = 0.35

  if (stats.games < MIN_GAMES_FOR_ARCHETYPE) {
    return {
      id: "new-ink",
      name: "New Ink",
      summary: "Still filling the first ledgers. Archetype unlocks after a few tables.",
    }
  }

  const winShareSelf =
    stats.wins > 0 ? stats.selfDraw / stats.wins : 0
  const dealtPerGame = stats.games > 0 ? stats.dealtIn / stats.games : 0

  if (winShareSelf >= SELF_DRAW_SHARE) {
    return {
      id: "wall-reader",
      name: "Wall Reader",
      summary: "Wins often arrive by self-draw — patient builds, quiet walls.",
    }
  }
  if (dealtPerGame >= DEAL_IN_PER_GAME) {
    return {
      id: "soft-discard",
      name: "Soft Discard",
      summary: "Pays more than average when others call. Tighten the dangerous throws.",
    }
  }
  if (stats.winRate >= SHARK_WIN_RATE) {
    return {
      id: "table-shark",
      name: "Table Shark",
      summary: "High win clip at the house. Opponents notice when this seat sits.",
    }
  }
  return {
    id: "steady-hand",
    name: "Steady Hand",
    summary: "Balanced book — neither a wall hermit nor a free dealer.",
  }
}

type SeatIdentity = {
  id: string
  displayName: string
  playerId: string | null
}

function seatIdentity(seat: {
  id: string
  guestName: string | null
  user: {
    playerId: string | null
    name: string
    player: { id: string; name: string; nickname: string } | null
  } | null
}): SeatIdentity {
  if (seat.user?.player) {
    return {
      id: seat.id,
      displayName: seat.user.player.name,
      playerId: seat.user.player.id,
    }
  }
  if (seat.user) {
    return {
      id: seat.id,
      displayName: seat.user.name,
      playerId: seat.user.playerId,
    }
  }
  return {
    id: seat.id,
    displayName: seat.guestName?.trim() || "Guest",
    playerId: null,
  }
}

function matchupKey(identity: SeatIdentity) {
  return identity.playerId ?? `seat:${identity.displayName}`
}

async function computeProInsights(
  mySeatIds: Set<string>,
): Promise<PlayerProInsights> {
  if (mySeatIds.size === 0) {
    return { nemesis: null, victim: null, fanDna: [] }
  }

  const seatIdList = [...mySeatIds]
  const hands = await prisma.handRecord.findMany({
    where: {
      session: { status: "FINISHED" },
      OR: [
        { winnerSeatId: { in: seatIdList } },
        { dealtInSeatId: { in: seatIdList } },
      ],
    },
    include: {
      winnerSeat: {
        include: {
          user: { include: { player: true } },
        },
      },
      dealtInSeat: {
        include: {
          user: { include: { player: true } },
        },
      },
    },
  })

  const paidTo = new Map<
    string,
    { identity: SeatIdentity; points: number; hands: number }
  >()
  const collectedFrom = new Map<
    string,
    { identity: SeatIdentity; points: number; hands: number }
  >()
  const comboCounts = new Map<string, { count: number; totalFan: number }>()

  for (const hand of hands) {
    const iDealtIn =
      hand.dealtInSeatId != null && mySeatIds.has(hand.dealtInSeatId)
    const iWon =
      hand.winnerSeatId != null && mySeatIds.has(hand.winnerSeatId)

    if (iDealtIn && hand.winnerSeat && hand.winMethod === "DISCARD") {
      const identity = seatIdentity(hand.winnerSeat)
      if (!mySeatIds.has(identity.id)) {
        const key = matchupKey(identity)
        const prev = paidTo.get(key) ?? {
          identity,
          points: 0,
          hands: 0,
        }
        prev.points += hand.points
        prev.hands += 1
        paidTo.set(key, prev)
      }
    }

    if (iWon && hand.dealtInSeat && hand.winMethod === "DISCARD") {
      const identity = seatIdentity(hand.dealtInSeat)
      if (!mySeatIds.has(identity.id)) {
        const key = matchupKey(identity)
        const prev = collectedFrom.get(key) ?? {
          identity,
          points: 0,
          hands: 0,
        }
        prev.points += hand.points
        prev.hands += 1
        collectedFrom.set(key, prev)
      }
    }

    if (iWon && hand.winMethod !== "DRAW") {
      const combos =
        (hand.combosJson as { label?: string; fan?: number }[] | null) ?? []
      for (const combo of combos) {
        const label = combo.label?.trim()
        if (!label || label === "Draw") continue
        const prev = comboCounts.get(label) ?? { count: 0, totalFan: 0 }
        prev.count += 1
        prev.totalFan += combo.fan ?? 0
        comboCounts.set(label, prev)
      }
    }
  }

  const topPaid = [...paidTo.values()].sort((a, b) => b.points - a.points)[0]
  const topCollected = [...collectedFrom.values()].sort(
    (a, b) => b.points - a.points,
  )[0]

  const fanDna = [...comboCounts.entries()]
    .map(([label, stats]) => ({
      label,
      count: stats.count,
      totalFan: stats.totalFan,
    }))
    .sort((a, b) => b.count - a.count || b.totalFan - a.totalFan)
    .slice(0, 5)

  return {
    nemesis: topPaid
      ? {
          playerId: topPaid.identity.playerId,
          name: topPaid.identity.displayName,
          points: topPaid.points,
          hands: topPaid.hands,
          label: `${topPaid.identity.displayName} · ${formatSignedPoints(-topPaid.points)}`,
        }
      : null,
    victim: topCollected
      ? {
          playerId: topCollected.identity.playerId,
          name: topCollected.identity.displayName,
          points: topCollected.points,
          hands: topCollected.hands,
          label: `${topCollected.identity.displayName} · ${formatSignedPoints(topCollected.points)}`,
        }
      : null,
    fanDna,
  }
}

export async function getPlayerProfile(
  id: string,
): Promise<PlayerProfile | null> {
  const player = await prisma.player.findUnique({ where: { id } })
  if (!player) return null

  const season = await prisma.season.findFirst({ where: { isActive: true } })
  const standing = season
    ? await prisma.boardStanding.findUnique({
        where: {
          seasonId_playerId: { seasonId: season.id, playerId: id },
        },
      })
    : null

  const user = await prisma.user.findUnique({
    where: { playerId: id },
    select: { id: true },
  })

  const seats = user
    ? await prisma.sessionSeat.findMany({
        where: { userId: user.id },
        include: {
          session: {
            include: {
              hands: { orderBy: { handNumber: "desc" }, take: 40 },
            },
          },
        },
        orderBy: { session: { startedAt: "desc" } },
        take: 40,
      })
    : []

  const mySeatIds = new Set(seats.map((seat) => seat.id))

  const wins = standing?.wins ?? seats.reduce((sum, seat) => sum + seat.wins, 0)
  const games =
    standing?.games ??
    seats.filter((seat) => seat.session.status === "FINISHED").length
  const selfDraw =
    standing?.selfDraw ?? seats.reduce((sum, seat) => sum + seat.selfDraws, 0)
  const discardWins =
    standing?.discardWins ??
    seats.reduce(
      (sum, seat) => sum + Math.max(0, seat.wins - seat.selfDraws),
      0,
    )
  const dealtIn = seats.reduce((sum, seat) => sum + seat.dealtInCount, 0)
  const seasonPoints = standing?.points ?? 0
  const winRate =
    standing?.winRate ?? (games > 0 ? wins / Math.max(games, 1) : 0)

  // EDIT HERE — max hands kept for profile “See all”
  const RECENT_HANDS_CAP = 40
  const recentHands: RecentHandSummary[] = []
  for (const seat of seats) {
    for (const hand of seat.session.hands) {
      let role: RecentHandSummary["role"] = "played"
      if (hand.winnerSeatId === seat.id) role = "win"
      else if (hand.dealtInSeatId === seat.id) role = "dealt-in"
      else if (hand.winMethod === "DRAW") continue

      recentHands.push({
        id: hand.id,
        sessionId: seat.session.id,
        sessionTitle: seat.session.title,
        handNumber: hand.handNumber,
        role,
        method: hand.winMethod.toLowerCase().replace("_", "-"),
        points: hand.points,
        at: hand.createdAt.toISOString(),
      })
    }
  }

  recentHands.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )

  const { experienceFromXp, getXpProgress } = await import("@/lib/xp/progression")
  const xpProgress = getXpProgress(player.experienceXp)
  const jade = toJadePlayer({
    ...player,
    experienceLevelId: xpProgress.experienceLevelId,
  })
  const experienceLevel = experienceFromXp(player.experienceXp)

  const playstyle = playstyleFromStats({
    games,
    winRate,
    selfDraw,
    discardWins,
    dealtIn,
    wins,
  })

  const proInsights = await computeProInsights(mySeatIds)

  const elo = skillBandFromRating(player.skillRating)

  return {
    player: jade,
    experienceLevel,
    skillTierName: elo.label,
    skillRating: player.skillRating,
    eloTierId: elo.tier.id,
    eloSubrank: elo.subrank,
    experienceXp: player.experienceXp,
    experienceLevelNumber: xpProgress.level,
    experienceBandTitle: xpProgress.band.title,
    xpIntoLevel: xpProgress.xpIntoLevel,
    xpForNextLevel: xpProgress.xpForNextLevel,
    pctToNextLevel: xpProgress.pctToNext,
    seasonPoints,
    wins,
    games,
    winRate,
    winRateLabel: winRateLabel(winRate),
    selfDraw,
    discardWins,
    dealtIn,
    playstyle,
    recentHands: recentHands.slice(0, RECENT_HANDS_CAP),
    proInsights,
  }
}

/** Blurred placeholder copy when Free users peek at Pro cards. */
export function proTeaserHints(insights: PlayerProInsights) {
  return {
    nemesisHint: insights.nemesis?.name
      ? `Most paid to · ${insights.nemesis.name.slice(0, 1)}***`
      : "Most paid to · ???",
    victimHint: insights.victim?.name
      ? `Most collected from · ${insights.victim.name.slice(0, 1)}***`
      : "Most collected from · ???",
    fanHint: insights.fanDna[0]?.label
      ? `${insights.fanDna[0].label.slice(0, 3)}*** · ${insights.fanDna[0].count}×`
      : "Top combo · ???",
  }
}
