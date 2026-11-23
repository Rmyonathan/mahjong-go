/**
 * Mock ledger for the Jade Mahjong house UI.
 * Tile ids match `Tile.id` in `lib/mahjong/tiles.ts`.
 * This file does not score hands — points here are recorded results.
 */

import { TILE_BY_ID } from "@/lib/mahjong/tiles"

function tileId(id: string): string {
  if (!TILE_BY_ID[id]) {
    throw new Error(`jade-data: tile id "${id}" is not in lib/mahjong/tiles.ts`)
  }
  return id
}

function tileIds(ids: string[]): string[] {
  return ids.map(tileId)
}

export const EXPERIENCE_LEVELS = [
  {
    id: "master",
    name: "Master",
    minGames: 200,
    summary: "Dua ratusan meja. Membaca angin sebelum ubin jatuh.",
  },
  {
    id: "ahli",
    name: "Ahli",
    minGames: 140,
    summary: "Pemain tetap yang sudah menghitung meja, bukan hanya tangan.",
  },
  {
    id: "mahir",
    name: "Mahir",
    minGames: 80,
    summary: "Pung dan chow sudah tenang. Masih belajar kapan harus buang.",
  },
  {
    id: "menengah",
    name: "Menengah",
    minGames: 30,
    summary: "Sudah ikut sesi penuh dan membayar kalah tanpa drama.",
  },
  {
    id: "pemula",
    name: "Pemula",
    minGames: 0,
    summary: "Baru duduk. Empat angin dan tiga naga masih dihafal.",
  },
] as const

export const SKILL_TIERS = [
  {
    id: "raja-meja",
    name: "Raja Meja",
    minPoints: 16000,
    summary: "Puncak musim. Nama ini yang ditutup duluan kalau meja dibuka.",
  },
  {
    id: "tangan-emas",
    name: "Tangan Emas",
    minPoints: 12000,
    summary: "Menang cukup sering untuk menggeser papan, belum mengunci musim.",
  },
  {
    id: "tangan-hijau",
    name: "Tangan Hijau",
    minPoints: 8000,
    summary: "Inti rumah. Datang tiap minggu, jarang pulang kosong.",
  },
  {
    id: "tangan-tenang",
    name: "Tangan Tenang",
    minPoints: 4000,
    summary: "Bermain rapi. Poin naik pelan, kalahnya juga terukur.",
  },
  {
    id: "tangan-baru",
    name: "Tangan Baru",
    minPoints: 0,
    summary: "Masih mengumpulkan meja. Bonus bunga sering jadi hiburan.",
  },
] as const

export type ExperienceLevelId = (typeof EXPERIENCE_LEVELS)[number]["id"]
export type SkillTierId = (typeof SKILL_TIERS)[number]["id"]
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]
export type SkillTier = (typeof SKILL_TIERS)[number]

export interface JadePlayer {
  id: string
  name: string
  nickname: string
  initials: string
  city: string
  district: string
  house: string
  experienceLevelId: ExperienceLevelId
  memberSince: string
}

export interface LeaderboardStanding {
  rank: number
  playerId: string
  points: number
  wins: number
  games: number
  /** Season points gained or lost since the previous sitting. */
  delta: number
  /** Positive is a win streak. Negative is a loss streak. */
  streak: number
}

export interface HouseVenue {
  id: string
  name: string
  district: string
  city: string
  tables: number
  note: string
}

export interface HouseSession {
  id: string
  title: string
  venueId: string
  startedAt: string
  rounds: number
  playerIds: [string, string, string, string]
  winnerId: string
  note: string
}

export interface HandLog {
  id: string
  sessionId: string
  playerId: string
  won: boolean
  pattern: string
  points: number
  tileIds: string[]
  winningTileId: string | null
  bonusTileIds: string[]
  note: string
}

export interface DailyBonusTile {
  date: string
  tileId: string
  bonusPoints: number
  headline: string
  note: string
}

