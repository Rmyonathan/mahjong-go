"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { KeyRound, Search } from "lucide-react"

import { JadePageLoader } from "@/components/jade-page-loader"
import { PlayerAvatar } from "@/components/players/player-avatar"
import { ScoutPlayerModal } from "@/components/players/scout-player-modal"
import { BookSeatModal } from "@/components/schedule/book-seat-modal"
import { CreateMeetModal } from "@/components/schedule/create-meet-modal"
import { InviteCodeModal } from "@/components/schedule/invite-code-modal"
import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import {
  buildScheduleDateStrip,
  extractInviteCode,
  formatCountdown,
  formatFeeIdr,
  meetMatchesYmd,
  readSavedInviteCodes,
  uniqueInviteCodes,
  writeSavedInviteCodes,
  type ApiMeet,
  type ApiPaymentMethod,
  type ScheduleViewer,
} from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

type BoardFilter = "all" | ApiMeet["boardType"]

const BOARD_FILTERS: { id: BoardFilter; label: string }[] = [
  { id: "all", label: "All levels" },
  { id: "BEGINNER", label: "Beginner" },
  { id: "ADVANCED", label: "Advanced" },
  { id: "MCR", label: "Advanced MCR" },
  { id: "GUIDED", label: "Guided table" },
]

const DATE_STRIP = buildScheduleDateStrip(14)

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <JadePageLoader kanji="約" label="Loading schedule…" showCards />
      }
    >
      <SchedulePageInner />
    </Suspense>
  )
}

