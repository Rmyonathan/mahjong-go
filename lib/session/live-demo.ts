import type { FormResult } from "@/lib/mock/jade-board"
import { getJadeSeatDeltas } from "@/lib/mahjong/payout"

export type LiveBoard = "beginner" | "advanced" | "mcr"
export type LiveWind = "east" | "south" | "west" | "north"
export type WinMethod = "self-draw" | "discard"

export const LIVE_STORAGE_KEY = "jade_live_session"

// EDIT HERE — default session title when going live from a meet
export const DEFAULT_SESSION_TITLE = "Friday Night Jade Table"

// EDIT HERE — starting net for every seat when a table opens
export const STARTING_POINTS = 0

/**
 * @deprecated Jade Miles are absolute from FAAN_TO_BASE_POINTS (no × unit).
 * Kept so older UI copy compiles; always 1.
 */
export const POINT_UNIT = 1

// EDIT HERE — unused under Jade §6 (self-draw is fixed 6×B)
export const SELF_DRAW_MULTIPLIER = 1

export const WIND_META: Record<
  LiveWind,
  { label: string; badge: string; order: number }
> = {
  east: { label: "Tong", badge: "東", order: 0 },
  south: { label: "Nan", badge: "南", order: 1 },
  west: { label: "Xi", badge: "西", order: 2 },
  north: { label: "Pei", badge: "北", order: 3 },
}

export const QUICK_SELECT_PLAYERS = [
  { id: "guest-roze", name: "Roze", nickname: "Roze" },
  { id: "guest-kathleen", name: "Kathleen", nickname: "Kathleen" },
  { id: "guest-yudhis", name: "Yudhis", nickname: "Yudhis" },
  { id: "guest-chilwin", name: "Chilwin", nickname: "Chilwin" },
] as const

export interface DemoWinningHand {
  id: string
  name: string
  tileIds: string[]
  winningTileId: string
  combos: { label: string; fan: number }[]
  // EDIT HERE — preset winner points for this demo hand (before method adjust)
  basePoints: number
}

/** Three switchable demo hands for the camera scan review step. */
export const DEMO_WINNING_HANDS: DemoWinningHand[] = [
  {
    id: "all-simples-kong",
    name: "All Simples + Kong",
    tileIds: [
      "dots-2",
      "dots-2",
      "dots-2",
      "dots-2",
      "bamboo-3",
      "bamboo-4",
      "bamboo-5",
      "characters-5",
      "characters-6",
      "characters-7",
      "dots-6",
      "dots-7",
      "dots-8",
      "bamboo-8",
    ],
    winningTileId: "bamboo-8",
    combos: [
      { label: "All Simples", fan: 2 },
      { label: "Kong", fan: 1 },
      { label: "All Chows", fan: 2 },
    ],
    // EDIT HERE
    basePoints: 3600,
  },
  {
    id: "half-flush-seat-wind",
    name: "Half Flush + Seat Wind",
    tileIds: [
      "characters-2",
      "characters-3",
      "characters-4",
      "characters-5",
      "characters-5",
      "characters-5",
      "characters-7",
      "characters-8",
      "characters-9",
      "wind-east",
      "wind-east",
      "wind-east",
      "dragon-green",
      "dragon-green",
    ],
    winningTileId: "dragon-green",
    combos: [
      { label: "Half Flush", fan: 6 },
      { label: "Seat Wind", fan: 2 },
      { label: "Dragon Pung", fan: 2 },
    ],
    // EDIT HERE
    basePoints: 4800,
  },
  {
    id: "pure-straight",
    name: "Pure Straight",
    tileIds: [
      "bamboo-1",
      "bamboo-2",
      "bamboo-3",
      "bamboo-4",
      "bamboo-5",
      "bamboo-6",
      "bamboo-7",
      "bamboo-8",
      "bamboo-9",
      "dots-3",
      "dots-3",
      "dots-3",
      "characters-4",
      "characters-4",
    ],
    winningTileId: "characters-4",
    combos: [
      { label: "Pure Straight", fan: 8 },
      { label: "Pung of Terminals", fan: 1 },
    ],
    // EDIT HERE
    basePoints: 2400,
  },
]

