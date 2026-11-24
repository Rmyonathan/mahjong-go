"use client"

import { useEffect, useState } from "react"
import { RulesetPicker } from "@/components/mahjong/ruleset-picker"
import {
  LIVE_SESSION_HOURS_FREE,
  LIVE_SESSION_HOURS_PRO,
} from "@/lib/membership"
import type { RuleVariant } from "@/lib/mahjong/types"
import { rulesetToDb } from "@/lib/mahjong/rulesets"
import {
  DEFAULT_MEET_FEE_IDR,
  DEFAULT_MEET_LOCATION,
  formatFeeIdr,
} from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

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

type MemberOption = { id: string; name: string; nickname?: string }

export function CreateMeetModal({
  open,
  onClose,
  onCreated,
  isClubOwner = false,
  isProHost = false,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  isClubOwner?: boolean
  isProHost?: boolean
}) {
  // EDIT HERE — host create defaults
  const [title, setTitle] = useState("Friday Teluk")
  const [date, setDate] = useState(defaultDateOffset(1))
  const [startTime, setStartTime] = useState("13:00")
  const [location, setLocation] = useState(DEFAULT_MEET_LOCATION)
  const [scoringRuleset, setScoringRuleset] =
    useState<RuleVariant>("jade-hk")
  const [tables, setTables] = useState(1)
  const [feeIdr, setFeeIdr] = useState(DEFAULT_MEET_FEE_IDR)
  const [proOnly, setProOnly] = useState(false)
  const [earlyBirdHours, setEarlyBirdHours] = useState(2)
  const [captainId, setCaptainId] = useState("")
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC")
  const [members, setMembers] = useState<MemberOption[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdInvite, setCreatedInvite] = useState<string | null>(null)

  // EDIT HERE — mirrors LIVE_SESSION_HOURS_* in lib/membership.ts
  const hostTier = isClubOwner ? "club" : isProHost ? "pro" : "free"
  const liveHours =
    hostTier === "club"
      ? null
      : hostTier === "pro"
        ? LIVE_SESSION_HOURS_PRO
        : LIVE_SESSION_HOURS_FREE
  const scanLabel =
    hostTier === "free" ? "3 scans (Free host)" : "Unlimited scans"
  const liveLengthLabel =
    liveHours == null
      ? "Unlimited — club tables never auto-end"
      : `${liveHours} hours then auto-ends`

  useEffect(() => {
    if (open) {
      document.body.dataset.createMeetModal = "1"
    } else {
      delete document.body.dataset.createMeetModal
    }
    return () => {
      delete document.body.dataset.createMeetModal
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setError(null)
    setPending(false)
    setCreatedInvite(null)
    if (isClubOwner) {
      void fetch("/api/members")
        .then(async (response) => {
          if (!response.ok) return
          const data = (await response.json()) as {
            members?: Array<{
              userId?: string
              id?: string
              name: string
              nickname?: string
            }>
          }
          setMembers(
            (data.members ?? []).map((m) => ({
              id: m.userId ?? m.id ?? "",
              name: m.name,
              nickname: m.nickname,
            })).filter((m) => m.id),
          )
        })
        .catch(() => {})
    }
  }, [open, isClubOwner])

  if (!open) return null

  const maxSeats = tables * 4

  async function submit() {
    if (!title.trim() || !date || !startTime) {
      setError("Fill title, date, and start time.")
      return
    }
    setPending(true)
    setError(null)
    try {
      const startsAt = new Date(`${date}T${startTime}:00+07:00`)
      // End is derived from live-table length (Free 2h / Pro 24h / Club calendar +8h)
      const endSpanHours = liveHours ?? 8
      const endsAt = new Date(
        startsAt.getTime() + endSpanHours * 60 * 60 * 1000,
      )
      const [startH, startM] = startTime.split(":").map(Number)
      const endTotal = (startH * 60 + startM + endSpanHours * 60) % (24 * 60)
      const endTime = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`
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
          boardType: "BEGINNER",
          scoringRuleset: rulesetToDb(scoringRuleset),
          maxSeats,
          tables,
          feeIdr: isClubOwner ? feeIdr : 0,
          proOnly: isClubOwner ? proOnly : false,
          proEarlyBirdUntil: isClubOwner ? proEarlyBirdUntil : null,
          captainId: isClubOwner && captainId ? captainId : null,
          visibility,
        }),
      })
      const data = (await response.json()) as {
        error?: string
        meet?: { inviteCode?: string | null }
      }
      if (!response.ok) {
        setError(data.error ?? "Could not create meet")
        return
      }
      if (data.meet?.inviteCode) {
        setCreatedInvite(data.meet.inviteCode)
        onCreated()
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

  const inputClass =
    "mt-1.5 h-11 w-full rounded-xl border border-[#102A20]/15 bg-white px-3 text-sm outline-none ring-jade-accent/30 focus:border-jade-accent focus:ring-2"

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close create meet"
        className="absolute inset-0 bg-jade-ink/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-meet-title"
        className="relative z-10 flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#102A20]/12 bg-[#F6F4EE] shadow-[0_-8px_40px_-12px_rgba(16,42,32,0.35)] sm:max-h-[90vh] sm:rounded-2xl sm:border-[2px] sm:border-jade-ink sm:shadow-[8px_8px_0_0_var(--jade-ink)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#102A20]/10 px-4 py-3 sm:border-jade-ink sm:border-b-[2px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {isClubOwner ? "Club table" : "Casual table"}
            </p>
            <h2 id="create-meet-title" className="font-serif text-2xl">
              Create meet
            </h2>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={cn(inputClass, "font-serif text-lg")}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={cn(inputClass, "font-mono")}
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
                className={cn(inputClass, "font-mono")}
              />
            </label>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            End time is set automatically from your host tier below.
          </p>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Location
            </span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={inputClass}
            />
          </label>

          <div className="rounded-2xl border border-[#102A20]/10 bg-white p-3">
            <RulesetPicker
              compact
              value={scoringRuleset}
              onChange={setScoringRuleset}
            />
          </div>

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
                className={cn(inputClass, "font-mono")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {maxSeats} seats · 4 players per table
              </p>
            </label>
            {isClubOwner ? (
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  Seat fee (QRIS)
                </span>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={feeIdr}
                  onChange={(event) =>
                    setFeeIdr(Math.max(0, Number(event.target.value) || 0))
                  }
                  className={cn(inputClass, "font-mono")}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatFeeIdr(feeIdr)} per seat when guests book
                </p>
              </label>
            ) : (
              <p className="rounded-2xl border border-[#102A20]/10 bg-white p-3 text-xs leading-relaxed text-muted-foreground">
                Free player table — no booking QRIS. Only club can charge seats.
              </p>
            )}
          </div>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Who can find this?
            </legend>
            <div className="mt-2 flex gap-2 rounded-xl border border-[#102A20]/10 bg-white p-1">
              <button
                type="button"
                onClick={() => setVisibility("PUBLIC")}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2.5 text-xs font-medium transition",
                  visibility === "PUBLIC"
                    ? "bg-jade-accent text-white"
                    : "text-jade-ink hover:bg-jade-soft/50",
                )}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setVisibility("PRIVATE")}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2.5 text-xs font-medium transition",
                  visibility === "PRIVATE"
                    ? "bg-jade-ink text-white"
                    : "text-jade-ink hover:bg-jade-soft/50",
                )}
              >
                Invite only
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {visibility === "PRIVATE"
                ? "Share an invite code after you publish."
                : "Listed on the public schedule."}
            </p>
          </fieldset>

          <details className="rounded-2xl border border-[#102A20]/10 bg-white p-3 text-sm open:pb-4">
            <summary className="cursor-pointer list-none font-medium text-jade-ink [&::-webkit-details-marker]:hidden">
              Host perks &amp; limits
            </summary>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>
                <strong className="font-normal text-jade-ink">Live length:</strong>{" "}
                {liveLengthLabel}
              </li>
              <li>
                <strong className="font-normal text-jade-ink">Camera scans:</strong>{" "}
                {scanLabel}
                {isClubOwner ? " — choose a captain below." : ""}
              </li>
              {hostTier === "free" ? (
                <li>
                  Pro hosts get {LIVE_SESSION_HOURS_PRO}h tables and unlimited scans.
                </li>
              ) : null}
            </ul>
          </details>

          {createdInvite ? (
            <div className="rounded-xl border border-jade-gold/40 bg-white p-4 text-sm">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-gold">
                Private invite ready
              </p>
              <p className="mt-2 font-mono text-lg font-semibold tracking-wide">
                {createdInvite}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Share this code so friends can unlock your table on Schedule.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-jade-accent text-sm font-semibold text-white"
                onClick={() => {
                  void navigator.clipboard.writeText(createdInvite)
                  onClose()
                }}
              >
                Copy code · Done
              </button>
            </div>
          ) : null}

          {isClubOwner ? (
            <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Club options
            </h3>
          ) : null}
          {isClubOwner ? (
            <>
              <div className="flex gap-2 rounded-xl border border-[#102A20]/10 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setProOnly(false)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-xs font-medium",
                    !proOnly ? "bg-jade-ink text-white" : "text-jade-ink",
                  )}
                >
                  Open to all
                </button>
                <button
                  type="button"
                  onClick={() => setProOnly(true)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-xs font-medium",
                    proOnly ? "bg-jade-gold text-jade-ink" : "text-jade-ink",
                  )}
                >
                  Pro only
                </button>
              </div>

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  Pro early bird (hours)
                </span>
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={earlyBirdHours}
                  onChange={(event) =>
                    setEarlyBirdHours(
                      Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                  className={cn(inputClass, "font-mono")}
                />
              </label>

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  Who runs the camera?
                </span>
                <select
                  value={captainId}
                  onChange={(event) => setCaptainId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Me (club owner)</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.nickname ?? member.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-jade-red/10 px-3 py-2 text-sm text-jade-red">
              {error}
            </p>
          ) : null}
        </div>

        {!createdInvite ? (
          <CreateMeetFooter pending={pending} onSubmit={submit} />
        ) : null}
      </div>
    </div>
  )
}

function CreateMeetFooter({
  pending,
  onSubmit,
}: {
  pending: boolean
  onSubmit: () => void
}) {
  return (
    <div className="shrink-0 border-t border-[#102A20]/10 bg-[#F6F4EE]/95 px-4 py-3 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:border-jade-ink sm:border-t-[2px]">
      <button
        type="button"
        disabled={pending}
        onClick={onSubmit}
        className="tap-press inline-flex h-12 w-full items-center justify-center rounded-full bg-jade-accent text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(22,121,76,0.65)] disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish meet"}
      </button>
    </div>
  )
}
