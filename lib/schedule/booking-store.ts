import {
  DEMO_BOOKER,
  UPCOMING_MEETS,
  type ScheduledMeet,
} from "@/lib/mock/jade-schedule"

export const BOOKING_STORAGE_KEY = "jade_schedule_bookings"
export const MEMBER_VIEW_KEY = "jade_schedule_member_view"
export const EARLY_BIRD_CLOCK_KEY = "jade_schedule_earlybird_clock"

export type MemberView = "free" | "pro"

export type PaymentMethod = "qris" | "venue"

export interface MeetBookingState {
  meetId: string
  /** Seat number assigned when you confirmed (1-based) */
  yourSeatNumber: number | null
  onWaitlist: boolean
  paymentMethod: PaymentMethod | null
  checkInCode: string | null
  bookedAt: string | null
}

export interface ScheduleBookingStore {
  meets: ScheduledMeet[]
  bookings: Record<string, MeetBookingState>
  memberView: MemberView
  /** epoch ms when Pro early-bird clocks were started */
  earlyBirdStartedAt: number
}

function cloneMeets(): ScheduledMeet[] {
  return UPCOMING_MEETS.map((meet) => ({
    ...meet,
    confirmed: meet.confirmed.map((player) => ({ ...player })),
    waitlist: meet.waitlist.map((player) => ({ ...player })),
  }))
}

export function emptyBooking(meetId: string): MeetBookingState {
  return {
    meetId,
    yourSeatNumber: null,
    onWaitlist: false,
    paymentMethod: null,
    checkInCode: null,
    bookedAt: null,
  }
}

export function createInitialStore(): ScheduleBookingStore {
  const meets = cloneMeets()
  const bookings: Record<string, MeetBookingState> = {}
  for (const meet of meets) {
    bookings[meet.id] = emptyBooking(meet.id)
  }
  return {
    meets,
    bookings,
    memberView: "free",
    earlyBirdStartedAt: Date.now(),
  }
}

export function loadBookingStore(): ScheduleBookingStore {
  if (typeof window === "undefined") return createInitialStore()
  try {
    const raw = window.localStorage.getItem(BOOKING_STORAGE_KEY)
    if (!raw) {
      const initial = createInitialStore()
      saveBookingStore(initial)
      return initial
    }
    const parsed = JSON.parse(raw) as ScheduleBookingStore
    // Re-hydrate base catalog if new meets were added in code
    const base = cloneMeets()
    const baseIds = new Set(base.map((meet) => meet.id))
    const mergedBase = base.map((meet) => {
      const saved = parsed.meets.find((entry) => entry.id === meet.id)
      return saved
        ? {
            ...meet,
            confirmed: saved.confirmed,
            waitlist: saved.waitlist,
            proOnly: saved.proOnly ?? meet.proOnly,
            hostCreated: saved.hostCreated,
          }
        : meet
    })
    // Keep host-created meets published from /session/new
    const custom = parsed.meets.filter((meet) => !baseIds.has(meet.id))
    const meets = [...mergedBase, ...custom].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    const bookings: Record<string, MeetBookingState> = {}
    for (const meet of meets) {
      bookings[meet.id] = parsed.bookings[meet.id] ?? emptyBooking(meet.id)
    }
    return {
      meets,
      bookings,
      memberView: parsed.memberView === "pro" ? "pro" : "free",
      earlyBirdStartedAt: parsed.earlyBirdStartedAt || Date.now(),
    }
  } catch {
    return createInitialStore()
  }
}

export function saveBookingStore(store: ScheduleBookingStore) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(store))
}

export function earlyBirdRemainingMs(
  meet: ScheduledMeet,
  earlyBirdStartedAt: number,
  now = Date.now(),
) {
  if (!meet.proEarlyBird) return 0
  const endsAt = earlyBirdStartedAt + meet.proEarlyBirdMinutes * 60_000
  return Math.max(0, endsAt - now)
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
  return `${m}m ${String(s).padStart(2, "0")}s`
}

export function canBookMeet(
  meet: ScheduledMeet,
  memberView: MemberView,
  earlyBirdStartedAt: number,
  now = Date.now(),
) {
  if (meet.proOnly) return memberView === "pro"
  if (meet.proEarlyBird && earlyBirdRemainingMs(meet, earlyBirdStartedAt, now) > 0) {
    return memberView === "pro"
  }
  return true
}

export interface CreateMeetInput {
  title: string
  date: string
  startTime: string
  endTime: string
  location: string
  level: ScheduledMeet["level"]
  levelFilter: ScheduledMeet["levelFilter"]
  feeIdr: number
  tables: number
  seatCap: number
  proOnly: boolean
}