export interface LeaderboardRow extends LeaderboardStanding {
  player: JadePlayer
  skillTier: SkillTier
  experienceLevel: ExperienceLevel
}

export const PLAYERS: JadePlayer[] = [
  {
    id: "hendra-wijaya",
    name: "Hendra Wijaya",
    nickname: "Bang Hen",
    initials: "HW",
    city: "Bandar Lampung",
    district: "Teluk Betung",
    house: "Rumah Jade",
    experienceLevelId: "master",
    memberSince: "2023-02-11",
  },
  {
    id: "sari-lestari",
    name: "Sari Lestari",
    nickname: "Mbak Sari",
    initials: "SL",
    city: "Bandar Lampung",
    district: "Kemiling",
    house: "Meja Sore Kemiling",
    experienceLevelId: "ahli",
    memberSince: "2023-06-03",
  },
  {
    id: "lim-wie-hong",
    name: "Lim Wie Hong",
    nickname: "Ko Hong",
    initials: "LH",
    city: "Bandar Lampung",
    district: "Tanjung Karang",
    house: "Klub Tanjung Karang",
    experienceLevelId: "ahli",
    memberSince: "2023-04-19",
  },
  {
    id: "dewi-anggraini",
    name: "Dewi Anggraini",
    nickname: "Dek Dewi",
    initials: "DA",
    city: "Bandar Lampung",
    district: "Kedaton",
    house: "Paviliun Kedaton",
    experienceLevelId: "ahli",
    memberSince: "2023-09-14",
  },
  {
    id: "bambang-sutopo",
    name: "Bambang Sutopo",
    nickname: "Pak Bambang",
    initials: "BS",
    city: "Bandar Lampung",
    district: "Rajabasa",
    house: "Warung Ubin Rajabasa",
    experienceLevelId: "mahir",
    memberSince: "2024-01-20",
  },
  {
    id: "tan-mei-ling",
    name: "Tan Mei Ling",
    nickname: "Ce Mei",
    initials: "TM",
    city: "Bandar Lampung",
    district: "Sukarame",
    house: "Sukarame Night Table",
    experienceLevelId: "mahir",
    memberSince: "2024-03-02",
  },
  {
    id: "yudi-kurniawan",
    name: "Yudi Kurniawan",
    nickname: "Yudi",
    initials: "YK",
    city: "Bandar Lampung",
    district: "Enggal",
    house: "Lingkar Enggal",
    experienceLevelId: "mahir",
    memberSince: "2024-05-18",
  },
  {
    id: "rina-marlina",
    name: "Rina Marlina",
    nickname: "Rina",
    initials: "RM",
    city: "Bandar Lampung",
    district: "Panjang",
    house: "Dermaga Panjang",
    experienceLevelId: "menengah",
    memberSince: "2024-08-09",
  },
  {
    id: "eko-prasetyo",
    name: "Eko Prasetyo",
    nickname: "Eko",
    initials: "EP",
    city: "Lampung Selatan",
    district: "Natar",
    house: "Kebun Natar",
    experienceLevelId: "menengah",
    memberSince: "2024-11-01",
  },
  {
    id: "wulan-dariati",
    name: "Wulan Dariati",
    nickname: "Wulan",
    initials: "WD",
    city: "Metro",
    district: "Metro Pusat",
    house: "Meja Pagi Metro",
    experienceLevelId: "menengah",
    memberSince: "2025-01-12",
  },
  {
    id: "andi-saputra",
    name: "Andi Saputra",
    nickname: "Andi",
    initials: "AS",
    city: "Pringsewu",
    district: "Pringsewu",
    house: "Balai Pringsewu",
    experienceLevelId: "pemula",
    memberSince: "2025-06-21",
  },
  {
    id: "nurul-hidayati",
    name: "Nurul Hidayati",
    nickname: "Nurul",
    initials: "NH",
    city: "Lampung Selatan",
    district: "Kalianda",
    house: "Meja Laut Kalianda",
    experienceLevelId: "pemula",
    memberSince: "2025-09-07",
  },
]

