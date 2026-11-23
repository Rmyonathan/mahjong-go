"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { BookSeatModal } from "@/components/schedule/book-seat-modal"
import { CreateMeetModal } from "@/components/schedule/create-meet-modal"
import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import {
  boardLabel,
  formatCountdown,
  formatFeeIdr,
  meetMatchesDateFilter,
  type ApiMeet,
  type ApiPaymentMethod,
  type DateFilter,
  type ScheduleViewer,
} from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

type BoardFilter = "all" | ApiMeet["boardType"]

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "All dates" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This week" },
  { id: "later", label: "Later" },
]

const BOARD_FILTERS: { id: BoardFilter; label: string }[] = [
  { id: "all", label: "All levels" },
  { id: "BEGINNER", label: "Beginner" },
  { id: "ADVANCED", label: "Advanced" },
  { id: "MCR", label: "Advanced MCR" },
  { id: "GUIDED", label: "Guided table" },
]

export default function SchedulePage() {
  const [meets, setMeets] = useState<ApiMeet[]>([])
  const [viewer, setViewer] = useState<ScheduleViewer | null>(null)
  const [membershipTier, setMembershipTier] = useState<"FREE" | "PRO">("FREE")
  const [accountName, setAccountName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all")
  const [now, setNow] = useState(Date.now())
  const [bookingMeetId, setBookingMeetId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [proOpen, setProOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [liveByMeetId, setLiveByMeetId] = useState<Record<string, string>>({})

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [scheduleRes, meRes, liveRes] = await Promise.all([
        fetch("/api/schedule"),
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
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    return meets.filter((meet) => {
      const dateOk = meetMatchesDateFilter(meet.startsAt, dateFilter)
      const boardOk =
        boardFilter === "all" ? true : meet.boardType === boardFilter
      return dateOk && boardOk
    })
  }, [meets, dateFilter, boardFilter])

  const bookingMeet = meets.find((meet) => meet.id === bookingMeetId) ?? null
  const isAdmin = viewer?.role === "ADMIN"
  const isPro = membershipTier === "PRO" || isAdmin

  async function bookMeet(meetId: string, method: ApiPaymentMethod) {
    const response = await fetch(`/api/schedule/${meetId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod: method }),
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
      throw new Error("Table full — you were added to the waitlist")
    }
    if (
      data.booking?.status !== "CONFIRMED" ||
      !data.booking.seatNumber ||
      !data.booking.checkInCode
    ) {
      throw new Error("Unexpected booking response")
    }
    return {
      seatNumber: data.booking.seatNumber,
      checkInCode: data.booking.checkInCode,
    }
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
            Lock your seat for upcoming Jade Mahjong sessions. No more WhatsApp
            lists.
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
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-jade-accent px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white shadow-[3px_3px_0_0_var(--jade-ink)]"
            >
              + Create meet
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative mt-6 space-y-3">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            When
          </p>
          <div
            className="flex flex-wrap border-[2px] border-jade-ink"
            role="tablist"
            aria-label="Date filter"
          >
            {DATE_FILTERS.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={dateFilter === entry.id}
                onClick={() => setDateFilter(entry.id)}
                className={cn(
                  "px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
                  index > 0 && "border-l-[2px] border-jade-ink",
                  dateFilter === entry.id
                    ? "bg-jade-accent text-white"
                    : "bg-card hover:bg-muted",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
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
          if (!bookingMeet) return null
          return bookMeet(bookingMeet.id, method)
        }}
      />

      <CreateMeetModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void refresh()}
      />

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
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
}) {
  const remaining = meet.proEarlyBirdUntil
    ? Math.max(0, new Date(meet.proEarlyBirdUntil).getTime() - now)
    : 0
  const earlyBirdActive = remaining > 0
  const locked =
    (meet.proOnly || earlyBirdActive) && !isPro
  const youConfirmed = meet.yourBooking?.status === "CONFIRMED"
  const youWaiting = meet.yourBooking?.status === "WAITLIST"
  const preview = meet.roster.slice(0, 4)
  const more = Math.max(0, meet.roster.length - preview.length)
  const progress = Math.min(
    100,
    Math.round((meet.confirmedCount / meet.maxSeats) * 100),
  )

  return (
    <li className="jade-card flex flex-col overflow-hidden">
      {meet.proOnly ? (
        <div className="border-b-[2px] border-jade-ink bg-jade-gold px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
          ★ Pro only
        </div>
      ) : earlyBirdActive ? (
        <div className="border-b-[2px] border-jade-ink bg-jade-gold px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
          ★ Pro early-bird access ({formatCountdown(remaining)} left)
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <span className="border border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
            {meet.whenLabel}
          </span>
          <span className="border border-jade-ink bg-muted px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
            {boardLabel(meet.boardType)}
          </span>
          <span className="border border-jade-accent bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
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

        <div className="mt-auto flex flex-col gap-2 pt-5">
          {!loggedIn ? (
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              Login to book →
            </Link>
          ) : youConfirmed ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center border-[2px] border-jade-accent bg-jade-accent px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white"
            >
              ✓ Seat #{meet.yourBooking?.seatNumber} confirmed (cancel)
            </button>
          ) : locked ? (
            <button
              type="button"
              onClick={onLocked}
              className="inline-flex h-11 items-center justify-center border-[2px] border-jade-ink bg-muted px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              {meet.proOnly
                ? "🔒 Pro only"
                : "🔒 Pro early-bird only"}
            </button>
          ) : meet.isFull ? (
            youWaiting ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-11 items-center justify-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
              >
                ✓ On waitlist ({meet.waitlistCount} waiting) · leave
              </button>
            ) : (
              <button
                type="button"
                onClick={onWaitlist}
                className="inline-flex h-11 items-center justify-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
              >
                Join waitlist ({meet.waitlistCount} waiting)
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onBook}
              className="scan-cta-accent inline-flex h-11 items-center justify-center rounded-none px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              Book seat →
            </button>
          )}

          <Link
            href={
              liveSessionId
                ? `/session/live?id=${encodeURIComponent(liveSessionId)}`
                : `/session/new?mode=live&title=${encodeURIComponent(meet.title)}&meet=${meet.id}`
            }
            className={cn(
              "inline-flex h-10 items-center justify-center border-[2px] border-jade-ink px-3 font-mono text-[10px] uppercase tracking-[0.14em]",
              liveSessionId
                ? "bg-jade-accent text-white shadow-[3px_3px_0_0_var(--jade-ink)]"
                : "bg-parchment hover:bg-muted",
            )}
          >
            {liveSessionId ? "● Open live table →" : "Launch live table →"}
          </Link>
        </div>
      </div>
    </li>
  )
}
