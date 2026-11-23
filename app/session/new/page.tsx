"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"

import {
  SCHEDULE_VENUES,
  formatFeeIdr,
  type ScheduleLevel,
} from "@/lib/mock/jade-schedule"
import {
  DEFAULT_MEET_FEE_IDR,
  DEFAULT_MEET_LOCATION,
  type ApiMeet,
  type ApiMeetBoardType,
} from "@/lib/schedule/types"
import {
  DEFAULT_SESSION_TITLE,
  WIND_META,
  windsForSeatCount,
  type LiveBoard,
  type LiveWind,
} from "@/lib/session/live-demo"
import { cn } from "@/lib/utils"

type ClubMember = {
  userId: string
  playerId: string | null
  name: string
  nickname: string
}

type SeatDraft = {
  wind: LiveWind
  /** Club User.id when seated from members roster */
  userId: string | null
  playerId: string | null
  name: string
  nickname: string
  guestDraft: string
}

type SetupMode = "schedule" | "live"

const LEVEL_OPTIONS: {
  id: ScheduleLevel
  boardType: ApiMeetBoardType
  label: string
}[] = [
  { id: "BEGINNER", boardType: "BEGINNER", label: "Beginner" },
  { id: "ALL LEVELS", boardType: "ADVANCED", label: "All levels" },
  { id: "ADVANCED MCR", boardType: "MCR", label: "Advanced MCR" },
  { id: "GUIDED · MENTOR", boardType: "GUIDED", label: "Guided" },
]

function buildDateLabel(date: string) {
  const value = new Date(`${date}T12:00:00+07:00`)
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(value)
}

function liveBoardFromApi(board: ApiMeetBoardType): LiveBoard {
  if (board === "MCR") return "mcr"
  if (board === "BEGINNER" || board === "GUIDED") return "beginner"
  return "advanced"
}

function emptySeats(seatCount: 3 | 4): SeatDraft[] {
  return windsForSeatCount(seatCount).map((wind) => ({
    wind,
    userId: null,
    playerId: null,
    name: "",
    nickname: "",
    guestDraft: "",
  }))
}

function defaultDateOffset(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Loading table setup…
          </p>
        </main>
      }
    >
      <NewSessionForm />
    </Suspense>
  )
}

function NewSessionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<SetupMode>("schedule")
  const [publishing, setPublishing] = useState(false)
  const [opening, setOpening] = useState(false)
  const [meetId, setMeetId] = useState<string | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [membersError, setMembersError] = useState<string | null>(null)

  // Schedule-for-later fields
  // EDIT HERE — default host template for a future meet
  const [title, setTitle] = useState("Friday Teluk Beginner")
  const [date, setDate] = useState(defaultDateOffset(1))
  const [startTime, setStartTime] = useState("13:00")
  const [endTime, setEndTime] = useState("16:00")
  const [location, setLocation] = useState<string>(
    SCHEDULE_VENUES[0] ?? DEFAULT_MEET_LOCATION,
  )
  const [levelId, setLevelId] = useState<ScheduleLevel>("BEGINNER")
  const [proOnly, setProOnly] = useState(true)
  const [tables, setTables] = useState(1)
  const [feeIdr, setFeeIdr] = useState(DEFAULT_MEET_FEE_IDR)

  // Go-live-now fields
  const [liveTitle, setLiveTitle] = useState(DEFAULT_SESSION_TITLE)
  const [board, setBoard] = useState<LiveBoard>("advanced")
  const [seatCount, setSeatCount] = useState<3 | 4>(4)
  const [seats, setSeats] = useState<SeatDraft[]>(() => emptySeats(4))
  const [error, setError] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    if (booted) return
    const modeParam = searchParams.get("mode")
    const meetParam = searchParams.get("meet")
    const titleParam = searchParams.get("title")

    if (modeParam === "live" || meetParam || titleParam) {
      setMode("live")
      if (titleParam) setLiveTitle(titleParam)
      if (meetParam) setMeetId(meetParam)

      if (meetParam) {
        void fetch(`/api/sessions?meetId=${encodeURIComponent(meetParam)}`)
          .then(async (response) => {
            if (!response.ok) return null
            return (await response.json()) as {
              liveSession?: { id: string } | null
            }
          })
          .then((data) => {
            if (data?.liveSession?.id) {
              router.replace(`/session/live?id=${data.liveSession.id}`)
              return true
            }
            return false
          })
          .then((resumed) => {
            if (resumed) return
            void fetch("/api/schedule")
              .then((response) => response.json())
              .then((data: { meets?: ApiMeet[] }) => {
                const meet = data.meets?.find((entry) => entry.id === meetParam)
                if (!meet) return
                setLiveTitle(meet.title)
                setBoard(liveBoardFromApi(meet.boardType))
                const winds = windsForSeatCount(4)
                const roster = meet.roster.slice(0, 4)
                setSeatCount(4)
                setSeats(
                  winds.map((wind, index) => {
                    const player = roster[index]
                    if (!player) {
                      return {
                        wind,
                        userId: null,
                        playerId: null,
                        name: "",
                        nickname: "",
                        guestDraft: "",
                      }
                    }
                    return {
                      wind,
                      userId: player.userId,
                      playerId: null,
                      name: player.name,
                      nickname: player.nickname,
                      guestDraft: "",
                    }
                  }),
                )
              })
              .catch(() => undefined)
          })
          .catch(() => undefined)
      }
    }
    setBooted(true)
  }, [searchParams, booted])

  useEffect(() => {
    if (mode !== "live") return
    let cancelled = false
    void fetch("/api/members")
      .then(async (response) => {
        if (response.status === 401) {
          router.replace(
            `/login?next=${encodeURIComponent("/session/new?mode=live")}`,
          )
          return null
        }
        const data = (await response.json()) as {
          members?: ClubMember[]
          error?: string
        }
        if (!response.ok) throw new Error(data.error ?? "Could not load members")
        return data.members ?? []
      })
      .then((list) => {
        if (cancelled || !list) return
        setMembers(list)
        setMembersError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setMembersError(
          error instanceof Error ? error.message : "Could not load members",
        )
      })
    return () => {
      cancelled = true
    }
  }, [mode, router])

  const levelMeta = LEVEL_OPTIONS.find((entry) => entry.id === levelId) ?? LEVEL_OPTIONS[0]
  const seatCap = tables * 4

  const chipPool = useMemo(
    () =>
      members.map((member) => ({
        userId: member.userId,
        playerId: member.playerId,
        name: member.name,
        nickname: member.nickname,
      })),
    [members],
  )

  function setSeatCountAndReset(next: 3 | 4) {
    setSeatCount(next)
    setSeats(emptySeats(next))
  }

  function assignChip(
    seatIndex: number,
    chip: {
      userId: string
      playerId: string | null
      name: string
      nickname: string
    },
  ) {
    setSeats((prev) => {
      const cleared = prev.map((seat) =>
        seat.userId === chip.userId
          ? {
              ...seat,
              userId: null,
              playerId: null,
              name: "",
              nickname: "",
              guestDraft: "",
            }
          : seat,
      )
      return cleared.map((seat, index) =>
        index === seatIndex
          ? {
              ...seat,
              userId: chip.userId,
              playerId: chip.playerId,
              name: chip.name,
              nickname: chip.nickname,
              guestDraft: "",
            }
          : seat,
      )
    })
  }

  function applyGuest(seatIndex: number) {
    setSeats((prev) =>
      prev.map((seat, index) => {
        if (index !== seatIndex) return seat
        const name = seat.guestDraft.trim()
        if (!name) return seat
        return {
          ...seat,
          userId: null,
          playerId: null,
          name,
          nickname: name.split(" ")[0] ?? name,
          guestDraft: "",
        }
      }),
    )
  }

  async function publishToSchedule() {
    if (!title.trim() || !date || !startTime || !endTime || !location.trim()) {
      setError("Fill title, date, time, and location.")
      return
    }
    if (endTime <= startTime) {
      setError("End time must be after start time.")
      return
    }
    setPublishing(true)
    setError(null)
    try {
      const startsAt = new Date(`${date}T${startTime}:00+07:00`)
      const endsAt = new Date(`${date}T${endTime}:00+07:00`)
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dateLabel: buildDateLabel(date),
          startTime,
          endTime,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          location: location.trim() || DEFAULT_MEET_LOCATION,
          boardType: levelMeta.boardType,
          maxSeats: seatCap,
          tables,
          feeIdr,
          proOnly,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not publish meet (admin login required)")
        return
      }
      router.push("/schedule")
      router.refresh()
    } catch {
      setError("Network error publishing meet")
    } finally {
      setPublishing(false)
    }
  }

  async function openLiveTable() {
    const missing = seats.find((seat) => !seat.name.trim())
    if (missing) {
      setError(
        `Assign a player to ${WIND_META[missing.wind].label} before opening.`,
      )
      return
    }
    setOpening(true)
    setError(null)
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: liveTitle.trim() || DEFAULT_SESSION_TITLE,
          board,
          meetId,
          seats: seats.map(({ wind, userId, playerId, name, nickname }) => {
            if (userId) {
              return { wind, userId, playerId, name, nickname }
            }
            return { wind, guestName: name, name, nickname }
          }),
        }),
      })
      const data = (await response.json()) as {
        error?: string
        session?: { id: string }
      }
      if (!response.ok || !data.session?.id) {
        setError(data.error ?? "Could not open table (login required)")
        return
      }
      router.push(`/session/live?id=${data.session.id}`)
      router.refresh()
    } catch {
      setError("Network error opening table")
    } finally {
      setOpening(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Session · Setup
      </p>
      <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] tracking-tight sm:text-6xl">
        Start a table
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed">
        Post a future meet for booking — e.g. Friday 13:00 at Teluk, Beginner,
        Pro only — or open a live table right now.
      </p>
      <div className="jade-divider mt-6" />

      <div className="jade-card mt-8 space-y-6 p-5 sm:p-6">
        <fieldset>
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em]">
            What are you creating?
          </legend>
          <div className="mt-2 flex border-[2px] border-jade-ink">
            {(
              [
                ["schedule", "Schedule for later"],
                ["live", "Go live now"],
              ] as const
            ).map(([id, label], index) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id)
                  setError(null)
                }}
                className={cn(
                  "flex-1 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em]",
                  index > 0 && "border-l-[2px] border-jade-ink",
                  mode === id
                    ? "bg-jade-accent text-white"
                    : "bg-card text-jade-ink hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {mode === "schedule" ? (
          <>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Session title / event
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-parchment px-3 font-serif text-xl outline-none"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  Date
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-parchment px-3 font-mono text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  Start
                </span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-parchment px-3 font-mono text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  End
                </span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-parchment px-3 font-mono text-sm outline-none"
                />
              </label>
            </div>

            <fieldset>
              <legend className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Location
              </legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SCHEDULE_VENUES.map((venue) => (
                  <button
                    key={venue}
                    type="button"
                    onClick={() => setLocation(venue)}
                    className={cn(
                      "border border-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em]",
                      location === venue
                        ? "bg-jade-ink text-white"
                        : "bg-parchment hover:bg-muted",
                    )}
                  >
                    {venue.split(" · ")[0] ?? venue}
                  </button>
                ))}
              </div>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="mt-2 h-11 w-full border-[2px] border-jade-ink bg-parchment px-3 text-sm outline-none"
                placeholder="e.g. Teluk Betung · Jade Table"
              />
            </fieldset>

            <fieldset>
              <legend className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Level
              </legend>
              <div className="mt-2 flex flex-wrap border-[2px] border-jade-ink">
                {LEVEL_OPTIONS.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLevelId(option.id)}
                    className={cn(
                      "flex-1 px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] sm:px-3 sm:text-[11px]",
                      index > 0 && "border-l-[2px] border-jade-ink",
                      levelId === option.id
                        ? "bg-jade-ink text-white"
                        : "bg-card hover:bg-muted",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Who can book
              </legend>
              <div className="mt-2 flex border-[2px] border-jade-ink">
                <button
                  type="button"
                  onClick={() => setProOnly(false)}
                  className={cn(
                    "flex-1 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em]",
                    !proOnly
                      ? "bg-jade-ink text-white"
                      : "bg-card hover:bg-muted",
                  )}
                >
                  Open to all
                </button>
                <button
                  type="button"
                  onClick={() => setProOnly(true)}
                  className={cn(
                    "flex-1 border-l-[2px] border-jade-ink px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em]",
                    proOnly
                      ? "bg-jade-gold text-jade-ink"
                      : "bg-card hover:bg-muted",
                  )}
                >
                  Pro only
                </button>
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  Tables
                </span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={tables}
                  onChange={(event) =>
                    setTables(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-parchment px-3 font-mono outline-none"
                />
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {seatCap} seats ({tables} × 4)
                </p>
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  Fee (IDR)
                </span>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={feeIdr}
                  onChange={(event) =>
                    setFeeIdr(Math.max(0, Number(event.target.value) || 0))
                  }
                  className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-parchment px-3 font-mono outline-none"
                />
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Shows as {formatFeeIdr(feeIdr)}
                </p>
              </label>
            </div>

            <div className="jade-card-accent p-3 text-sm leading-relaxed">
              Preview: <span className="font-serif text-lg">{title || "Untitled"}</span>
              <br />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {date} · {startTime}–{endTime} · {location} · {levelMeta.label}
                {proOnly ? " · Pro only" : " · Open"}
              </span>
            </div>

            {error ? (
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={publishing}
              onClick={() => void publishToSchedule()}
              className="scan-cta-accent inline-flex h-12 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50"
            >
              {publishing ? "Publishing…" : "Publish to schedule →"}
            </button>
          </>
        ) : (
          <>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Session title / event
              </span>
              <input
                value={liveTitle}
                onChange={(event) => setLiveTitle(event.target.value)}
                className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-parchment px-3 font-serif text-xl outline-none"
              />
            </label>

            <fieldset>
              <legend className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Ruleset / board
              </legend>
              <div className="mt-2 flex border-[2px] border-jade-ink">
                {(
                  [
                    ["beginner", "Beginner"],
                    ["advanced", "Advanced"],
                    ["mcr", "MCR"],
                  ] as const
                ).map(([id, label], index) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBoard(id)}
                    className={cn(
                      "flex-1 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em]",
                      index > 0 && "border-l-[2px] border-jade-ink",
                      board === id
                        ? "bg-jade-ink text-white"
                        : "bg-card text-jade-ink hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Table size
              </legend>
              <div className="mt-2 flex border-[2px] border-jade-ink">
                {(
                  [
                    [4, "4-seat table"],
                    [3, "3-seat table"],
                  ] as const
                ).map(([count, label], index) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSeatCountAndReset(count)}
                    className={cn(
                      "flex-1 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em]",
                      index > 0 && "border-l-[2px] border-jade-ink",
                      seatCount === count
                        ? "bg-jade-accent text-white"
                        : "bg-card text-jade-ink hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <section aria-label="Seat assignment">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Seat assignment · club accounts
              </h2>
              {membersError ? (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red">
                  {membersError}
                </p>
              ) : null}
              {chipPool.length === 0 && !membersError ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading members from Postgres…
                </p>
              ) : null}
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {seats.map((seat, seatIndex) => (
                  <li
                    key={seat.wind}
                    className="border-[2px] border-jade-ink bg-card p-3 shadow-[3px_3px_0_0_var(--jade-ink)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "grid size-9 place-items-center border-[2px] border-jade-ink font-serif text-lg",
                          seat.wind === "east"
                            ? "bg-jade-gold text-jade-ink"
                            : "bg-parchment",
                        )}
                      >
                        {WIND_META[seat.wind].badge}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {WIND_META[seat.wind].label}
                          {seat.wind === "east" ? " · Dealer" : ""}
                          {seat.userId ? " · member" : seat.name ? " · guest" : ""}
                        </p>
                        <p className="truncate font-serif text-xl leading-none">
                          {seat.name || "Empty seat"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chipPool.map((chip) => {
                        const takenElsewhere = seats.some(
                          (other, index) =>
                            index !== seatIndex && other.userId === chip.userId,
                        )
                        const active = seat.userId === chip.userId
                        return (
                          <button
                            key={chip.userId}
                            type="button"
                            disabled={takenElsewhere}
                            onClick={() => assignChip(seatIndex, chip)}
                            className={cn(
                              "border border-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] disabled:opacity-35",
                              active
                                ? "bg-jade-ink text-white"
                                : "bg-parchment hover:bg-muted",
                            )}
                          >
                            {chip.nickname}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={seat.guestDraft}
                        onChange={(event) =>
                          setSeats((prev) =>
                            prev.map((entry, index) =>
                              index === seatIndex
                                ? { ...entry, guestDraft: event.target.value }
                                : entry,
                            ),
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            applyGuest(seatIndex)
                          }
                        }}
                        placeholder="Guest name"
                        className="h-9 flex-1 border-[2px] border-jade-ink bg-parchment px-2 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => applyGuest(seatIndex)}
                        className="border-[2px] border-jade-ink bg-card px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
                      >
                        Add
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {error ? (
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={opening}
              onClick={() => void openLiveTable()}
              className="scan-cta inline-flex h-12 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50"
            >
              {opening ? "Opening table…" : "Open table & start session →"}
            </button>
          </>
        )}

        <p className="text-center text-sm">
          <Link href="/schedule" className="underline">
            Schedule & booking
          </Link>
          {" · "}
          <Link href="/leaderboard" className="underline">
            Leaderboard
          </Link>
        </p>
      </div>
    </main>
  )
}