export const STANDINGS: LeaderboardStanding[] = [
  { rank: 1, playerId: "hendra-wijaya", points: 18640, wins: 68, games: 214, delta: 120, streak: 6 },
  { rank: 2, playerId: "sari-lestari", points: 15420, wins: 55, games: 188, delta: 48, streak: 3 },
  { rank: 3, playerId: "lim-wie-hong", points: 14110, wins: 48, games: 171, delta: -16, streak: -1 },
  { rank: 4, playerId: "dewi-anggraini", points: 12840, wins: 44, games: 156, delta: 32, streak: 2 },
  { rank: 5, playerId: "bambang-sutopo", points: 10420, wins: 33, games: 121, delta: 8, streak: 1 },
  { rank: 6, playerId: "tan-mei-ling", points: 9180, wins: 31, games: 109, delta: 64, streak: 4 },
  { rank: 7, playerId: "yudi-kurniawan", points: 8060, wins: 24, games: 94, delta: -24, streak: -2 },
  { rank: 8, playerId: "rina-marlina", points: 6740, wins: 18, games: 72, delta: 16, streak: 1 },
  { rank: 9, playerId: "eko-prasetyo", points: 5120, wins: 14, games: 58, delta: 40, streak: 2 },
  { rank: 10, playerId: "wulan-dariati", points: 4380, wins: 11, games: 41, delta: -8, streak: -1 },
  { rank: 11, playerId: "andi-saputra", points: 2760, wins: 6, games: 27, delta: 24, streak: 2 },
  { rank: 12, playerId: "nurul-hidayati", points: 1490, wins: 3, games: 14, delta: 12, streak: 1 },
]

export const VENUES: HouseVenue[] = [
  {
    id: "rumah-jade-teluk",
    name: "Rumah Jade",
    district: "Teluk Betung",
    city: "Bandar Lampung",
    tables: 4,
    note: "Meja utama rumah. Kamis malam, empat angin tetap.",
  },
  {
    id: "paviliun-kedaton",
    name: "Paviliun Kedaton",
    district: "Kedaton",
    city: "Bandar Lampung",
    tables: 2,
    note: "Sesi sore. Jendela barat, lampu kuning, kopi tubruk.",
  },
  {
    id: "lingkar-enggal",
    name: "Lingkar Enggal",
    district: "Enggal",
    city: "Bandar Lampung",
    tables: 3,
    note: "Jumat malam setelah toko tutup. Meja cepat, ronde pendek.",
  },
  {
    id: "meja-pagi-metro",
    name: "Meja Pagi Metro",
    district: "Metro Pusat",
    city: "Metro",
    tables: 2,
    note: "Rabu pagi. Pemain Metro dan yang semalam di Bandar Lampung.",
  },
]

export const SESSIONS: HouseSession[] = [
  {
    id: "s-2026-11-19-teluk",
    title: "Kamis Malam Teluk",
    venueId: "rumah-jade-teluk",
    startedAt: "2026-11-19T19:30:00+07:00",
    rounds: 8,
    playerIds: ["hendra-wijaya", "sari-lestari", "lim-wie-hong", "dewi-anggraini"],
    winnerId: "hendra-wijaya",
    note: "Bang Hen menutup dua ronde beruntun dengan naga hijau.",
  },
  {
    id: "s-2026-11-16-kedaton",
    title: "Minggu Sore Kedaton",
    venueId: "paviliun-kedaton",
    startedAt: "2026-11-16T16:00:00+07:00",
    rounds: 6,
    playerIds: ["dewi-anggraini", "tan-mei-ling", "yudi-kurniawan", "rina-marlina"],
    winnerId: "dewi-anggraini",
    note: "Dek Dewi menang tipis. Ce Mei nyaris menyusul di ronde terakhir.",
  },
  {
    id: "s-2026-11-14-enggal",
    title: "Jumat Enggal",
    venueId: "lingkar-enggal",
    startedAt: "2026-11-14T20:00:00+07:00",
    rounds: 7,
    playerIds: ["tan-mei-ling", "bambang-sutopo", "eko-prasetyo", "wulan-dariati"],
    winnerId: "tan-mei-ling",
    note: "Ce Mei memotong bambu berurutan di ronde kelima.",
  },
  {
    id: "s-2026-11-12-metro",
    title: "Rabu Pagi Metro",
    venueId: "meja-pagi-metro",
    startedAt: "2026-11-12T09:00:00+07:00",
    rounds: 5,
    playerIds: ["wulan-dariati", "andi-saputra", "nurul-hidayati", "hendra-wijaya"],
    winnerId: "wulan-dariati",
    note: "Meja tamu. Wulan menahan Bang Hen sampai ronde empat.",
  },
]

