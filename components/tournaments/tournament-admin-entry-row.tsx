"use client"

import { useState } from "react"

import type { ApiTournamentEntry } from "@/lib/tournaments/types"

const STATUS_OPTIONS = [
  "ACTIVE",
  "ELIMINATED",
  "REVIVED",
  "CHAMPION",
] as const

export function TournamentAdminEntryControls({
  tournamentId,
  entry,
  onUpdated,
}: {
  tournamentId: string
  entry: ApiTournamentEntry
  onUpdated: () => void
}) {
  const initialStatus = STATUS_OPTIONS.includes(
    entry.status as (typeof STATUS_OPTIONS)[number],
  )
    ? entry.status
    : "ACTIVE"
  const [status, setStatus] = useState<ApiTournamentEntry["status"]>(
    initialStatus as ApiTournamentEntry["status"],
  )
  const [score, setScore] = useState(String(entry.score))
  const [pending, setPending] = useState(false)

  async function save() {
    setPending(true)
    try {
      const response = await fetch(`/api/tournaments/actions/entries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          entryId: entry.id,
          status: STATUS_OPTIONS.includes(
            status as (typeof STATUS_OPTIONS)[number],
          )
            ? status
            : undefined,
          score: Number(score) || 0,
          eliminatedRound:
            status === "ELIMINATED" ? entry.eliminatedRound ?? 1 : null,
        }),
      })
      if (response.ok) onUpdated()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <select
        value={status}
        onChange={(e) =>
          setStatus(e.target.value as ApiTournamentEntry["status"])
        }
        className="h-8 rounded border border-[#102A20]/15 bg-white px-2 font-mono text-[9px] uppercase"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={score}
        onChange={(e) => setScore(e.target.value)}
        className="h-8 w-16 rounded border border-[#102A20]/15 px-2 font-mono text-xs"
        aria-label="Score"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => void save()}
        className="rounded border border-jade-ink px-2 py-1 font-mono text-[9px] uppercase disabled:opacity-50"
      >
        Save
      </button>
    </div>
  )
}