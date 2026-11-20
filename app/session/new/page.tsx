"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"

import { PLAYERS } from "@/lib/mock/jade-data"
import {
  SCHEDULE_VENUES,
  formatFeeIdr,
  type ScheduleLevel,
  type ScheduledMeet,
} from "@/lib/mock/jade-schedule"
import {
  loadBookingStore,
  publishMeet,
  saveBookingStore,
  type ScheduleBookingStore,
} from "@/lib/schedule/booking-store"
import {
  boardFromMeet,
  seatsFromMeetRoster,
} from "@/lib/session/apply-schedule-meet"
import {
  DEFAULT_SESSION_TITLE,
  QUICK_SELECT_PLAYERS,
  WIND_META,
  createLiveSession,
  saveLiveSession,
  windsForSeatCount,
  type LiveBoard,
  type LiveWind,
} from "@/lib/session/live-demo"
import { cn } from "@/lib/utils"

type SeatDraft = {
  wind: LiveWind
  playerId: string | null
  name: string
  nickname: string
  guestDraft: string
}

type SetupMode = "schedule" | "live"

const LEVEL_OPTIONS: {
  id: ScheduleLevel
  filter: ScheduledMeet["levelFilter"]
  label: string
}[] = [
  { id: "BEGINNER", filter: "beginner", label: "Beginner" },
  { id: "ALL LEVELS", filter: "open", label: "All levels" },
  { id: "ADVANCED MCR", filter: "advanced-mcr", label: "Advanced MCR" },
  { id: "GUIDED · MENTOR", filter: "guided", label: "Guided" },
]

function emptySeats(seatCount: 3 | 4): SeatDraft[] {
  return windsForSeatCount(seatCount).map((wind) => ({
    wind,
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
  const [store, setStore] = useState<ScheduleBookingStore | null>(null)
  const [mode, setMode] = useState<SetupMode>("schedule")

  // Schedule-for-later fields
  // EDIT HERE — default host template for a future meet
  const [title, setTitle] = useState("Friday Teluk Beginner")
  const [date, setDate] = useState(defaultDateOffset(2))
  const [startTime, setStartTime] = useState("13:00")
  const [endTime, setEndTime] = useState("16:00")
  const [location, setLocation] = useState<string>(SCHEDULE_VENUES[0])
  const [levelId, setLevelId] = useState<ScheduleLevel>("BEGINNER")
  const [proOnly, setProOnly] = useState(true)
  const [tables, setTables] = useState(1)
  const [feeIdr, setFeeIdr] = useState(50_000)

  // Go-live-now fields
  const [liveTitle, setLiveTitle] = useState(DEFAULT_SESSION_TITLE)
  const [board, setBoard] = useState<LiveBoard>("advanced")
  const [seatCount, setSeatCount] = useState<3 | 4>(4)
  const [seats, setSeats] = useState<SeatDraft[]>(() => emptySeats(4))
  const [error, setError] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    setStore(loadBookingStore())
  }, [])

  useEffect(() => {
    if (!store || booted) return
    const modeParam = searchParams.get("mode")
    const meetId = searchParams.get("meet")
    const titleParam = searchParams.get("title")

    if (modeParam === "live" || meetId) {
      setMode("live")
      const meet = store.meets.find((entry) => entry.id === meetId)
      if (meet) {
        setLiveTitle(meet.title)
        setBoard(boardFromMeet(meet))
        setSeatCount(4)
        setSeats(seatsFromMeetRoster(meet, 4))
      } else if (titleParam) {
        setLiveTitle(titleParam)
      }
    }
    setBooted(true)
  }, [store, searchParams, booted])

  const levelMeta = LEVEL_OPTIONS.find((entry) => entry.id === levelId) ?? LEVEL_OPTIONS[0]
  const seatCap = tables * 4

  const chipPool = useMemo(() => {
    const fromHouse = PLAYERS.slice(0, 8).map((player) => ({
      id: player.id,
      name: player.name,
      nickname: player.nickname,
    }))
    return [...QUICK_SELECT_PLAYERS, ...fromHouse]
  }, [])

  function setSeatCountAndReset(next: 3 | 4) {
    setSeatCount(next)
    setSeats(emptySeats(next))
  }

  function assignChip(
    seatIndex: number,
    chip: { id: string; name: string; nickname: string },
  ) {
    setSeats((prev) => {
      const cleared = prev.map((seat) =>
        seat.playerId === chip.id
          ? { ...seat, playerId: null, name: "", nickname: "", guestDraft: "" }
          : seat,
      )
      return cleared.map((seat, index) =>
        index === seatIndex
          ? {
              ...seat,
              playerId: chip.id,
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
          playerId: `guest-${name.toLowerCase().replace(/\s+/g, "-")}`,
          name,
          nickname: name.split(" ")[0] ?? name,
          guestDraft: "",
        }
      }),
    )
  }

  function publishToSchedule() {
    if (!store) return
    if (!title.trim() || !date || !startTime || !endTime || !location.trim()) {
      setError("Fill title, date, time, and location.")
      return
    }
    if (endTime <= startTime) {
      setError("End time must be after start time.")
      return
    }
    setError(null)
    const result = publishMeet(store, {
      title,
      date,
      startTime,
      endTime,
      location,
      level: levelMeta.id,
      levelFilter: levelMeta.filter,
      feeIdr,
      tables,
      seatCap,
      proOnly,
    })
    saveBookingStore(result.store)
    setStore(result.store)
    router.push("/schedule")
  }

  function openLiveTable() {
    const missing = seats.find((seat) => !seat.name.trim())
    if (missing) {
      setError(
        `Assign a player to ${WIND_META[missing.wind].label} before opening.`,
      )
      return
    }
    setError(null)
    const session = createLiveSession({
      title: liveTitle,
      board,
      seatCount,
      seats: seats.map(({ wind, playerId, name, nickname }) => ({
        wind,
        playerId,
        name,
        nickname,
      })),
    })
    saveLiveSession(session)
    router.push("/session/live")
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
              onClick={publishToSchedule}
              className="scan-cta-accent inline-flex h-12 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              Publish to schedule →
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
                Seat assignment
              </h2>
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
                            index !== seatIndex && other.playerId === chip.id,
                        )
                        const active = seat.playerId === chip.id
                        return (
                          <button
                            key={chip.id}
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
              onClick={openLiveTable}
              className="scan-cta inline-flex h-12 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              Open table & start session →
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