export const HAND_LOGS: HandLog[] = [
  {
    id: "h-481",
    sessionId: "s-2026-11-19-teluk",
    playerId: "hendra-wijaya",
    won: true,
    pattern: "Pung Kehormatan",
    points: 64,
    tileIds: tileIds([
      "dragon-red",
      "dragon-red",
      "dragon-red",
      "wind-east",
      "wind-east",
      "wind-east",
      "bamboo-9",
      "bamboo-9",
      "bamboo-9",
      "dots-3",
      "dots-4",
      "dots-5",
      "dragon-green",
      "dragon-green",
    ]),
    winningTileId: tileId("dragon-green"),
    bonusTileIds: tileIds(["flower-plum", "season-spring"]),
    note: "Menang dari buangan Ko Hong. Bunga plum ikut kursi timur.",
  },
  {
    id: "h-482",
    sessionId: "s-2026-11-19-teluk",
    playerId: "sari-lestari",
    won: true,
    pattern: "Satu Warna Campur",
    points: 32,
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
      "wind-south",
      "wind-south",
      "wind-south",
      "dragon-white",
      "dragon-white",
    ]),
    winningTileId: tileId("dragon-white"),
    bonusTileIds: tileIds(["flower-orchid"]),
    note: "Chow karakter bersih, pung angin selatan.",
  },
  {
    id: "h-483",
    sessionId: "s-2026-11-19-teluk",
    playerId: "lim-wie-hong",
    won: false,
    pattern: "Tangan Belum Jadi",
    points: -32,
    tileIds: tileIds([
      "dots-1",
      "dots-1",
      "dots-1",
      "dots-2",
      "dots-3",
      "bamboo-7",
      "bamboo-8",
      "bamboo-9",
      "characters-5",
      "characters-5",
      "wind-west",
      "wind-west",
      "wind-north",
    ]),
    winningTileId: null,
    bonusTileIds: [],
    note: "Membuang naga hijau yang ditunggu Bang Hen.",
  },
  {
    id: "h-476",
    sessionId: "s-2026-11-16-kedaton",
    playerId: "dewi-anggraini",
    won: true,
    pattern: "Bambu Berurutan",
    points: 24,
    tileIds: tileIds([
      "bamboo-1",
      "bamboo-2",
      "bamboo-3",
      "bamboo-4",
      "bamboo-5",
      "bamboo-6",
      "bamboo-7",
      "bamboo-8",
      "bamboo-9",
      "dots-9",
      "dots-9",
      "dots-9",
      "wind-west",
      "wind-west",
    ]),
    winningTileId: tileId("bamboo-9"),
    bonusTileIds: tileIds(["season-summer"]),
    note: "Tiga chow bambu penuh, pung 9 bulat.",
  },
  {
    id: "h-470",
    sessionId: "s-2026-11-14-enggal",
    playerId: "tan-mei-ling",
    won: true,
    pattern: "Pung Angin Utara",
    points: 16,
    tileIds: tileIds([
      "dots-8",
      "dots-8",
      "dots-8",
      "dots-2",
      "dots-3",
      "dots-4",
      "characters-9",
      "characters-9",
      "characters-9",
      "wind-north",
      "wind-north",
      "wind-north",
      "dragon-red",
      "dragon-red",
    ]),
    winningTileId: tileId("wind-north"),
    bonusTileIds: tileIds(["flower-chrysanthemum"]),
    note: "Angin utara jatuh di buangan Eko.",
  },
  {
    id: "h-464",
    sessionId: "s-2026-11-12-metro",
    playerId: "wulan-dariati",
    won: true,
    pattern: "Tiga Naga Hijau",
    points: 48,
    tileIds: tileIds([
      "characters-1",
      "characters-1",
      "characters-1",
      "characters-5",
      "characters-5",
      "characters-5",
      "characters-9",
      "characters-9",
      "characters-9",
      "dragon-green",
      "dragon-green",
      "dragon-green",
      "bamboo-1",
      "bamboo-1",
    ]),
    winningTileId: tileId("dragon-green"),
    bonusTileIds: tileIds(["flower-bamboo", "season-autumn"]),
    note: "Terminal 1-5-9 karakter plus pung naga hijau.",
  },
]

