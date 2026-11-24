// EDIT HERE — default venue when hosts create a meet
export const DEFAULT_MEET_LOCATION = "Teluk Betung · Jade Table"

// EDIT HERE — default seat fee in IDR
export const DEFAULT_MEET_FEE_IDR = 50_000

// EDIT HERE — default Pro early-bird hours from meet creation
export { DEFAULT_PRO_EARLY_BIRD_HOURS } from "@/lib/membership"

export type ApiMeetBoardType = "BEGINNER" | "ADVANCED" | "MCR" | "GUIDED"
export type ApiMeetStatus = "OPEN" | "FULL" | "COMPLETED"
export type ApiBookingStatus = "PENDING" | "CONFIRMED" | "WAITLIST" | "CANCELLED"
export type ApiPaymentMethod = "QRIS" | "VENUE"

export interface ApiRosterPlayer {
  bookingId: string
  userId: string
  name: string
  nickname: string
  badge: string
  rating: number
  levelId: string
  seatNumber: number | null
  isYou: boolean
}

export interface ApiPendingRequest {
  bookingId: string
  userId: string
  name: string
  nickname: string
  paymentMethod: ApiPaymentMethod | null
  createdAt: string
}

export interface ApiYourBooking {
  id: string
  status: ApiBookingStatus
  seatNumber: number | null
  paymentMethod: ApiPaymentMethod | null
  checkInCode: string | null
}

export interface ApiMeet {
  id: string
  title: string
  dateLabel: string
  startTime: string
  endTime: string
  whenLabel: string
  startsAt: string
  endsAt: string
  location: string
  boardType: ApiMeetBoardType
  maxSeats: number
  tables: number
  feeIdr: number
  proEarlyBirdUntil: string | null
  proOnly: boolean
  status: ApiMeetStatus
  visibility: "PUBLIC" | "PRIVATE"
  inviteCode: string | null
  invitePath: string | null
  hostId: string | null
  hostName: string | null
  hostRole: "ADMIN" | "MEMBER" | null
  isClubTable: boolean
  captainId: string | null
  captainName: string | null
  scanLimit: number | null
  scanLabel: string
  confirmedCount: number
  pendingCount: number
  waitlistCount: number
  seatsFilled: number
  isFull: boolean
  earlyBirdActive: boolean
  isHost: boolean
  canLaunchLive: boolean
  roster: ApiRosterPlayer[]
  pendingRequests: ApiPendingRequest[]
  yourBooking: ApiYourBooking | null
}

export interface ScheduleViewer {
  id: string
  name: string
  role: "ADMIN" | "MEMBER"
  membershipTier?: "FREE" | "PRO"
}

export function formatFeeIdr(amount: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
  return `${m}m ${String(s).padStart(2, "0")}s`
}

export function boardLabel(board: ApiMeetBoardType) {
  switch (board) {
    case "BEGINNER":
      return "Beginner"
    case "ADVANCED":
      return "Advanced"
    case "MCR":
      return "Advanced MCR"
    case "GUIDED":
      return "Guided · Mentor"
  }
}

export type DateFilter = "all" | "today" | "tomorrow" | "week" | "later"

export function ymdJakarta(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function addDaysYmd(ymd: string, days: number) {
  const base = new Date(`${ymd}T12:00:00+07:00`)
  base.setDate(base.getDate() + days)
  return ymdJakarta(base)
}

/** Reclub-style horizontal date chips (today + next N days). */
export function buildScheduleDateStrip(days = 14) {
  const today = ymdJakarta(new Date())
  return Array.from({ length: days }, (_, index) => {
    const ymd = addDaysYmd(today, index)
    const date = new Date(`${ymd}T12:00:00+07:00`)
    const weekday = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      timeZone: "Asia/Jakarta",
    })
      .format(date)
      .toUpperCase()
    const day = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date)
    return {
      ymd,
      label: `${weekday} ${day}`,
      isToday: index === 0,
    }
  })
}

/** Reclub-style date buckets for the schedule feed. */
export function meetMatchesDateFilter(startsAtIso: string, filter: DateFilter) {
  if (filter === "all") return true
  const meetYmd = ymdJakarta(new Date(startsAtIso))
  const today = ymdJakarta(new Date())
  const tomorrow = addDaysYmd(today, 1)
  const weekEnd = addDaysYmd(today, 6)

  if (filter === "today") return meetYmd === today
  if (filter === "tomorrow") return meetYmd === tomorrow
  if (filter === "week") return meetYmd >= today && meetYmd <= weekEnd
  return meetYmd > weekEnd
}

export function meetMatchesYmd(startsAtIso: string, ymd: string | null) {
  if (!ymd) return true
  return ymdJakarta(new Date(startsAtIso)) === ymd
}

/** Pull `JADE-XXXX` from a raw code or a pasted invite URL. */
export function extractInviteCode(raw: string) {
  const text = raw.trim()
  if (!text) return null
  const fromQuery = text.match(/[?&]code=([^&#\s]+)/i)
  if (fromQuery?.[1]) {
    try {
      return decodeURIComponent(fromQuery[1]).trim().toUpperCase()
    } catch {
      return fromQuery[1].trim().toUpperCase()
    }
  }
  const match = text.toUpperCase().match(/\bJADE-[A-Z0-9]+\b/)
  return match?.[0] ?? null
}

const INVITE_STORAGE_KEY = "jade_invite_codes"

export function uniqueInviteCodes(codes: Array<string | null | undefined>) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of codes) {
    const code = raw ? extractInviteCode(raw) ?? raw.trim().toUpperCase() : null
    if (!code || seen.has(code)) continue
    seen.add(code)
    out.push(code)
  }
  return out
}

/** Codes unlocked on this device — private tables stay visible after refresh. */
export function readSavedInviteCodes(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(INVITE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return uniqueInviteCodes(parsed.map((item) => String(item)))
  } catch {
    return []
  }
}

export function writeSavedInviteCodes(codes: string[]) {
  if (typeof window === "undefined") return
  const next = uniqueInviteCodes(codes)
  window.localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(next))
}
