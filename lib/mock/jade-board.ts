/**
 * Season board + session-detail mock for the Jade editorial UI.
 * Builds on players from `jade-data.ts`. Tile ids match `lib/mahjong/tiles.ts`.
 */

import {
  EXPERIENCE_LEVELS,
  getPlayer,
  PLAYERS,
  SKILL_TIERS,
  skillForPoints,
  experienceForGames,
  type JadePlayer,
  type ExperienceLevel,
  type SkillTier,
} from "@/lib/mock/jade-data"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"

function tileId(id: string): string {
  if (!TILE_BY_ID[id]) {
    throw new Error(`jade-board: unknown tile "${id}"`)
  }
  return id
}

function tileIds(ids: string[]): string[] {
  return ids.map(tileId)
}

export type BoardTier = "beginner" | "advanced" | "mcr"
export type FormResult = "W" | "L" | "D"

export interface SeasonMeta {
  id: string
  label: string
  rangeLabel: string
  sessionsPlayed: number
  gamesPlayed: number
  hoursAtTable: number
}

export interface BoardStanding {
  rank: number
  playerId: string
  board: BoardTier
  points: number
  wins: number
  games: number
  winRate: number
  ptsPerWin: number
  bonus: number
  pen: number
  biggestHand: number
  form: FormResult[]
  streak: number
  selfDraw: number
  discardWins: number
}

export interface BoardStandingRow extends BoardStanding {
  player: JadePlayer
  skillTier: SkillTier
  experienceLevel: ExperienceLevel
}

export interface SeasonKpi {
  sessionsPlayed: number
  gamesPlayed: number
  hoursAtTable: number
  biggestHand: { playerId: string; points: number; combo: string }
  topCombo: { name: string; count: number }
  hotStreak: { playerId: string; streak: number }
}

export type WinMethod = "self-draw" | "discard"

export interface HandComboTag {
  label: string
  fan: number
}

export interface SessionHand {
  id: string
  handNo: number
  winnerId: string
  method: WinMethod
  /** Player who dealt into the win when method is discard. */
  dealtById: string | null
  combos: HandComboTag[]
  tileIds: string[]
  winningTileId: string
  bonusTileIds: string[]
  /** Point delta for every seat at the table, keyed by playerId. */
  deltas: Record<string, number>
}

export interface SessionStanding {
  rank: 1 | 2 | 3 | 4
  playerId: string
  net: number
  wins: number
  selfDraw: number
  dealtIn: number
  form: FormResult[]
}

export interface SessionDetail {
  id: string
  seasonId: string
  title: string
  venueName: string
  district: string
  startedAt: string
  endedAt: string
  status: "finished" | "live"
  seats: 4
  games: number
  handsWon: number
  draws: number
  biggestHand: number
  durationMinutes: number
  playerIds: [string, string, string, string]
  standings: SessionStanding[]
  /** Cumulative net after each hand, for score race. Index 0 = start (0). */
  race: Record<string, number[]>
  hands: SessionHand[]
  highlights: {
    biggestHand: { playerId: string; points: number; combo: string }
    biggestPayout: { playerId: string; points: number }
    mostWins: { playerId: string; wins: number }
    longestDeal: { playerId: string; hands: number }
    mostDealtIn: { playerId: string; count: number }
  }
  winMethods: { selfDraw: number; discard: number }
  claimedCombos: { label: string; count: number }[]
}

export interface RecentSessionCard {
  id: string
  title: string
  startedAt: string
  endedAt: string
  venueName: string
  winnerId: string
  games: number
  durationMinutes: number
}

export const ACTIVE_SEASON: SeasonMeta = {
  id: "nov-dec-2026",
  label: "Nov-Dec 2026",
  rangeLabel: "Nov–Dec 2026",
  sessionsPlayed: 5,
  gamesPlayed: 17,
  hoursAtTable: 6.5,
}