export interface LiveSeat {
  wind: LiveWind
  playerId: string | null
  name: string
  nickname: string
  initials?: string
  avatarUrl?: string | null
  frameId?: string
  net: number
  wins: number
  dealtIn: number
  selfDraw: number
  form: FormResult[]
}

export interface LiveHand {
  id: string
  handNo: number
  winnerSeatIndex: number
  winnerName?: string
  method: WinMethod
  dealtBySeatIndex: number | null
  dealtName?: string
  seatNames?: string[]
  tileIds: string[]
  winningTileId: string
  combos: { label: string; fan: number }[]
  points: number
  deltas: number[]
  demoHandId?: string
}

export interface RetiredRaceSeries {
  label: string
  values: Array<number | null>
}

export interface LiveSession {
  id: string
  title: string
  board: LiveBoard
  /** Chicken Hand vs Jade HK — same presets as /scan */
  scoringRuleset?: "chicken" | "jade-hk"
  seatCount: 3 | 4
  seats: LiveSeat[]
  hands: LiveHand[]
  /** Running totals per seat, index 0 = start */
  race: number[][]
  retiredRaces?: RetiredRaceSeries[]
  startedAt: string
  endedAt: string | null
  status: "live" | "finished"
  handNumber: number
  dealerSeatIndex: number
  /** Current table round wind (Tong → Nan → Xi → Pei after 1 full putaran). */
  roundWind?: LiveWind
  /** True once the captain confirmed initial Tong/Nan/Xi/Pei order (or after hand 1). */
  sessionStarted?: boolean
  /** Free / Pro / Club auto-end metadata (from API serialize). */
  durationTier?: "club" | "pro" | "free"
  maxHours?: number | null
  expiresAt?: string | null
}

export interface SessionSetupInput {
  title: string
  board: LiveBoard
  seatCount: 3 | 4
  seats: Array<{
    wind: LiveWind
    playerId: string | null
    name: string
    nickname: string
  }>
}

export function windsForSeatCount(seatCount: 3 | 4): LiveWind[] {
  return seatCount === 3
    ? ["east", "south", "west"]
    : ["east", "south", "west", "north"]
}

export function createLiveSession(input: SessionSetupInput): LiveSession {
  const seats: LiveSeat[] = input.seats.map((seat) => ({
    ...seat,
    net: STARTING_POINTS,
    wins: 0,
    dealtIn: 0,
    selfDraw: 0,
    form: [],
  }))

  return {
    id: `live-${Date.now()}`,
    title: input.title.trim() || DEFAULT_SESSION_TITLE,
    board: input.board,
    seatCount: input.seatCount,
    seats,
    hands: [],
    race: seats.map(() => [STARTING_POINTS]),
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "live",
    handNumber: 1,
    dealerSeatIndex: 0,
  }
}

/**
 * Zero-sum seat deltas.
 * Prefer passing `totalFan` so Jade §6 math (2B/1B/1B vs 2B×3) is used.
 * If only `winnerPoints` is set (legacy), falls back to equal split / full shooter.
 */
export function computePayoutDeltas(options: {
  seatCount: number
  winnerSeatIndex: number
  method: WinMethod
  dealtBySeatIndex: number | null
  winnerPoints?: number
  /** When set, uses official Jade HK payout from Faan. */
  totalFan?: number
}): number[] {
  const {
    seatCount,
    winnerSeatIndex,
    method,
    dealtBySeatIndex,
    winnerPoints,
    totalFan,
  } = options

  if (typeof totalFan === "number") {
    return getJadeSeatDeltas({
      seatCount,
      winnerSeatIndex,
      method,
      dealtBySeatIndex,
      totalFan,
    })
  }

  const deltas = Array.from({ length: seatCount }, () => 0)
  const win = Math.max(0, Math.round(winnerPoints ?? 0))
  deltas[winnerSeatIndex] = win

  if (method === "discard" && dealtBySeatIndex != null) {
    // Legacy full-shooter fallback
    deltas[dealtBySeatIndex] = -win
    return deltas
  }

  const losers = Array.from({ length: seatCount }, (_, i) => i).filter(
    (i) => i !== winnerSeatIndex,
  )
  const share = Math.floor(win / losers.length)
  let remainder = win - share * losers.length
  for (const index of losers) {
    deltas[index] = -(share + (remainder > 0 ? 1 : 0))
    if (remainder > 0) remainder -= 1
  }
  return deltas
}