function SchedulePageInner() {
  const searchParams = useSearchParams()
  const urlCode = searchParams.get("code")?.trim().toUpperCase() || null
  const openCreateFromUrl =
    searchParams.get("create") === "1" || searchParams.get("create") === "true"

  const [meets, setMeets] = useState<ApiMeet[]>([])
  const [viewer, setViewer] = useState<ScheduleViewer | null>(null)
  const [membershipTier, setMembershipTier] = useState<"FREE" | "PRO">("FREE")
  const [accountName, setAccountName] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reqIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null)
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all")
  const [query, setQuery] = useState("")
  const [inviteDraft, setInviteDraft] = useState("")
  const [inviteCodes, setInviteCodes] = useState<string[]>([])
  const [invitesReady, setInvitesReady] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [bookingMeetId, setBookingMeetId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(openCreateFromUrl)
  const [proOpen, setProOpen] = useState(false)
  const [scoutPlayerId, setScoutPlayerId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [liveByMeetId, setLiveByMeetId] = useState<Record<string, string>>({})

  const latestInvite = inviteCodes[inviteCodes.length - 1] ?? null

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent)
    const reqId = ++reqIdRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!silent) {
      setError(null)
      setRefreshing(true)
    }
    try {
      const params = new URLSearchParams()
      if (inviteCodes.length) params.set("codes", inviteCodes.join(","))
      if (query.trim()) params.set("q", query.trim())
      const qs = params.toString()

      const [scheduleRes, meRes] = await Promise.all([
        fetch(`/api/schedule${qs ? `?${qs}` : ""}`, {
          signal: controller.signal,
        }),
        fetch("/api/auth/me", { signal: controller.signal }).catch(() => null),
      ])

      if (reqId !== reqIdRef.current) return

      const scheduleCt = scheduleRes.headers.get("content-type") ?? ""
      if (!scheduleCt.includes("application/json")) {
        setError("Could not load schedule")
        return
      }

      const schedule = (await scheduleRes.json()) as {
        meets?: ApiMeet[]
        viewer?: ScheduleViewer | null
        error?: string
      }
      if (!scheduleRes.ok) {
        setError(schedule.error ?? "Could not load schedule")
        return
      }

      setMeets(schedule.meets ?? [])
      setViewer(schedule.viewer ?? null)

      if (meRes && meRes.ok) {
        try {
          const meCt = meRes.headers.get("content-type") ?? ""
          if (meCt.includes("application/json")) {
            const me = (await meRes.json()) as {
              user?: {
                membershipTier?: "FREE" | "PRO"
                isPro?: boolean
                role?: string
                name?: string
              } | null
            }
            if (me.user?.isPro || me.user?.role === "ADMIN") {
              setMembershipTier("PRO")
            } else if (me.user?.membershipTier) {
              setMembershipTier(me.user.membershipTier)
            }
            if (me.user?.name) setAccountName(me.user.name)
          }
        } catch {
          /* ignore secondary auth profile parse error */
        }
      }

      if (!schedule.viewer) {
        setLiveByMeetId({})
        return
      }

      try {
        const liveRes = await fetch("/api/sessions", {
          signal: controller.signal,
        })
        if (reqId !== reqIdRef.current) return
        const liveCt = liveRes.headers.get("content-type") ?? ""
        if (liveRes.ok && liveCt.includes("application/json")) {
          const live = (await liveRes.json()) as {
            liveSessions?: Array<{ id: string; meetId: string | null }>
          }
          const map: Record<string, string> = {}
          for (const session of live.liveSessions ?? []) {
            if (session.meetId) map[session.meetId] = session.id
          }
          setLiveByMeetId(map)
        } else {
          setLiveByMeetId({})
        }
      } catch {
        if (reqId === reqIdRef.current) {
          setLiveByMeetId({})
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      if (reqId === reqIdRef.current) {
        setError("Network error loading schedule")
      }
    } finally {
      if (reqId === reqIdRef.current && !controller.signal.aborted) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [inviteCodes, query])

  useEffect(() => {
    const fromUrl =
      extractInviteCode(urlCode ?? "") ??
      (urlCode ? urlCode.trim().toUpperCase() : null)
    const merged = uniqueInviteCodes([
      ...readSavedInviteCodes(),
      ...(fromUrl ? [fromUrl] : []),
    ])
    setInviteCodes(merged)
    writeSavedInviteCodes(merged)
    if (fromUrl) setInviteDraft(fromUrl)
    else if (merged.length) setInviteDraft(merged[merged.length - 1]!)
    setInvitesReady(true)
    if (openCreateFromUrl) setCreateOpen(true)
    if ((fromUrl || openCreateFromUrl) && typeof window !== "undefined") {
      window.history.replaceState(null, "", "/schedule")
    }
  }, [urlCode, openCreateFromUrl])

  useEffect(() => {
    if (!invitesReady) return
    void refresh()
    return () => {
      abortRef.current?.abort()
    }
  }, [refresh, invitesReady])

  useEffect(() => {
    if (!invitesReady) return
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !bookingMeetId &&
        !createOpen &&
        !inviteOpen &&
        !proOpen &&
        !scoutPlayerId
      ) {
        void refresh({ silent: true })
      }
    }, 4000)
    return () => window.clearInterval(timer)
  }, [
    invitesReady,
    refresh,
    bookingMeetId,
    createOpen,
    inviteOpen,
    proOpen,
    scoutPlayerId,
  ])

  function unlockInvite(code: string) {
    const next = uniqueInviteCodes([...inviteCodes, code])
    setInviteCodes(next)
    writeSavedInviteCodes(next)
    setInviteDraft(code)
    setActionError(null)
  }

  function clearInvites() {
    setInviteCodes([])
    setInviteDraft("")
    writeSavedInviteCodes([])
  }

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    return meets.filter((meet) => {
      const dateOk = meetMatchesYmd(meet.startsAt, selectedYmd)
      const boardOk =
        boardFilter === "all" ? true : meet.boardType === boardFilter
      return dateOk && boardOk
    })
  }, [meets, selectedYmd, boardFilter])

  const { upcomingMeets, pastMeets } = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const upcoming: ApiMeet[] = []
    const past: ApiMeet[] = []
    for (const meet of filtered) {
      const starts = new Date(meet.startsAt).getTime()
      if (meet.status === "COMPLETED" || starts < startOfToday.getTime()) {
        past.push(meet)
      } else {
        upcoming.push(meet)
      }
    }
    upcoming.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    past.sort(
      (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    )
    return { upcomingMeets: upcoming, pastMeets: past }
  }, [filtered])

  const [listFilter, setListFilter] = useState<"all" | "upcoming" | "mine">(
    "all",
  )
  const [pastOpen, setPastOpen] = useState(false)

  const bookingMeet = meets.find((meet) => meet.id === bookingMeetId) ?? null
  const isAdmin = viewer?.role === "ADMIN"
  const isPro = membershipTier === "PRO" || isAdmin

  const visibleUpcoming = useMemo(() => {
    if (listFilter === "mine") {
      return upcomingMeets.filter(
        (meet) => meet.yourBooking || meet.isHost || meet.canLaunchLive,
      )
    }
    return upcomingMeets
  }, [upcomingMeets, listFilter])

  async function bookMeet(meetId: string, method: ApiPaymentMethod) {
    const response = await fetch(`/api/schedule/${meetId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod: method,
        inviteCodes,
      }),
    })
    const data = (await response.json()) as {
      error?: string
      booking?: {
        seatNumber: number | null
        checkInCode: string | null
        status: string
      }
    }
    if (!response.ok) throw new Error(data.error ?? "Booking failed")
    await refresh()
    if (data.booking?.status === "WAITLIST") {
      return { kind: "waitlist" as const }
    }
    if (data.booking?.status === "PENDING") {
      return { kind: "pending" as const }
    }
    if (
      data.booking?.status === "CONFIRMED" &&
      data.booking.seatNumber &&
      data.booking.checkInCode
    ) {
      return {
        kind: "confirmed" as const,
        seatNumber: data.booking.seatNumber,
        checkInCode: data.booking.checkInCode,
      }
    }
    throw new Error("Unexpected booking response")
  }

  async function cancelOrLeave(meetId: string) {
    setActionError(null)
    const response = await fetch(`/api/schedule/${meetId}/book`, {
      method: "DELETE",
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      setActionError(data.error ?? "Could not cancel")
      return
    }
    await refresh()
  }

  async function reviewBooking(
    meetId: string,
    bookingId: string,
    action: "approve" | "reject" | "release",
  ) {
    setActionError(null)
    const response = await fetch(`/api/schedule/${meetId}/book/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, action }),
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      setActionError(data.error ?? "Could not update booking")
      return
    }
    await refresh()
  }

  async function joinWaitlist(meetId: string) {
    setActionError(null)
    const response = await fetch(`/api/schedule/${meetId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      setActionError(data.error ?? "Could not join waitlist")
      return
    }
    await refresh()
  }

  if (loading) {
    return (
      <JadePageLoader kanji="約" label="Loading schedule…" showCards />
    )
  }

  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 top-0 select-none font-serif text-[12rem] leading-none text-jade-ink/[0.07] sm:text-[16rem]"
      >
        約
      </span>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            House calendar
          </p>
          <h1 className="mt-2 font-serif text-4xl uppercase leading-[0.92] tracking-tight sm:text-6xl">
            Schedule
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Book a seat, launch live tables, and manage club meets.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {viewer ? (
              <span className="rounded-full border border-[#102A20]/12 bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em]">
                {viewer.name} · {isPro ? "Pro" : "Free"}
              </span>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-[#102A20]/12 bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em]"
              >
                Login to book
              </Link>
            )}
            {viewer ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex h-10 items-center rounded-full bg-jade-accent px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(22,121,76,0.55)]"
              >
                {isAdmin ? "+ Create Schedule" : "+ My table"}
              </button>
            ) : null}
          </div>
          <div
            className="inline-flex flex-wrap rounded-full border border-[#102A20]/10 bg-white p-1"
            role="tablist"
            aria-label="Schedule filter"
          >
            {(
              [
                { id: "all", label: "All" },
                { id: "upcoming", label: "Upcoming" },
                { id: "mine", label: "My Bookings" },
              ] as const
            ).map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={listFilter === entry.id}
                onClick={() => setListFilter(entry.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                  listFilter === entry.id
                    ? "bg-jade-ink text-white"
                    : "text-jade-ink/70 hover:bg-jade-soft",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-6 space-y-4">
        {/* Reclub-style date strip */}
        <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-2 pb-1" role="tablist" aria-label="Dates">
            <button
              type="button"
              onClick={() => setSelectedYmd(null)}
              className={cn(
                "tap-press shrink-0 rounded-2xl px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.12em]",
                selectedYmd == null
                  ? "bg-jade-accent text-white shadow-sm"
                  : "border border-[#102A20]/10 bg-white text-jade-ink/70",
              )}
            >
              All
            </button>
            {DATE_STRIP.map((day) => (
              <button
                key={day.ymd}
                type="button"
                role="tab"
                aria-selected={selectedYmd === day.ymd}
                onClick={() => setSelectedYmd(day.ymd)}
                className={cn(
                  "tap-press shrink-0 rounded-2xl px-3.5 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.12em]",
                  selectedYmd === day.ymd
                    ? "bg-jade-accent text-white shadow-sm"
                    : "border border-[#102A20]/10 bg-white text-jade-ink/70",
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <form
            className="relative min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault()
              void refresh()
            }}
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search table name…"
              className="h-11 w-full rounded-full border border-[#102A20]/10 bg-white pl-10 pr-20 text-sm outline-none ring-jade-accent/30 focus:ring-2"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-jade-ink px-3.5 py-1.5 text-xs font-semibold text-white"
            >
              Search
            </button>
          </form>

          {latestInvite ? (
            <div className="inline-flex h-11 max-w-[46%] shrink-0 items-center overflow-hidden rounded-full border border-jade-accent/40 bg-jade-accent/10">
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="tap-press inline-flex min-w-0 items-center gap-1.5 px-3 py-2"
                title="Add another invite code"
              >
                <KeyRound className="size-3.5 shrink-0 text-jade-accent" />
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-jade-accent">
                  {inviteCodes.length > 1
                    ? `${inviteCodes.length} codes`
                    : latestInvite}
                </span>
              </button>
              <button
                type="button"
                aria-label="Clear invite codes"
                onClick={clearInvites}
                className="tap-press shrink-0 border-l border-jade-accent/25 px-2.5 py-2 text-sm leading-none text-jade-accent/80"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="tap-press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-[#102A20]/12 bg-white px-3 text-xs font-medium text-jade-ink/80"
              aria-label="Enter invite code"
            >
              <KeyRound className="size-3.5 text-jade-accent" />
              <span className="hidden sm:inline">Invite</span>
            </button>
          )}
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Level
          </p>
          <div
            className="flex flex-wrap border-[2px] border-jade-ink"
            role="tablist"
            aria-label="Level filter"
          >
            {BOARD_FILTERS.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={boardFilter === entry.id}
                onClick={() => setBoardFilter(entry.id)}
                className={cn(
                  "px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
                  index > 0 && "border-l-[2px] border-jade-ink",
                  boardFilter === entry.id
                    ? "bg-jade-ink text-white"
                    : "bg-card hover:bg-muted",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="jade-divider mt-6" />

      {refreshing ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-jade-accent/25 bg-jade-soft/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent"
        >
          <span className="jade-boot-pip size-1.5 rounded-full bg-jade-accent" />
          Updating schedule…
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
          {actionError}
        </p>
      ) : null}

      {visibleUpcoming.length === 0 &&
      (listFilter !== "all" || pastMeets.length === 0) ? (
        <div className="jade-card mt-8 px-5 py-10">
          <p className="font-serif text-3xl">No meets on this filter.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAdmin
              ? "Create the next weekly table for the house."
              : "Check back soon — hosts post weekly seats here."}
          </p>
        </div>
      ) : null}

      {visibleUpcoming.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl uppercase">Upcoming sessions</h2>
          <ul className="mt-4 grid gap-5 lg:grid-cols-2">
            {visibleUpcoming.map((meet) => (
              <MeetCard
                key={meet.id}
                meet={meet}
                now={now}
                isPro={isPro}
                isAdmin={isAdmin}
                loggedIn={Boolean(viewer)}
                liveSessionId={liveByMeetId[meet.id] ?? null}
                onBook={() => setBookingMeetId(meet.id)}
                onCancel={() => cancelOrLeave(meet.id)}
                onWaitlist={() => joinWaitlist(meet.id)}
                onLocked={() => setProOpen(true)}
                onReview={(bookingId, action) =>
                  reviewBooking(meet.id, bookingId, action)
                }
                onDeleted={() => void refresh()}
                onManaged={() => void refresh()}
                onScout={(playerId) => setScoutPlayerId(playerId)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {listFilter === "all" && pastMeets.length > 0 ? (
        <section className="mt-10">
          <button
            type="button"
            onClick={() => setPastOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <h2 className="font-serif text-2xl uppercase">
              Past / completed sessions
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {pastOpen ? "Hide" : `Show · ${pastMeets.length}`}
            </span>
          </button>
          {pastOpen ? (
            <ul className="mt-4 grid gap-5 lg:grid-cols-2">
              {pastMeets.map((meet) => (
                <MeetCard
                  key={meet.id}
                  meet={meet}
                  now={now}
                  isPro={isPro}
                  isAdmin={isAdmin}
                  loggedIn={Boolean(viewer)}
                  liveSessionId={liveByMeetId[meet.id] ?? null}
                  onBook={() => setBookingMeetId(meet.id)}
                  onCancel={() => cancelOrLeave(meet.id)}
                  onWaitlist={() => joinWaitlist(meet.id)}
                  onLocked={() => setProOpen(true)}
                  onReview={(bookingId, action) =>
                    reviewBooking(meet.id, bookingId, action)
                  }
                  onDeleted={() => void refresh()}
                  onManaged={() => void refresh()}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <BookSeatModal
        open={Boolean(bookingMeet)}
        meet={bookingMeet}
        accountName={accountName}
        onClose={() => setBookingMeetId(null)}
        onConfirm={async (method) => {
          if (!bookingMeet) throw new Error("No meet selected")
          return bookMeet(bookingMeet.id, method)
        }}
      />

      <CreateMeetModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void refresh()}
        isClubOwner={isAdmin}
        isProHost={isPro}
      />

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
      />

      <InviteCodeModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        initialCode={inviteDraft}
        onUnlock={unlockInvite}
      />

      <ScoutPlayerModal
        playerId={scoutPlayerId}
        onClose={() => setScoutPlayerId(null)}
        accountName={accountName}
      />
    </main>
  )
}

function MeetCard({
  meet,
  now,
  isPro,
  isAdmin,
  loggedIn,
  liveSessionId,
  onBook,
  onCancel,
  onWaitlist,
  onLocked,
  onReview,
  onDeleted,
  onManaged,
  onScout,
}: {
  meet: ApiMeet
  now: number
  isPro: boolean
  isAdmin: boolean
  loggedIn: boolean
  liveSessionId: string | null
  onBook: () => void
  onCancel: () => void
  onWaitlist: () => void
  onLocked: () => void
  onReview: (bookingId: string, action: "approve" | "reject" | "release") => void
  onDeleted: () => void
  onManaged: () => void
  onScout: (playerId: string) => void
}) {
  const remaining = meet.proEarlyBirdUntil
    ? Math.max(0, new Date(meet.proEarlyBirdUntil).getTime() - now)
    : 0
  const earlyBirdActive = remaining > 0
  const locked =
    (meet.proOnly || earlyBirdActive) && !isPro
  const youConfirmed = meet.yourBooking?.status === "CONFIRMED"
  const youPending = meet.yourBooking?.status === "PENDING"
  const youWaiting = meet.yourBooking?.status === "WAITLIST"
  const preview = meet.roster.slice(0, 4)
  const more = Math.max(0, meet.roster.length - preview.length)
  const canSwapRoster =
    meet.isHost &&
    !liveSessionId &&
    meet.status !== "COMPLETED" &&
    meet.status !== "CANCELLED"
  const rosterForDisplay = canSwapRoster ? meet.roster : preview
  const rosterOverflow = canSwapRoster ? 0 : more
  const progress = Math.min(
    100,
    Math.round((meet.confirmedCount / meet.maxSeats) * 100),
  )

  function releaseConfirmedSeat(
    bookingId: string,
    nickname: string,
    seatNumber: number | null,
  ) {
    const seatLabel = seatNumber ? `#${seatNumber}` : "this seat"
    if (
      !confirm(
        `Lepas ${nickname} dari kursi ${seatLabel}?\n\nKursi kosong sebelum go-live — Accept pemain baru di Seat requests, atau waitlist naik ke pending otomatis.`,
      )
    ) {
      return
    }
    onReview(bookingId, "release")
  }

  async function adminDelete() {
    if (
      !confirm(
        `Remove “${meet.title}” from the schedule?\n\nIt disappears from Schedule only — game sessions and player history stay in the club archive.`,
      )
    ) {
      return
    }
    const response = await fetch(`/api/schedule/${meet.id}`, {
      method: "DELETE",
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      window.alert(data.error ?? "Could not remove from schedule")
      return
    }
    onDeleted()
  }

  async function adminSetStatus(status: ApiMeet["status"]) {
    const response = await fetch(`/api/schedule/${meet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      window.alert(data.error ?? "Could not update")
      return
    }
    onManaged()
  }

  const hostReviewing =
    meet.isHost && meet.pendingRequests.length > 0

  return (
    <li className="jade-card relative z-0 flex flex-col overflow-hidden hover:z-10">
      {meet.isClubTable ? (
        <div className="border-b border-jade-gold/30 bg-jade-gold/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
          Club table · {meet.scanLabel}
          {meet.captainName ? ` · Captain ${meet.captainName}` : ""}
          {meet.visibility === "PRIVATE" ? " · Private" : ""}
        </div>
      ) : (
        <div className="border-b border-[#102A20]/10 bg-jade-soft/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
          Player table · {meet.hostName ?? "Host"} · {meet.scanLabel}
          {meet.visibility === "PRIVATE" ? " · Private" : " · Public"}
        </div>
      )}
      {meet.isHost && meet.visibility === "PRIVATE" && meet.inviteCode ? (
        <div className="border-b border-[#102A20]/10 bg-white px-4 py-2 text-xs">
          Invite code{" "}
          <span className="font-mono font-semibold text-jade-accent">
            {meet.inviteCode}
          </span>
          {" · "}
          <button
            type="button"
            className="font-semibold text-jade-ink underline-offset-2 hover:underline"
            onClick={() => {
              if (meet.inviteCode) {
                void navigator.clipboard.writeText(meet.inviteCode)
              }
            }}
          >
            Copy code
          </button>
        </div>
      ) : null}
      {meet.proOnly ? (
        <div className="border-b border-jade-ink/10 bg-jade-gold px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
          ★ Pro only
        </div>
      ) : earlyBirdActive ? (
        <div className="border-b border-jade-ink/10 bg-jade-gold px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
          ★ Pro early-bird access ({formatCountdown(remaining)} left)
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[#102A20]/12 bg-[#F6F4EE] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
            {meet.whenLabel}
          </span>
          <span className="rounded-full border border-jade-accent/30 bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
            {formatFeeIdr(meet.feeIdr)}
          </span>
        </div>

        <h2 className="mt-4 font-serif text-3xl leading-none">{meet.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">📍 {meet.location}</p>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
            <span>
              {meet.confirmedCount} / {meet.maxSeats} seats filled ({meet.tables}{" "}
              tables)
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 border-[2px] border-jade-ink bg-parchment">
            <div
              className={cn(
                "h-full",
                meet.isFull ? "bg-jade-red" : "bg-jade-accent",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Confirmed roster
            </p>
            {canSwapRoster && meet.roster.length > 0 ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-jade-accent">
                Ganti pemain sebelum launch
              </span>
            ) : null}
            {liveSessionId ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                Locked · table live
              </span>
            ) : null}
          </div>
          <ul
            className={cn(
              "mt-2 gap-2",
              canSwapRoster ? "flex flex-col" : "flex flex-wrap",
            )}
          >
            {rosterForDisplay.length === 0 ? (
              <li className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                No seats claimed yet
              </li>
            ) : (
              rosterForDisplay.map((player) => (
                <li
                  key={player.bookingId}
                  className={cn(
                    canSwapRoster
                      ? "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#102A20]/12 bg-white/90 px-2.5 py-2"
                      : "inline-flex items-center gap-1.5 border border-jade-ink bg-card px-2 py-1",
                    !canSwapRoster &&
                      player.isYou &&
                      "border-jade-accent bg-muted",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <PlayerAvatar
                      initials={player.initials ?? player.badge}
                      name={player.name}
                      avatarUrl={player.avatarUrl}
                      frameId={player.frameId}
                      size="xs"
                      showBadge={false}
                      className="size-6"
                    />
                    {loggedIn && player.playerId ? (
                      <button
                        type="button"
                        onClick={() => onScout(player.playerId!)}
                        className="font-mono text-[10px] uppercase tracking-[0.1em] underline-offset-2 hover:text-jade-accent hover:underline"
                        title="Scout player"
                      >
                        {player.seatNumber != null
                          ? `#${player.seatNumber} · `
                          : null}
                        {player.nickname} · {player.rating}
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em]">
                        {player.seatNumber != null
                          ? `#${player.seatNumber} · `
                          : null}
                        {player.nickname} · {player.rating}
                      </span>
                    )}
                  </span>
                  {canSwapRoster ? (
                    <button
                      type="button"
                      onClick={() =>
                        releaseConfirmedSeat(
                          player.bookingId,
                          player.nickname,
                          player.seatNumber,
                        )
                      }
                      className="tap-press rounded-full border border-jade-red/35 bg-white px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-jade-red hover:bg-jade-red/10"
                    >
                      Ganti / lepas
                    </button>
                  ) : null}
                </li>
              ))
            )}
            {rosterOverflow > 0 ? (
              <li className="inline-flex items-center border border-dashed border-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                +{rosterOverflow} more
              </li>
            ) : null}
          </ul>
          {meet.waitlistCount > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-jade-gold/40 bg-jade-gold/10 px-3 py-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-jade-gold">
                Waitlist · {meet.waitlistCount}
              </span>
              {meet.waitlistNames?.length ? (
                <span className="text-xs text-jade-ink">
                  {meet.waitlistNames.join(", ")}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {hostReviewing ? (
          <div
            id={`seat-requests-${meet.id}`}
            className="relative z-20 mt-4 rounded-xl border border-jade-gold/40 bg-jade-gold/10 p-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
              Seat requests · {meet.pendingRequests.length}
            </p>
            {youPending ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                You also have a seat request — use Accept/Reject below or{" "}
                <button
                  type="button"
                  onClick={onCancel}
                  className="font-medium text-jade-ink underline-offset-2 hover:underline"
                >
                  withdraw yours
                </button>
                .
              </p>
            ) : null}
            <ul className="mt-2 space-y-2">
              {meet.pendingRequests.map((req) => (
                <li
                  key={req.bookingId}
                  className="flex flex-col gap-2 rounded-lg bg-white/90 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium">{req.nickname}</span>
                  <div className="relative z-10 flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onReview(req.bookingId, "approve")}
                      className="tap-press rounded-full bg-jade-accent px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onReview(req.bookingId, "reject")}
                      className="tap-press rounded-full border border-[#102A20]/15 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] hover:bg-jade-soft"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-5">
          {!loggedIn ? (
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#102A20]/15 bg-white px-4 text-sm font-semibold"
            >
              Login to book →
            </Link>
          ) : youConfirmed ? (
            <div className="inline-flex h-11 w-full items-center justify-center rounded-full bg-jade-accent px-4 text-sm font-semibold text-white">
              ✓ Seat #{meet.yourBooking?.seatNumber} confirmed
            </div>
          ) : youPending && !hostReviewing ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-jade-gold bg-jade-gold/15 px-4 text-sm font-semibold text-jade-ink"
            >
              ⏳ Pending host approval · withdraw
            </button>
          ) : locked ? (
            <button
              type="button"
              onClick={onLocked}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#102A20]/15 bg-[#F6F4EE] px-4 text-sm font-semibold"
            >
              {meet.proOnly ? "🔒 Pro only" : "🔒 Pro early-bird only"}
            </button>
          ) : meet.isFull ? (
            youWaiting ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#102A20]/15 bg-white px-4 text-sm font-semibold"
              >
                ✓ On waitlist ({meet.waitlistCount}) · leave
              </button>
            ) : (
              <button
                type="button"
                onClick={onWaitlist}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#102A20]/15 bg-white px-4 text-sm font-semibold"
              >
                Join waitlist ({meet.waitlistCount})
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onBook}
              className="inline-flex h-11 items-center justify-center rounded-full bg-jade-accent px-4 text-sm font-semibold text-white"
            >
              Request seat →
            </button>
          )}

          {meet.canLaunchLive ? (
            <Link
              href={
                liveSessionId
                  ? `/session/live?id=${encodeURIComponent(liveSessionId)}`
                  : `/session/new?mode=live&title=${encodeURIComponent(meet.title)}&meet=${meet.id}`
              }
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-full border border-[#102A20]/15 px-3 text-xs font-semibold uppercase tracking-[0.08em]",
                liveSessionId
                  ? "bg-jade-ink text-white"
                  : "bg-white hover:bg-jade-soft",
              )}
            >
              {liveSessionId ? "● Open live table →" : "Launch live table →"}
            </Link>
          ) : null}

          {isAdmin ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {meet.isHost || meet.pendingCount > 0 ? (
                <button
                  type="button"
                  disabled={!hostReviewing}
                  onClick={() => {
                    document
                      .getElementById(`seat-requests-${meet.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                  }}
                  className={cn(
                    "inline-flex h-9 flex-1 items-center justify-center rounded-full border border-jade-gold/40 bg-jade-gold/10 px-3 font-mono text-[10px] uppercase tracking-[0.12em]",
                    hostReviewing && "tap-press hover:bg-jade-gold/20",
                  )}
                >
                  Review QRIS · {meet.pendingCount} pending
                </button>
              ) : null}
              <select
                aria-label="Manage status"
                value={meet.status}
                onChange={(event) =>
                  void adminSetStatus(event.target.value as ApiMeet["status"])
                }
                className="h-9 flex-1 rounded-full border border-[#102A20]/15 bg-white px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
              >
                <option value="OPEN">Manage · OPEN</option>
                <option value="FULL">Manage · FULL</option>
                <option value="COMPLETED">Manage · COMPLETED</option>
              </select>
              <button
                type="button"
                onClick={() => void adminDelete()}
                className="inline-flex h-9 items-center justify-center rounded-full border border-jade-red/40 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red"
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  )
}