export const DAILY_BONUS_TILES: DailyBonusTile[] = [
  {
    date: "2026-11-16",
    tileId: tileId("flower-orchid"),
    bonusPoints: 4,
    headline: "Anggrek Senin",
    note: "Bunga kursi dua. Pemain selatan mencatatnya dobel kalau menang.",
  },
  {
    date: "2026-11-17",
    tileId: tileId("season-winter"),
    bonusPoints: 4,
    headline: "Musim Dingin",
    note: "Musim keempat. Jarang keluar di meja pagi.",
  },
  {
    date: "2026-11-18",
    tileId: tileId("dragon-red"),
    bonusPoints: 8,
    headline: "Naga Merah",
    note: "Hari pung merah. Banyak yang menahan Chong terlalu lama.",
  },
  {
    date: "2026-11-19",
    tileId: tileId("dragon-green"),
    bonusPoints: 8,
    headline: "Naga Hijau",
    note: "Fa Cai — ubin rumah untuk Kamis Teluk.",
  },
  {
    date: "2026-11-20",
    tileId: tileId("wind-east"),
    bonusPoints: 4,
    headline: "Angin Timur",
    note: "Kursi dealer. Yang duduk timur mencatat angin ini sebagai pung mahal.",
  },
  {
    date: "2026-11-21",
    tileId: tileId("flower-bamboo"),
    bonusPoints: 4,
    headline: "Bunga Bambu",
    note: "Bunga keempat. Cocok untuk meja yang sudah penuh karakter.",
  },
  {
    date: "2026-11-22",
    tileId: tileId("season-spring"),
    bonusPoints: 4,
    headline: "Musim Semi",
    note: "Pembuka minggu. Satu salinan, tidak kembali ke dinding.",
  },
]

export const FEATURED_BONUS_DATE = "2026-11-19"

export function experienceForGames(games: number): ExperienceLevel {
  return (
    EXPERIENCE_LEVELS.find((level) => games >= level.minGames) ??
    EXPERIENCE_LEVELS[EXPERIENCE_LEVELS.length - 1]
  )
}

export function skillForPoints(points: number): SkillTier {
  return (
    SKILL_TIERS.find((tier) => points >= tier.minPoints) ??
    SKILL_TIERS[SKILL_TIERS.length - 1]
  )
}

function syntheticPlayer(id: string): JadePlayer {
  const raw = id.startsWith("guest:")
    ? id.slice("guest:".length).split(":")[0] ?? "Guest"
    : id.startsWith("guest-")
      ? id.slice("guest-".length)
      : id
  let label = raw
  try {
    label = decodeURIComponent(raw)
  } catch {
    /* keep raw */
  }
  label = label.replace(/-/g, " ").trim() || "Guest"
  const nickname = label.split(/\s+/)[0] ?? "Guest"
  return {
    id,
    name: label,
    nickname,
    initials: nickname.slice(0, 2).toUpperCase(),
    city: "Bandar Lampung",
    district: "Guest",
    house: "Walk-in",
    experienceLevelId: "pemula",
    memberSince: new Date().toISOString().slice(0, 10),
  }
}

