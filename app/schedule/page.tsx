"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { BookSeatModal } from "@/components/schedule/book-seat-modal"
import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import {
  formatFeeIdr,
  type ScheduleLevelFilter,
  type ScheduledMeet,
} from "@/lib/mock/jade-schedule"
import {
  bookSeat,
  canBookMeet,
  cancelSeat,
  earlyBirdRemainingMs,
  formatCountdown,
  joinWaitlist,
  launchLiveHref,
  leaveWaitlist,
  loadBookingStore,
  saveBookingStore,
  type MemberView,
  type PaymentMethod,
  type ScheduleBookingStore,
} from "@/lib/schedule/booking-store"
import { cn } from "@/lib/utils"

const FILTERS: { id: ScheduleLevelFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "beginner", label: "Beginner" },
  { id: "advanced-mcr", label: "Advanced MCR" },
  { id: "guided", label: "Guided table" },
]

export default function SchedulePage() {
  const [store, setStore] = useState<ScheduleBookingStore | null>(null)
  const [filter, setFilter] = useState<ScheduleLevelFilter>("all")
  const [now, setNow] = useState(Date.now())
  const [bookingMeetId, setBookingMeetId] = useState<string | null>(null)
  const [proOpen, setProOpen] = useState(false)

  useEffect(() => {
    setStore(loadBookingStore())
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  function persist(next: ScheduleBookingStore) {
    setStore(next)
    saveBookingStore(next)
  }

  function setMemberView(view: MemberView) {
    if (!store) return
    persist({ ...store, memberView: view })
  }

  const filtered = useMemo(() => {
    if (!store) return []
    if (filter === "all") return store.meets
    return store.meets.filter((meet) => meet.levelFilter === filter)
  }, [store, filter])

  const bookingMeet = store?.meets.find((meet) => meet.id === bookingMeetId) ?? null

  if (!store) {
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
            House calendar
          </p>
          <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl">
            Schedule & booking
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed">
            Lock your seat for upcoming Jade Mahjong sessions. No more WhatsApp
            lists.
          </p>
        </div>

        <div
          className="flex shrink-0 border-[2px] border-jade-ink bg-card"
          role="group"
          aria-label="Demo member view"
        >
          <span className="border-r-[2px] border-jade-ink px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Viewing as
          </span>
          {(
            [
              ["free", "Free member"],
              ["pro", "Pro member"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMemberView(id)}
              className={cn(
                "px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
                store.memberView === id
                  ? "bg-jade-gold text-jade-ink"
                  : "bg-card hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative mt-6 flex flex-wrap border-[2px] border-jade-ink"
        role="tablist"
        aria-label="Level filter"
      >
        {FILTERS.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={filter === entry.id}
            onClick={() => setFilter(entry.id)}
            className={cn(
              "px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
              index > 0 && "border-l-[2px] border-jade-ink",
              filter === entry.id
                ? "bg-jade-ink text-white"
                : "bg-card hover:bg-muted",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="jade-divider mt-6" />

      <ul className="mt-8 grid gap-5 lg:grid-cols-2">
        {filtered.map((meet) => (
          <MeetCard
            key={meet.id}
            meet={meet}
            memberView={store.memberView}
            earlyBirdStartedAt={store.earlyBirdStartedAt}
            now={now}
            booking={store.bookings[meet.id]}
            onBook={() => setBookingMeetId(meet.id)}
            onCancel={() => persist(cancelSeat(store, meet.id))}
            onWaitlist={() => persist(joinWaitlist(store, meet.id))}
            onLeaveWaitlist={() => persist(leaveWaitlist(store, meet.id))}
            onLocked={() => setProOpen(true)}
          />
        ))}
      </ul>

      <BookSeatModal
        open={Boolean(bookingMeetId && bookingMeet)}
        meet={bookingMeet}
        seatNumber={(bookingMeet?.confirmed.length ?? 0) + 1}
        onClose={() => setBookingMeetId(null)}
        onConfirm={(method: PaymentMethod) => {
          if (!bookingMeetId) return null
          const result = bookSeat(store, bookingMeetId, method)
          if (!result) return null
          persist(result.store)
          return {
            seatNumber: result.seatNumber,
            checkInCode: result.checkInCode,
          }
        }}
      />

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        onSwitchPro={() => setMemberView("pro")}
      />
    </main>
  )
}

function MeetCard({
  meet,
  memberView,
  earlyBirdStartedAt,
  now,
  booking,
  onBook,
  onCancel,
  onWaitlist,
  onLeaveWaitlist,
  onLocked,
}: {
  meet: ScheduledMeet
  memberView: MemberView
  earlyBirdStartedAt: number
  now: number
  booking: ScheduleBookingStore["bookings"][string]
  onBook: () => void
  onCancel: () => void
  onWaitlist: () => void
  onLeaveWaitlist: () => void
  onLocked: () => void
}) {
  const filled = meet.confirmed.length
  const full = filled >= meet.seatCap
  const remaining = earlyBirdRemainingMs(meet, earlyBirdStartedAt, now)
  const earlyBirdActive = meet.proEarlyBird && remaining > 0
  const unlocked = canBookMeet(meet, memberView, earlyBirdStartedAt, now)
  const youBooked = Boolean(booking?.yourSeatNumber)
  const youWaiting = Boolean(booking?.onWaitlist)
  const preview = meet.confirmed.slice(0, 4)
  const more = Math.max(0, meet.confirmed.length - preview.length)
  const progress = Math.min(100, Math.round((filled / meet.seatCap) * 100))

  return (
    <li className="jade-card flex flex-col overflow-hidden">
      {meet.proOnly ? (
        <div className="border-b-[2px] border-jade-ink bg-jade-gold px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
          ★ Pro only{meet.hostCreated ? " · Host listing" : ""}
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
            {meet.level}
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
              {filled} / {meet.seatCap} seats filled ({meet.tables} tables)
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 border-[2px] border-jade-ink bg-parchment">
            <div
              className={cn(
                "h-full",
                full ? "bg-jade-red" : "bg-jade-accent",
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
            {preview.map((player) => (
              <li
                key={player.id}
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
            ))}
            {more > 0 ? (
              <li className="inline-flex items-center border border-dashed border-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                +{more} more
              </li>
            ) : null}
          </ul>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-5">
          {youBooked ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center border-[2px] border-jade-accent bg-jade-accent px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white"
            >
              ✓ Seat confirmed (cancel)
            </button>
          ) : !unlocked ? (
            <button
              type="button"
              onClick={onLocked}
              className="inline-flex h-11 items-center justify-center border-[2px] border-jade-ink bg-muted px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              {meet.proOnly
                ? "🔒 Pro only (upgrade)"
                : "🔒 Pro early-bird only (upgrade)"}
            </button>
          ) : full ? (
            youWaiting ? (
              <button
                type="button"
                onClick={onLeaveWaitlist}
                className="inline-flex h-11 items-center justify-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
              >
                ✓ On waitlist ({meet.waitlist.length} waiting) · leave
              </button>
            ) : (
              <button
                type="button"
                onClick={onWaitlist}
                className="inline-flex h-11 items-center justify-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
              >
                Join waitlist ({meet.waitlist.length} waiting)
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
            href={launchLiveHref(meet)}
            className="inline-flex h-10 items-center justify-center border-[2px] border-jade-ink bg-parchment px-3 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-muted"
          >
            Launch live table →
          </Link>
        </div>
      </div>
    </li>
  )
}
