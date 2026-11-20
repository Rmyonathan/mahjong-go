/**
 * Upcoming Jade Mahjong meets for Schedule & Booking.
 * Kept beside jade-data so scoring mocks stay untouched.
 */

export type ScheduleLevelFilter =
  | "all"
  | "beginner"
  | "advanced-mcr"
  | "guided"
  | "open"

export type ScheduleLevel =
  | "ALL LEVELS"
  | "BEGINNER"
  | "ADVANCED MCR"
  | "GUIDED · MENTOR"

export interface ScheduleRosterPlayer {
  id: string
  name: string
  nickname: string
  /** Display skill rating for the chip row */
  rating: number
  /** Compact tile-style badge glyph */
  badge: string
  isYou?: boolean
}

export interface ScheduledMeet {
  id: string
  title: string
  /** Monospace strip, e.g. Fri, 20 Nov · 19:00–22:00 WIB */
  whenLabel: string
  startsAt: string
  endsAt: string
  location: string
  level: ScheduleLevel
  /** Used by schedule filters; `open` only appears under All */
  levelFilter: Exclude<ScheduleLevelFilter, "all">
  /** EDIT HERE — fee in IDR rupiah */
  feeIdr: number
  tables: number
  /** EDIT HERE — hard seat cap */
  seatCap: number
  confirmed: ScheduleRosterPlayer[]
  waitlist: ScheduleRosterPlayer[]
  /** Pro members can book before general opens */
  proEarlyBird: boolean
  /**
   * EDIT HERE — minutes of Pro-only window from first page visit
   * (general booking unlocks after this countdown).
   */
  proEarlyBirdMinutes: number
  /** Entire meet is Pro-only (no free-member booking) */
  proOnly?: boolean
  /** Host-created meets from /session/new */
  hostCreated?: boolean
}

// EDIT HERE — venue chips on “schedule for later”
export const SCHEDULE_VENUES = [
  "Teluk Betung · Jade Table",
  "Jade Mahjong Lounge, Bandar Lampung",
  "Paviliun Kedaton",
  "Lingkar Enggal",
  "Meja Pagi Metro",
] as const

// EDIT HERE — demo identity inserted when the current user books a seat
export const DEMO_BOOKER: ScheduleRosterPlayer = {
  id: "you-yonathan",
  name: "You (Yonathan)",
  nickname: "Yonathan",
  rating: 1400,
  badge: "ヨ",
  isYou: true,
}