export const SEASON_KPI: SeasonKpi = {
  sessionsPlayed: 5,
  gamesPlayed: 17,
  hoursAtTable: 6.5,
  biggestHand: {
    playerId: "hendra-wijaya",
    points: 12800,
    combo: "Jade Dragon",
  },
  topCombo: {
    name: "All Pungs",
    count: 9,
  },
  hotStreak: {
    playerId: "tan-mei-ling",
    streak: 4,
  },
}

export const WIN_METHODS_SEASON = {
  selfDraw: 11,
  discard: 6,
} as const

/** Enriched standings for the Jade Rank table. */
export const BOARD_STANDINGS: BoardStanding[] = [
  {
    rank: 1,
    playerId: "hendra-wijaya",
    board: "advanced",
    points: 18600,
    wins: 68,
    games: 214,
    winRate: 31.8,
    ptsPerWin: 274,
    bonus: 420,
    pen: 80,
    biggestHand: 12800,
    form: ["W", "W", "W", "L", "W"],
    streak: 6,
    selfDraw: 41,
    discardWins: 27,
  },
  {
    rank: 2,
    playerId: "sari-lestari",
    board: "advanced",
    points: 15420,
    wins: 55,
    games: 188,
    winRate: 29.3,
    ptsPerWin: 280,
    bonus: 360,
    pen: 40,
    biggestHand: 6400,
    form: ["W", "W", "L", "W", "W"],
    streak: 3,
    selfDraw: 30,
    discardWins: 25,
  },
  {
    rank: 3,
    playerId: "lim-wie-hong",
    board: "advanced",
    points: 14110,
    wins: 48,
    games: 171,
    winRate: 28.1,
    ptsPerWin: 294,
    bonus: 280,
    pen: 120,
    biggestHand: 4800,
    form: ["L", "W", "W", "L", "L"],
    streak: -1,
    selfDraw: 22,
    discardWins: 26,
  },
  {
    rank: 4,
    playerId: "dewi-anggraini",
    board: "advanced",
    points: 12840,
    wins: 44,
    games: 156,
    winRate: 28.2,
    ptsPerWin: 292,
    bonus: 310,
    pen: 60,
    biggestHand: 3200,
    form: ["W", "L", "W", "W", "D"],
    streak: 2,
    selfDraw: 24,
    discardWins: 20,
  },
  {
    rank: 5,
    playerId: "bambang-sutopo",
    board: "advanced",
    points: 10420,
    wins: 33,
    games: 121,
    winRate: 27.3,
    ptsPerWin: 316,
    bonus: 190,
    pen: 40,
    biggestHand: 2400,
    form: ["W", "D", "L", "W", "W"],
    streak: 1,
    selfDraw: 18,
    discardWins: 15,
  },
  {
    rank: 6,
    playerId: "tan-mei-ling",
    board: "advanced",
    points: 9180,
    wins: 31,
    games: 109,
    winRate: 28.4,
    ptsPerWin: 296,
    bonus: 220,
    pen: 20,
    biggestHand: 3600,
    form: ["W", "W", "W", "W", "L"],
    streak: 4,
    selfDraw: 19,
    discardWins: 12,
  },
  {
    rank: 7,
    playerId: "yudi-kurniawan",
    board: "beginner",
    points: 8060,
    wins: 24,
    games: 94,
    winRate: 25.5,
    ptsPerWin: 336,
    bonus: 140,
    pen: 100,
    biggestHand: 1800,
    form: ["L", "L", "W", "D", "L"],
    streak: -2,
    selfDraw: 10,
    discardWins: 14,
  },
  {
    rank: 8,
    playerId: "rina-marlina",
    board: "beginner",
    points: 6740,
    wins: 18,
    games: 72,
    winRate: 25.0,
    ptsPerWin: 374,
    bonus: 160,
    pen: 40,
    biggestHand: 1600,
    form: ["W", "L", "W", "D", "W"],
    streak: 1,
    selfDraw: 9,
    discardWins: 9,
  },
  {
    rank: 9,
    playerId: "eko-prasetyo",
    board: "beginner",
    points: 5120,
    wins: 14,
    games: 58,
    winRate: 24.1,
    ptsPerWin: 366,
    bonus: 90,
    pen: 60,
    biggestHand: 1200,
    form: ["W", "W", "L", "W", "D"],
    streak: 2,
    selfDraw: 8,
    discardWins: 6,
  },
  {
    rank: 10,
    playerId: "wulan-dariati",
    board: "beginner",
    points: 4380,
    wins: 11,
    games: 41,
    winRate: 26.8,
    ptsPerWin: 398,
    bonus: 110,
    pen: 20,
    biggestHand: 4800,
    form: ["L", "W", "W", "L", "L"],
    streak: -1,
    selfDraw: 7,
    discardWins: 4,
  },
  {
    rank: 11,
    playerId: "andi-saputra",
    board: "beginner",
    points: 2760,
    wins: 6,
    games: 27,
    winRate: 22.2,
    ptsPerWin: 460,
    bonus: 70,
    pen: 40,
    biggestHand: 800,
    form: ["W", "W", "D", "L", "W"],
    streak: 2,
    selfDraw: 3,
    discardWins: 3,
  },
  {
    rank: 12,
    playerId: "nurul-hidayati",
    board: "beginner",
    points: 1490,
    wins: 3,
    games: 14,
    winRate: 21.4,
    ptsPerWin: 497,
    bonus: 40,
    pen: 20,
    biggestHand: 600,
    form: ["W", "L", "D", "W", "L"],
    streak: 1,
    selfDraw: 2,
    discardWins: 1,
  },
]