export function applyHandToSession(
  session: LiveSession,
  hand: Omit<LiveHand, "id" | "handNo" | "deltas"> & { deltas?: number[] },
): LiveSession {
  const deltas =
    hand.deltas ??
    computePayoutDeltas({
      seatCount: session.seats.length,
      winnerSeatIndex: hand.winnerSeatIndex,
      method: hand.method,
      dealtBySeatIndex: hand.dealtBySeatIndex,
      winnerPoints: hand.points,
    })

  const seats = session.seats.map((seat, index) => {
    const delta = deltas[index] ?? 0
    const won = index === hand.winnerSeatIndex
    const dealt =
      hand.method === "discard" && index === hand.dealtBySeatIndex
    const formEntry: FormResult = won ? "W" : delta < 0 ? "L" : "D"
    return {
      ...seat,
      net: seat.net + delta,
      wins: seat.wins + (won ? 1 : 0),
      dealtIn: seat.dealtIn + (dealt ? 1 : 0),
      selfDraw: seat.selfDraw + (won && hand.method === "self-draw" ? 1 : 0),
      form: [...seat.form, formEntry].slice(-8),
    }
  })

  const race = session.race.map((series, index) => [
    ...series,
    seats[index]?.net ?? 0,
  ])

  const logged: LiveHand = {
    id: `hand-${Date.now()}-${session.handNumber}`,
    handNo: session.handNumber,
    winnerSeatIndex: hand.winnerSeatIndex,
    method: hand.method,
    dealtBySeatIndex: hand.dealtBySeatIndex,
    tileIds: hand.tileIds,
    winningTileId: hand.winningTileId,
    combos: hand.combos,
    points: hand.points,
    deltas,
    demoHandId: hand.demoHandId,
  }

  return {
    ...session,
    seats,
    hands: [logged, ...session.hands],
    race,
    handNumber: session.handNumber + 1,
    dealerSeatIndex: (session.dealerSeatIndex + 1) % session.seats.length,
  }
}

export function applyDrawHand(session: LiveSession): LiveSession {
  const deltas = session.seats.map(() => 0)
  const seats = session.seats.map((seat) => ({
    ...seat,
    form: [...seat.form, "D" as FormResult].slice(-8),
  }))
  const race = session.race.map((series, index) => [
    ...series,
    seats[index]?.net ?? 0,
  ])
  const logged: LiveHand = {
    id: `draw-${Date.now()}`,
    handNo: session.handNumber,
    winnerSeatIndex: -1,
    method: "self-draw",
    dealtBySeatIndex: null,
    tileIds: [],
    winningTileId: "",
    combos: [{ label: "Draw", fan: 0 }],
    points: 0,
    deltas,
  }
  return {
    ...session,
    seats,
    hands: [logged, ...session.hands],
    race,
    handNumber: session.handNumber + 1,
    dealerSeatIndex: (session.dealerSeatIndex + 1) % session.seats.length,
  }
}

export function endLiveSession(session: LiveSession): LiveSession {
  return {
    ...session,
    status: "finished",
    endedAt: new Date().toISOString(),
  }
}

/** @deprecated Live tables persist via `/api/sessions` (Postgres). Kept for emergency local demos only. */
export function saveLiveSession(session: LiveSession) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(session))
}

/** @deprecated Prefer GET `/api/sessions/[id]`. */
export function loadLiveSession(): LiveSession | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(LIVE_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LiveSession
  } catch {
    return null
  }
}

/** @deprecated Prefer finishing via POST `/api/sessions/[id]/finish`. */
export function clearLiveSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(LIVE_STORAGE_KEY)
}

export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}

export function roundBadge(session: LiveSession) {
  const wind = WIND_META[session.roundWind ?? "east"]
  return `${wind.badge} ${wind.label.toUpperCase()} ROUND`
}