/** Resolves seeded players, then guest / unknown live-table seats without throwing. */
export function getPlayer(id: string): JadePlayer {
  const player = PLAYERS.find((entry) => entry.id === id)
  if (player) return player
  return syntheticPlayer(id)
}

export function getVenue(id: string): HouseVenue {
  const venue = VENUES.find((entry) => entry.id === id)
  if (!venue) throw new Error(`jade-data: unknown venue "${id}"`)
  return venue
}

export function getSession(id: string): HouseSession {
  const session = SESSIONS.find((entry) => entry.id === id)
  if (!session) throw new Error(`jade-data: unknown session "${id}"`)
  return session
}

export function getLeaderboard(): LeaderboardRow[] {
  return STANDINGS.map((standing) => {
    const player = getPlayer(standing.playerId)
    return {
      ...standing,
      player,
      skillTier: skillForPoints(standing.points),
      experienceLevel: experienceForGames(standing.games),
    }
  }).sort((a, b) => a.rank - b.rank)
}

export function handsForSession(sessionId: string): HandLog[] {
  return HAND_LOGS.filter((hand) => hand.sessionId === sessionId)
}

export function featuredDailyBonus(): DailyBonusTile {
  const featured = DAILY_BONUS_TILES.find((entry) => entry.date === FEATURED_BONUS_DATE)
  if (!featured) throw new Error("jade-data: missing featured daily bonus")
  return featured
}

// EDIT HERE — schedule meets live in jade-schedule.ts (re-exported for the booking demo)
export {
  DEMO_BOOKER,
  SCHEDULE_VENUES,
  UPCOMING_MEETS,
  formatFeeIdr,
  meetIsFull,
  meetSeatsFilled,
  type ScheduleLevel,
  type ScheduleLevelFilter,
  type ScheduleRosterPlayer,
  type ScheduledMeet,
} from "@/lib/mock/jade-schedule"

function assertMock() {
  if (STANDINGS.length !== 12) {
    throw new Error("jade-data: leaderboard must list 12 players")
  }
  const seen = new Set<string>()
  let previousPoints = Number.POSITIVE_INFINITY
  for (const standing of STANDINGS) {
    if (seen.has(standing.playerId)) {
      throw new Error(`jade-data: duplicate standing ${standing.playerId}`)
    }
    seen.add(standing.playerId)
    if (standing.points >= previousPoints) {
      throw new Error(`jade-data: standings must be ordered by points`)
    }
    previousPoints = standing.points
    const player = getPlayer(standing.playerId)
    const tier = skillForPoints(standing.points)
    const level = experienceForGames(standing.games)
    if (player.experienceLevelId !== level.id) {
      throw new Error(
        `jade-data: ${player.id} experience should be ${level.id}`,
      )
    }
    if (standing.wins > standing.games) {
      throw new Error(`jade-data: ${player.id} has more wins than games`)
    }
    void tier
  }
  if (seen.size !== PLAYERS.length) {
    throw new Error("jade-data: every player needs a standing")
  }
  for (const session of SESSIONS) {
    getVenue(session.venueId)
    if (!session.playerIds.includes(session.winnerId)) {
      throw new Error(`jade-data: winner missing from ${session.id}`)
    }
    for (const playerId of session.playerIds) getPlayer(playerId)
  }
  for (const hand of HAND_LOGS) {
    getSession(hand.sessionId)
    getPlayer(hand.playerId)
    if (hand.won && hand.tileIds.length !== 14) {
      throw new Error(`jade-data: winning hand ${hand.id} must have 14 tiles`)
    }
    if (hand.winningTileId && !hand.tileIds.includes(hand.winningTileId)) {
      throw new Error(`jade-data: winning tile missing from ${hand.id}`)
    }
  }
}

assertMock()