export function buildWhenLabel(date: string, startTime: string, endTime: string) {
  const start = new Date(`${date}T${startTime}:00+07:00`)
  const end = new Date(`${date}T${endTime}:00+07:00`)
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(start)
  const startLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(start)
  const endLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(end)
  return `${day} · ${startLabel}–${endLabel} WIB`
}

export function publishMeet(
  store: ScheduleBookingStore,
  input: CreateMeetInput,
): { store: ScheduleBookingStore; meet: ScheduledMeet } {
  const id = `meet-host-${Date.now()}`
  const startsAt = `${input.date}T${input.startTime}:00+07:00`
  const endsAt = `${input.date}T${input.endTime}:00+07:00`
  const meet: ScheduledMeet = {
    id,
    title: input.title.trim() || "Jade Table",
    whenLabel: buildWhenLabel(input.date, input.startTime, input.endTime),
    startsAt,
    endsAt,
    location: input.location.trim() || "Bandar Lampung",
    level: input.level,
    levelFilter: input.levelFilter,
    feeIdr: input.feeIdr,
    tables: input.tables,
    seatCap: input.seatCap,
    confirmed: [],
    waitlist: [],
    proEarlyBird: false,
    proEarlyBirdMinutes: 0,
    proOnly: input.proOnly,
    hostCreated: true,
  }

  return {
    meet,
    store: {
      ...store,
      meets: [...store.meets, meet].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
      bookings: {
        ...store.bookings,
        [id]: emptyBooking(id),
      },
    },
  }
}

function makeCheckInCode(meetId: string) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6)
  const tag = meetId.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase()
  return `JADE-${tag}-${stamp}`
}

export function bookSeat(
  store: ScheduleBookingStore,
  meetId: string,
  paymentMethod: PaymentMethod,
): { store: ScheduleBookingStore; seatNumber: number; checkInCode: string } | null {
  const meet = store.meets.find((entry) => entry.id === meetId)
  if (!meet) return null
  if (meet.confirmed.some((player) => player.id === DEMO_BOOKER.id)) return null
  if (meet.confirmed.length >= meet.seatCap) return null

  const seatNumber = meet.confirmed.length + 1
  const checkInCode = makeCheckInCode(meetId)
  const meets = store.meets.map((entry) =>
    entry.id === meetId
      ? {
          ...entry,
          confirmed: [...entry.confirmed, { ...DEMO_BOOKER }],
          waitlist: entry.waitlist.filter((player) => player.id !== DEMO_BOOKER.id),
        }
      : entry,
  )

  return {
    store: {
      ...store,
      meets,
      bookings: {
        ...store.bookings,
        [meetId]: {
          meetId,
          yourSeatNumber: seatNumber,
          onWaitlist: false,
          paymentMethod,
          checkInCode,
          bookedAt: new Date().toISOString(),
        },
      },
    },
    seatNumber,
    checkInCode,
  }
}

export function cancelSeat(
  store: ScheduleBookingStore,
  meetId: string,
): ScheduleBookingStore {
  const meets = store.meets.map((entry) =>
    entry.id === meetId
      ? {
          ...entry,
          confirmed: entry.confirmed.filter((player) => player.id !== DEMO_BOOKER.id),
        }
      : entry,
  )
  return {
    ...store,
    meets,
    bookings: {
      ...store.bookings,
      [meetId]: emptyBooking(meetId),
    },
  }
}

export function joinWaitlist(
  store: ScheduleBookingStore,
  meetId: string,
): ScheduleBookingStore {
  const meet = store.meets.find((entry) => entry.id === meetId)
  if (!meet) return store
  if (meet.waitlist.some((player) => player.id === DEMO_BOOKER.id)) return store
  if (meet.confirmed.some((player) => player.id === DEMO_BOOKER.id)) return store

  const meets = store.meets.map((entry) =>
    entry.id === meetId
      ? { ...entry, waitlist: [...entry.waitlist, { ...DEMO_BOOKER }] }
      : entry,
  )
  return {
    ...store,
    meets,
    bookings: {
      ...store.bookings,
      [meetId]: {
        ...emptyBooking(meetId),
        onWaitlist: true,
        bookedAt: new Date().toISOString(),
      },
    },
  }
}

export function leaveWaitlist(
  store: ScheduleBookingStore,
  meetId: string,
): ScheduleBookingStore {
  const meets = store.meets.map((entry) =>
    entry.id === meetId
      ? {
          ...entry,
          waitlist: entry.waitlist.filter((player) => player.id !== DEMO_BOOKER.id),
        }
      : entry,
  )
  return {
    ...store,
    meets,
    bookings: {
      ...store.bookings,
      [meetId]: emptyBooking(meetId),
    },
  }
}

export function launchLiveHref(meet: ScheduledMeet) {
  const params = new URLSearchParams({
    title: meet.title,
    mode: "live",
    meet: meet.id,
  })
  return `/session/new?${params.toString()}`
}
