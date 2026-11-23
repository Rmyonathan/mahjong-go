"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import {
  DEFAULT_MEET_FEE_IDR,
  DEFAULT_MEET_LOCATION,
  formatFeeIdr,
  type ApiMeetBoardType,
} from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

const BOARDS: { id: ApiMeetBoardType; label: string }[] = [
  { id: "BEGINNER", label: "Beginner" },
  { id: "ADVANCED", label: "Advanced" },
  { id: "MCR", label: "MCR" },
  { id: "GUIDED", label: "Guided" },
]

function defaultDateOffset(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function buildDateLabel(date: string) {
  const value = new Date(`${date}T12:00:00+07:00`)
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(value)
}

export function CreateMeetModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  // EDIT HERE — host create defaults
  const [title, setTitle] = useState("Friday Teluk Beginner")
  const [date, setDate] = useState(defaultDateOffset(1))
  const [startTime, setStartTime] = useState("13:00")
  const [endTime, setEndTime] = useState("16:00")
  const [location, setLocation] = useState(DEFAULT_MEET_LOCATION)
  const [boardType, setBoardType] = useState<ApiMeetBoardType>("BEGINNER")
  const [tables, setTables] = useState(1)
  const [feeIdr, setFeeIdr] = useState(DEFAULT_MEET_FEE_IDR)
  const [proOnly, setProOnly] = useState(false)
  const [earlyBirdHours, setEarlyBirdHours] = useState(2)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setPending(false)
  }, [open])

  if (!open) return null

  const maxSeats = tables * 4

  async function submit() {
    if (!title.trim() || !date || !startTime || !endTime) {
      setError("Fill title, date, and times.")
      return
    }
    if (endTime <= startTime) {
      setError("End time must be after start time.")
      return
    }
    setPending(true)
    setError(null)
    try {
      const startsAt = new Date(`${date}T${startTime}:00+07:00`)
      const endsAt = new Date(`${date}T${endTime}:00+07:00`)
      const proEarlyBirdUntil =
        earlyBirdHours > 0
          ? new Date(Date.now() + earlyBirdHours * 60 * 60 * 1000).toISOString()
          : null

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
          boardType,
          maxSeats,
          tables,
          feeIdr,
          proOnly,
          proEarlyBirdUntil,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not create meet")
        return
      }
      onCreated()
      onClose()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close create meet"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[94vh] w-full max-w-lg overflow-y-auto border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4">
        <div className="sticky top-0 flex items-center justify-between border-b-[2px] border-jade-ink bg-parchment px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Host desk
            </p>
            <h2 className="font-serif text-2xl">Create meet</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-card px-3 font-serif text-xl outline-none"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-2 font-mono text-sm"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Start
              </span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-2 font-mono text-sm"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                End
              </span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-2 font-mono text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Location
            </span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-3 text-sm outline-none"
            />
          </label>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Board
            </legend>
            <div className="mt-2 flex flex-wrap border-[2px] border-jade-ink">
              {BOARDS.map((board, index) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => setBoardType(board.id)}
                  className={cn(
                    "flex-1 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em]",
                    index > 0 && "border-l-[2px] border-jade-ink",
                    boardType === board.id
                      ? "bg-jade-ink text-white"
                      : "bg-card hover:bg-muted",
                  )}
                >
                  {board.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
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
                className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-3 font-mono"
              />
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {maxSeats} seats
              </p>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
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
                className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-3 font-mono"
              />
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {formatFeeIdr(feeIdr)}
              </p>
            </label>
          </div>

          <div className="flex border-[2px] border-jade-ink">
            <button
              type="button"
              onClick={() => setProOnly(false)}
              className={cn(
                "flex-1 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
                !proOnly ? "bg-jade-ink text-white" : "bg-card",
              )}
            >
              Open to all
            </button>
            <button
              type="button"
              onClick={() => setProOnly(true)}
              className={cn(
                "flex-1 border-l-[2px] border-jade-ink px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
                proOnly ? "bg-jade-gold text-jade-ink" : "bg-card",
              )}
            >
              Pro only
            </button>
          </div>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Pro early-bird hours (default 2 · 0 = none)
            </span>
            <input
              type="number"
              min={0}
              max={72}
              value={earlyBirdHours}
              onChange={(event) =>
                setEarlyBirdHours(Math.max(0, Number(event.target.value) || 0))
              }
              className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-3 font-mono"
            />
          </label>

          {error ? (
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="scan-cta-accent inline-flex h-12 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50"
          >
            {pending ? "Publishing…" : "Publish meet"}
          </button>
        </div>
      </div>
    </div>
  )
}