const P2494 = {
  a: "hendra-wijaya",
  b: "sari-lestari",
  c: "lim-wie-hong",
  d: "dewi-anggraini",
} as const

const HANDS_2494: SessionHand[] = [
  {
    id: "2494-h01",
    handNo: 1,
    winnerId: P2494.b,
    method: "self-draw",
    dealtById: null,
    combos: [
      { label: "All Simples", fan: 1 },
      { label: "No Flowers", fan: 1 },
    ],
    tileIds: tileIds([
      "dots-2",
      "dots-3",
      "dots-4",
      "bamboo-5",
      "bamboo-5",
      "bamboo-5",
      "characters-3",
      "characters-4",
      "characters-5",
      "dots-7",
      "dots-8",
      "dots-9",
      "bamboo-2",
      "bamboo-2",
    ]),
    winningTileId: tileId("bamboo-2"),
    bonusTileIds: [],
    deltas: {
      [P2494.a]: -400,
      [P2494.b]: 1200,
      [P2494.c]: -400,
      [P2494.d]: -400,
    },
  },
  {
    id: "2494-h02",
    handNo: 2,
    winnerId: P2494.a,
    method: "discard",
    dealtById: P2494.c,
    combos: [
      { label: "Pung Dragon", fan: 1 },
      { label: "Kong", fan: 1 },
    ],
    tileIds: tileIds([
      "dragon-green",
      "dragon-green",
      "dragon-green",
      "dragon-green",
      "wind-east",
      "wind-east",
      "wind-east",
      "bamboo-7",
      "bamboo-8",
      "bamboo-9",
      "dots-1",
      "dots-1",
      "characters-9",
      "characters-9",
    ]),
    winningTileId: tileId("dragon-green"),
    bonusTileIds: tileIds(["flower-plum"]),
    deltas: {
      [P2494.a]: 1800,
      [P2494.b]: 0,
      [P2494.c]: -1800,
      [P2494.d]: 0,
    },
  },
  {
    id: "2494-h03",
    handNo: 3,
    winnerId: P2494.d,
    method: "self-draw",
    dealtById: null,
    combos: [
      { label: "Half Flush", fan: 3 },
      { label: "Own Flower", fan: 1 },
    ],
    tileIds: tileIds([
      "characters-1",
      "characters-2",
      "characters-3",
      "characters-5",
      "characters-5",
      "characters-5",
      "characters-7",
      "characters-8",
      "characters-9",
      "wind-south",
      "wind-south",
      "wind-south",
      "dragon-white",
      "dragon-white",
    ]),
    winningTileId: tileId("characters-9"),
    bonusTileIds: tileIds(["flower-orchid"]),
    deltas: {
      [P2494.a]: -800,
      [P2494.b]: -800,
      [P2494.c]: -800,
      [P2494.d]: 2400,
    },
  },
  {
    id: "2494-h04",
    handNo: 4,
    winnerId: P2494.a,
    method: "self-draw",
    dealtById: null,
    combos: [
      { label: "All Pungs", fan: 3 },
      { label: "Seat Wind", fan: 1 },
    ],
    tileIds: tileIds([
      "dots-3",
      "dots-3",
      "dots-3",
      "bamboo-9",
      "bamboo-9",
      "bamboo-9",
      "wind-east",
      "wind-east",
      "wind-east",
      "dragon-red",
      "dragon-red",
      "dragon-red",
      "characters-2",
      "characters-2",
    ]),
    winningTileId: tileId("wind-east"),
    bonusTileIds: tileIds(["season-spring"]),
    deltas: {
      [P2494.a]: 3200,
      [P2494.b]: -1067,
      [P2494.c]: -1067,
      [P2494.d]: -1066,
    },
  },
  {
    id: "2494-h05",
    handNo: 5,
    winnerId: P2494.b,
    method: "discard",
    dealtById: P2494.d,
    combos: [{ label: "All Chows", fan: 1 }],
    tileIds: tileIds([
      "bamboo-1",
      "bamboo-2",
      "bamboo-3",
      "bamboo-4",
      "bamboo-5",
      "bamboo-6",
      "dots-2",
      "dots-3",
      "dots-4",
      "characters-6",
      "characters-7",
      "characters-8",
      "dots-8",
      "dots-8",
    ]),
    winningTileId: tileId("bamboo-6"),
    bonusTileIds: [],
    deltas: {
      [P2494.a]: 0,
      [P2494.b]: 800,
      [P2494.c]: 0,
      [P2494.d]: -800,
    },
  },
  {
    id: "2494-h06",
    handNo: 6,
    winnerId: P2494.a,
    method: "discard",
    dealtById: P2494.b,
    combos: [
      { label: "Jade Dragon", fan: 10 },
    ],
    tileIds: tileIds([
      "dragon-green",
      "dragon-green",
      "dragon-green",
      "bamboo-1",
      "bamboo-1",
      "bamboo-1",
      "bamboo-4",
      "bamboo-5",
      "bamboo-6",
      "bamboo-7",
      "bamboo-8",
      "bamboo-9",
      "bamboo-2",
      "bamboo-2",
    ]),
    winningTileId: tileId("dragon-green"),
    bonusTileIds: tileIds(["flower-bamboo", "season-summer"]),
    deltas: {
      [P2494.a]: 12800,
      [P2494.b]: -12800,
      [P2494.c]: 0,
      [P2494.d]: 0,
    },
  },
  {
    id: "2494-h07",
    handNo: 7,
    winnerId: P2494.c,
    method: "self-draw",
    dealtById: null,
    combos: [
      { label: "Seven Pairs", fan: 4 },
    ],
    tileIds: tileIds([
      "dots-1",
      "dots-1",
      "dots-5",
      "dots-5",
      "bamboo-3",
      "bamboo-3",
      "characters-4",
      "characters-4",
      "wind-west",
      "wind-west",
      "dragon-white",
      "dragon-white",
      "characters-9",
      "characters-9",
    ]),
    winningTileId: tileId("characters-9"),
    bonusTileIds: [],
    deltas: {
      [P2494.a]: -1067,
      [P2494.b]: -1066,
      [P2494.c]: 3200,
      [P2494.d]: -1067,
    },
  },
  {
    id: "2494-h08",
    handNo: 8,
    winnerId: P2494.a,
    method: "self-draw",
    dealtById: null,
    combos: [
      { label: "Pung Dragon", fan: 1 },
      { label: "Own Season", fan: 1 },
    ],
    tileIds: tileIds([
      "dragon-red",
      "dragon-red",
      "dragon-red",
      "dots-6",
      "dots-7",
      "dots-8",
      "bamboo-2",
      "bamboo-3",
      "bamboo-4",
      "characters-1",
      "characters-1",
      "characters-1",
      "wind-north",
      "wind-north",
    ]),
    winningTileId: tileId("dragon-red"),
    bonusTileIds: tileIds(["season-autumn"]),
    deltas: {
      [P2494.a]: 1600,
      [P2494.b]: -534,
      [P2494.c]: -533,
      [P2494.d]: -533,
    },
  },
]