// EDIT HERE — upcoming Bandar Lampung meets (4 sessions)
export const UPCOMING_MEETS: ScheduledMeet[] = [
  {
    id: "meet-friday-league",
    title: "Friday Night Jade League",
    whenLabel: "Fri, 20 Nov · 19:00–22:00 WIB",
    startsAt: "2026-11-20T19:00:00+07:00",
    endsAt: "2026-11-20T22:00:00+07:00",
    location: "Jade Mahjong Lounge, Bandar Lampung",
    level: "ALL LEVELS",
    levelFilter: "open",
    feeIdr: 50_000,
    tables: 3,
    seatCap: 12,
    proEarlyBird: false,
    proEarlyBirdMinutes: 0,
    confirmed: [
      { id: "guest-roze", name: "Roze", nickname: "Roze", rating: 1640, badge: "東" },
      { id: "guest-kathleen", name: "Kathleen", nickname: "Kathleen", rating: 1580, badge: "南" },
      { id: "guest-yudhis", name: "Yudhis", nickname: "Yudhis", rating: 1510, badge: "西" },
      { id: "guest-chilwin", name: "Chilwin", nickname: "Chilwin", rating: 1490, badge: "北" },
      { id: "hendra-wijaya", name: "Hendra Wijaya", nickname: "Bang Hen", rating: 1720, badge: "玉" },
      { id: "sari-lestari", name: "Sari Lestari", nickname: "Mbak Sari", rating: 1680, badge: "緑" },
      { id: "lim-wie-hong", name: "Lim Wie Hong", nickname: "Ko Hong", rating: 1610, badge: "紅" },
      { id: "dewi-anggraini", name: "Dewi Anggraini", nickname: "Dek Dewi", rating: 1550, badge: "白" },
      { id: "yudi-kurniawan", name: "Yudi Kurniawan", nickname: "Yudi", rating: 1470, badge: "竹" },
    ],
    waitlist: [],
  },
  {
    id: "meet-saturday-guided",
    title: "Saturday Afternoon Beginner Guided Table",
    whenLabel: "Sat, 21 Nov · 14:00–17:00 WIB",
    startsAt: "2026-11-21T14:00:00+07:00",
    endsAt: "2026-11-21T17:00:00+07:00",
    location: "Jade Mahjong Lounge, Bandar Lampung",
    level: "GUIDED · MENTOR",
    levelFilter: "guided",
    feeIdr: 75_000,
    tables: 1,
    seatCap: 4,
    proEarlyBird: false,
    proEarlyBirdMinutes: 0,
    confirmed: [
      { id: "rina-marlina", name: "Rina Marlina", nickname: "Rina", rating: 1320, badge: "一" },
      { id: "andi-saputra", name: "Andi Saputra", nickname: "Andi", rating: 1280, badge: "二" },
      { id: "nurul-hidayati", name: "Nurul Hidayati", nickname: "Nurul", rating: 1250, badge: "三" },
      { id: "wulan-dariati", name: "Wulan Dariati", nickname: "Wulan", rating: 1210, badge: "四" },
    ],
    waitlist: [
      { id: "eko-prasetyo", name: "Eko Prasetyo", nickname: "Eko", rating: 1180, badge: "五" },
      { id: "bambang-sutopo", name: "Bambang Sutopo", nickname: "Pak Bambang", rating: 1350, badge: "六" },
    ],
  },
  {
    id: "meet-sunday-mcr",
    title: "Sunday Competitive MCR Ranking",
    whenLabel: "Sun, 22 Nov · 18:30–21:30 WIB",
    startsAt: "2026-11-22T18:30:00+07:00",
    endsAt: "2026-11-22T21:30:00+07:00",
    location: "Jade Mahjong Lounge, Bandar Lampung",
    level: "ADVANCED MCR",
    levelFilter: "advanced-mcr",
    feeIdr: 60_000,
    tables: 2,
    seatCap: 8,
    proEarlyBird: true,
    // EDIT HERE — demo shows ~1h 42m Pro window
    proEarlyBirdMinutes: 102,
    confirmed: [
      { id: "hendra-wijaya", name: "Hendra Wijaya", nickname: "Bang Hen", rating: 1720, badge: "玉" },
      { id: "sari-lestari", name: "Sari Lestari", nickname: "Mbak Sari", rating: 1680, badge: "緑" },
      { id: "guest-roze", name: "Roze", nickname: "Roze", rating: 1640, badge: "東" },
    ],
    waitlist: [],
  },
  {
    id: "meet-tuesday-chill",
    title: "Tuesday Chill Tiles & Coffee",
    whenLabel: "Tue, 24 Nov · 19:00–21:30 WIB",
    startsAt: "2026-11-24T19:00:00+07:00",
    endsAt: "2026-11-24T21:30:00+07:00",
    location: "Jade Mahjong Lounge, Bandar Lampung",
    level: "BEGINNER",
    levelFilter: "beginner",
    feeIdr: 40_000,
    tables: 2,
    seatCap: 8,
    proEarlyBird: false,
    proEarlyBirdMinutes: 0,
    confirmed: [
      { id: "guest-kathleen", name: "Kathleen", nickname: "Kathleen", rating: 1580, badge: "南" },
      { id: "guest-chilwin", name: "Chilwin", nickname: "Chilwin", rating: 1490, badge: "北" },
      { id: "tan-mei-ling", name: "Tan Mei Ling", nickname: "Ce Mei", rating: 1420, badge: "梅" },
      { id: "yudi-kurniawan", name: "Yudi Kurniawan", nickname: "Yudi", rating: 1470, badge: "竹" },
    ],
    waitlist: [],
  },
]

export function formatFeeIdr(amount: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`
}

export function meetSeatsFilled(meet: ScheduledMeet) {
  return meet.confirmed.length
}

export function meetIsFull(meet: ScheduledMeet) {
  return meet.confirmed.length >= meet.seatCap
}
