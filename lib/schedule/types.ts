// EDIT HERE — default venue when hosts create a meet
export const DEFAULT_MEET_LOCATION = "Teluk Betung · Jade Table"

// EDIT HERE — default seat fee in IDR
export const DEFAULT_MEET_FEE_IDR = 50_000

// EDIT HERE — default Pro early-bird hours from meet creation
export { DEFAULT_PRO_EARLY_BIRD_HOURS } from "@/lib/membership"

export type ApiMeetBoardType = "BEGINNER" | "ADVANCED" | "MCR" | "GUIDED"
export type ApiMeetStatus = "OPEN" | "FULL" | "COMPLETED"
export type ApiBookingStatus = "CONFIRMED" | "WAITLIST" | "CANCELLED"
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
  hostId: string | null
  confirmedCount: number
  waitlistCount: number
  seatsFilled: number
  isFull: boolean
  earlyBirdActive: boolean
  roster: ApiRosterPlayer[]
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
  // later = after this week
  return meetYmd > weekEnd
}