function buildRace(hands: SessionHand[], playerIds: string[]): Record<string, number[]> {
  const race: Record<string, number[]> = {}
  for (const id of playerIds) race[id] = [0]
  let totals: Record<string, number> = Object.fromEntries(playerIds.map((id) => [id, 0]))
  for (const hand of hands) {
    totals = { ...totals }
    for (const id of playerIds) {
      totals[id] = (totals[id] ?? 0) + (hand.deltas[id] ?? 0)
      race[id].push(totals[id])
    }
  }
  return race
}

const race2494 = buildRace(HANDS_2494, [P2494.a, P2494.b, P2494.c, P2494.d])

function netFromRace(race: Record<string, number[]>, playerId: string) {
  const series = race[playerId]
  return series[series.length - 1] ?? 0
}

export const SESSION_DETAILS: Record<string, SessionDetail> = {
  "2494": {
    id: "2494",
    seasonId: ACTIVE_SEASON.id,
    title: "Minggu Sore Teluk",
    venueName: "Rumah Jade",
    district: "Teluk Betung",
    startedAt: "2026-11-08T16:18:00+07:00",
    endedAt: "2026-11-08T17:57:00+07:00",
    status: "finished",
    seats: 4,
    games: 8,
    handsWon: 8,
    draws: 0,
    biggestHand: 12800,
    durationMinutes: 99,
    playerIds: [P2494.a, P2494.b, P2494.c, P2494.d],
    standings: [
      {
        rank: 1 as const,
        playerId: P2494.a,
        net: netFromRace(race2494, P2494.a),
        wins: 4,
        selfDraw: 3,
        dealtIn: 1,
        form: ["L", "W", "L", "W", "W"],
      },
      {
        rank: 2 as const,
        playerId: P2494.b,
        net: netFromRace(race2494, P2494.b),
        wins: 2,
        selfDraw: 1,
        dealtIn: 1,
        form: ["W", "L", "L", "W", "L"],
      },
      {
        rank: 3 as const,
        playerId: P2494.d,
        net: netFromRace(race2494, P2494.d),
        wins: 1,
        selfDraw: 1,
        dealtIn: 1,
        form: ["L", "L", "W", "L", "L"],
      },
      {
        rank: 4 as const,
        playerId: P2494.c,
        net: netFromRace(race2494, P2494.c),
        wins: 1,
        selfDraw: 1,
        dealtIn: 1,
        form: ["L", "L", "L", "L", "W"],
      },
    ],
    race: race2494,
    hands: HANDS_2494,
    highlights: {
      biggestHand: {
        playerId: P2494.a,
        points: 12800,
        combo: "Jade Dragon",
      },
      biggestPayout: {
        playerId: P2494.b,
        points: 12800,
      },
      mostWins: {
        playerId: P2494.a,
        wins: 4,
      },
      longestDeal: {
        playerId: P2494.a,
        hands: 3,
      },
      mostDealtIn: {
        playerId: P2494.c,
        count: 1,
      },
    },
    winMethods: { selfDraw: 5, discard: 3 },
    claimedCombos: [
      { label: "Pung Dragon", count: 2 },
      { label: "All Simples", count: 1 },
      { label: "Half Flush", count: 1 },
      { label: "All Pungs", count: 1 },
      { label: "Jade Dragon", count: 1 },
      { label: "Seven Pairs", count: 1 },
    ],
  },
  "2493": {
    id: "2493",
    seasonId: ACTIVE_SEASON.id,
    title: "Kamis Malam Teluk",
    venueName: "Rumah Jade",
    district: "Teluk Betung",
    startedAt: "2026-11-19T19:30:00+07:00",
    endedAt: "2026-11-19T21:10:00+07:00",
    status: "finished",
    seats: 4,
    games: 3,
    handsWon: 3,
    draws: 0,
    biggestHand: 6400,
    durationMinutes: 100,
    playerIds: [P2494.a, P2494.b, P2494.c, P2494.d],
    standings: [
      { rank: 1, playerId: P2494.a, net: 4200, wins: 2, selfDraw: 1, dealtIn: 0, form: ["W", "W", "L"] },
      { rank: 2, playerId: P2494.b, net: 800, wins: 1, selfDraw: 1, dealtIn: 0, form: ["L", "L", "W"] },
      { rank: 3, playerId: P2494.d, net: -1600, wins: 0, selfDraw: 0, dealtIn: 1, form: ["L", "L", "L"] },
      { rank: 4, playerId: P2494.c, net: -3400, wins: 0, selfDraw: 0, dealtIn: 1, form: ["L", "L", "L"] },
    ],
    race: {
      [P2494.a]: [0, 1800, 4200, 4200],
      [P2494.b]: [0, -600, -1800, 800],
      [P2494.c]: [0, -600, -1200, -3400],
      [P2494.d]: [0, -600, -1200, -1600],
    },
    hands: [
      {
        id: "2493-h01",
        handNo: 1,
        winnerId: P2494.a,
        method: "discard",
        dealtById: P2494.c,
        combos: [{ label: "Pung Dragon", fan: 1 }],
        tileIds: tileIds([
          "dragon-green",
          "dragon-green",
          "dragon-green",
          "wind-east",
          "wind-east",
          "wind-east",
          "bamboo-9",
          "bamboo-9",
          "bamboo-9",
          "dots-3",
          "dots-4",
          "dots-5",
          "dragon-red",
          "dragon-red",
        ]),
        winningTileId: tileId("dragon-green"),
        bonusTileIds: tileIds(["flower-plum"]),
        deltas: {
          [P2494.a]: 1800,
          [P2494.b]: -600,
          [P2494.c]: -600,
          [P2494.d]: -600,
        },
      },
      {
        id: "2493-h02",
        handNo: 2,
        winnerId: P2494.a,
        method: "self-draw",
        dealtById: null,
        combos: [{ label: "All Pungs", fan: 3 }],
        tileIds: tileIds([
          "dots-2",
          "dots-2",
          "dots-2",
          "bamboo-4",
          "bamboo-4",
          "bamboo-4",
          "characters-8",
          "characters-8",
          "characters-8",
          "wind-south",
          "wind-south",
          "wind-south",
          "dragon-white",
          "dragon-white",
        ]),
        winningTileId: tileId("wind-south"),
        bonusTileIds: [],
        deltas: {
          [P2494.a]: 2400,
          [P2494.b]: -800,
          [P2494.c]: -800,
          [P2494.d]: -800,
        },
      },
      {
        id: "2493-h03",
        handNo: 3,
        winnerId: P2494.b,
        method: "self-draw",
        dealtById: null,
        combos: [{ label: "Half Flush", fan: 3 }],
        tileIds: tileIds([
          "characters-2",
          "characters-3",
          "characters-4",
          "characters-6",
          "characters-6",
          "characters-6",
          "characters-7",
          "characters-8",
          "characters-9",
          "wind-west",
          "wind-west",
          "wind-west",
          "dragon-red",
          "dragon-red",
        ]),
        winningTileId: tileId("dragon-red"),
        bonusTileIds: tileIds(["flower-orchid"]),
        deltas: {
          [P2494.a]: 0,
          [P2494.b]: 2600,
          [P2494.c]: -2200,
          [P2494.d]: -400,
        },
      },
    ],
    highlights: {
      biggestHand: { playerId: P2494.a, points: 2400, combo: "All Pungs" },
      biggestPayout: { playerId: P2494.c, points: 2200 },
      mostWins: { playerId: P2494.a, wins: 2 },
      longestDeal: { playerId: P2494.a, hands: 2 },
      mostDealtIn: { playerId: P2494.c, count: 1 },
    },
    winMethods: { selfDraw: 2, discard: 1 },
    claimedCombos: [
      { label: "Pung Dragon", count: 1 },
      { label: "All Pungs", count: 1 },
      { label: "Half Flush", count: 1 },
    ],
  },
}

