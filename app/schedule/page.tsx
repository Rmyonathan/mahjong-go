"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { KeyRound, Search } from "lucide-react"

import { BookSeatModal } from "@/components/schedule/book-seat-modal"
import { CreateMeetModal } from "@/components/schedule/create-meet-modal"
import { InviteCodeModal } from "@/components/schedule/invite-code-modal"
import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import {
  boardLabel,
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
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16">
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        </main>
      }
    >
      <SchedulePageInner />
    </Suspense>
  )
}

function SchedulePageInner() {
  const searchParams = useSearchParams()
  const urlCode = searchParams.get("code")?.trim().toUpperCase() || null

  const [meets, setMeets] = useState<ApiMeet[]>([])
  const [viewer, setViewer] = useState<ScheduleViewer | null>(null)
  const [membershipTier, setMembershipTier] = useState<"FREE" | "PRO">("FREE")
  const [accountName, setAccountName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null)
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all")
  const [query, setQuery] = useState("")
  const [inviteDraft, setInviteDraft] = useState("")
  const [inviteCodes, setInviteCodes] = useState<string[]>([])
  const [invitesReady, setInvitesReady] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [bookingMeetId, setBookingMeetId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [proOpen, setProOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [liveByMeetId, setLiveByMeetId] = useState<Record<string, string>>({})

  const latestInvite = inviteCodes[inviteCodes.length - 1] ?? null

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams()
      if (inviteCodes.length) params.set("codes", inviteCodes.join(","))
      if (query.trim()) params.set("q", query.trim())
      const qs = params.toString()
      const [scheduleRes, meRes, liveRes] = await Promise.all([
        fetch(`/api/schedule${qs ? `?${qs}` : ""}`),
        fetch("/api/auth/me"),
        fetch("/api/sessions"),
      ])
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

      if (meRes.ok) {
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

      if (liveRes.ok) {
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
      setError("Network error loading schedule")
    } finally {
      setLoading(false)
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
    if (fromUrl && typeof window !== "undefined") {
      window.history.replaceState(null, "", "/schedule")
    }
  }, [urlCode])

  useEffect(() => {
    if (!invitesReady) return
    void refresh()
  }, [refresh, invitesReady])

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

  const bookingMeet = meets.find((meet) => meet.id === bookingMeetId) ?? null
  const isAdmin = viewer?.role === "ADMIN"
  const isPro = membershipTier === "PRO" || isAdmin

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
      body: JSON.stringify({ paymentMethod: "VENUE" }),
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Loading schedule…
        </p>
      </main>
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

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            House calendar · Postgres
          </p>
          <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl">
            Schedule & booking
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed">
            Request a seat — the table host must accept before you&apos;re
            confirmed. Club tables get unlimited scans; Free-hosted tables get
            3.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewer ? (
            <span className="border-[2px] border-jade-ink bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]">
              {viewer.name} · {isPro ? "Pro" : "Free"}
            </span>
          ) : (
            <Link
              href="/login"
              className="border-[2px] border-jade-ink bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]"
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
              {isAdmin ? "+ Club meet" : "+ My table"}
            </button>
          ) : null}
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

      {filtered.length === 0 ? (
        <div className="jade-card mt-8 px-5 py-10">
          <p className="font-serif text-3xl">No meets on this filter.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAdmin
              ? "Create the next weekly table for the house."
              : "Check back soon — hosts post weekly seats here."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 lg:grid-cols-2">
          {filtered.map((meet) => (
            <MeetCard
              key={meet.id}
              meet={meet}
              now={now}
              isPro={isPro}
              loggedIn={Boolean(viewer)}
              liveSessionId={liveByMeetId[meet.id] ?? null}
              onBook={() => setBookingMeetId(meet.id)}
              onCancel={() => cancelOrLeave(meet.id)}
              onWaitlist={() => joinWaitlist(meet.id)}
              onLocked={() => setProOpen(true)}
              onReview={(bookingId, action) =>
                reviewBooking(meet.id, bookingId, action)
              }
            />
          ))}
        </ul>
      )}

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
    </main>
  )
}

function MeetCard({
  meet,
  now,
  isPro,
  loggedIn,
  liveSessionId,
  onBook,
  onCancel,
  onWaitlist,
  onLocked,
  onReview,
}: {
  meet: ApiMeet
  now: number
  isPro: boolean
  loggedIn: boolean
  liveSessionId: string | null
  onBook: () => void
  onCancel: () => void
  onWaitlist: () => void
  onLocked: () => void
  onReview: (bookingId: string, action: "approve" | "reject" | "release") => void
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
  const progress = Math.min(
    100,
    Math.round((meet.confirmedCount / meet.maxSeats) * 100),
  )

  return (
    <li className="jade-card flex flex-col overflow-hidden">
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
          <span className="rounded-full border border-[#102A20]/12 bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
            {boardLabel(meet.boardType)}
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
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Confirmed roster
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {preview.length === 0 ? (
              <li className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                No seats claimed yet
              </li>
            ) : (
              preview.map((player) => (
                <li
                  key={player.bookingId}
                  className={cn(
                    "inline-flex items-center gap-1.5 border border-jade-ink bg-card px-2 py-1",
                    player.isYou && "border-jade-accent bg-muted",
                  )}
                >
                  <span className="grid size-5 place-items-center border border-jade-ink bg-parchment font-serif text-[10px]">
                    {player.badge}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em]">
                    {player.nickname} · {player.rating}
                  </span>
                </li>
              ))
            )}
            {more > 0 ? (
              <li className="inline-flex items-center border border-dashed border-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                +{more} more
              </li>
            ) : null}
          </ul>
        </div>

        {meet.isHost && meet.pendingRequests.length > 0 ? (
          <div className="mt-4 rounded-xl border border-jade-gold/40 bg-jade-gold/10 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
              Seat requests · {meet.pendingRequests.length}
            </p>
            <ul className="mt-2 space-y-2">
              {meet.pendingRequests.map((req) => (
                <li
                  key={req.bookingId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-2.5 py-2"
                >
                  <span className="text-sm font-medium">{req.nickname}</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onReview(req.bookingId, "approve")}
                      className="rounded-full bg-jade-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onReview(req.bookingId, "reject")}
                      className="rounded-full border border-[#102A20]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
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
            <div className="space-y-2">
              <div className="inline-flex h-11 w-full items-center justify-center rounded-full bg-jade-accent px-4 text-sm font-semibold text-white">
                ✓ Seat #{meet.yourBooking?.seatNumber} confirmed
              </div>
              {meet.isHost ? (
                <button
                  type="button"
                  onClick={() =>
                    meet.yourBooking &&
                    onReview(meet.yourBooking.id, "release")
                  }
                  className="inline-flex h-9 w-full items-center justify-center rounded-full border border-[#102A20]/15 text-xs font-medium"
                >
                  Release my seat (host)
                </button>
              ) : (
                <p className="text-center text-[11px] text-muted-foreground">
                  Need to leave? Ask the host to release your seat.
                </p>
              )}
            </div>
          ) : youPending ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-full border border-jade-gold bg-jade-gold/15 px-4 text-sm font-semibold text-jade-ink"
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
        </div>
      </div>
    </li>
  )
}