/** Lightweight cards for recent sessions list (5 sittings). */
export const RECENT_SESSIONS: RecentSessionCard[] = [
  {
    id: "2494",
    title: "Minggu Sore Teluk",
    startedAt: "2026-11-08T16:18:00+07:00",
    endedAt: "2026-11-08T17:57:00+07:00",
    venueName: "Rumah Jade",
    winnerId: P2494.a,
    games: 8,
    durationMinutes: 99,
  },
  {
    id: "2493",
    title: "Kamis Malam Teluk",
    startedAt: "2026-11-19T19:30:00+07:00",
    endedAt: "2026-11-19T21:10:00+07:00",
    venueName: "Rumah Jade",
    winnerId: P2494.a,
    games: 3,
    durationMinutes: 100,
  },
  {
    id: "2492",
    title: "Minggu Sore Kedaton",
    startedAt: "2026-11-16T16:00:00+07:00",
    endedAt: "2026-11-16T17:20:00+07:00",
    venueName: "Paviliun Kedaton",
    winnerId: "dewi-anggraini",
    games: 2,
    durationMinutes: 80,
  },
  {
    id: "2491",
    title: "Jumat Enggal",
    startedAt: "2026-11-14T20:00:00+07:00",
    endedAt: "2026-11-14T21:05:00+07:00",
    venueName: "Lingkar Enggal",
    winnerId: "tan-mei-ling",
    games: 2,
    durationMinutes: 65,
  },
  {
    id: "2490",
    title: "Rabu Pagi Metro",
    startedAt: "2026-11-12T09:00:00+07:00",
    endedAt: "2026-11-12T10:10:00+07:00",
    venueName: "Meja Pagi Metro",
    winnerId: "wulan-dariati",
    games: 2,
    durationMinutes: 70,
  },
]

export function getBoardStandings(board?: BoardTier | "all"): BoardStandingRow[] {
  const rows = BOARD_STANDINGS.filter((row) =>
    !board || board === "all" ? true : row.board === board,
  ).map((standing) => {
    const player = getPlayer(standing.playerId)
    return {
      ...standing,
      player,
      skillTier: skillForPoints(standing.points),
      experienceLevel:
        EXPERIENCE_LEVELS.find((level) => level.id === player.experienceLevelId) ??
        experienceForGames(standing.games),
    }
  })
  return rows.sort((a, b) => a.rank - b.rank)
}

export function getSessionDetail(id: string): SessionDetail | null {
  return SESSION_DETAILS[id] ?? null
}

export function formatSignedPoints(value: number) {
  const abs = new Intl.NumberFormat("id-ID").format(Math.abs(value))
  if (value > 0) return `+${abs}`
  if (value < 0) return `−${abs}`
  return "0"
}

export function formatPlainPoints(value: number) {
  return new Intl.NumberFormat("id-ID").format(value)
}

export function winRateLabel(rate: number) {
  return `${rate.toFixed(1)}%`
}

// Keep PLAYERS referenced so tree-shaking never drops player checks in tests.
void PLAYERS
void SKILL_TIERS
