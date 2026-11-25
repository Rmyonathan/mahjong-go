"use client"

import { useEffect, useState } from "react"

import type { ApiTournamentDetail } from "@/lib/tournaments/types"
import { cn } from "@/lib/utils"

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]
}

export function TournamentStaffPanel({
  tournament,
  canEdit,
  onUpdated,
}: {
  tournament: ApiTournamentDetail
  canEdit: boolean
  onUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [panitiaUserIds, setPanitiaUserIds] = useState<string[]>(
    tournament.panitiaUserIds ?? [],
  )
  const [wasitUserIds, setWasitUserIds] = useState<string[]>(
    tournament.wasitUserIds ?? [],
  )
  const [members, setMembers] = useState<{ userId: string; name: string }[]>(
    [],
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPanitiaUserIds(tournament.panitiaUserIds ?? [])
    setWasitUserIds(tournament.wasitUserIds ?? [])
  }, [tournament.panitiaUserIds, tournament.wasitUserIds])

  useEffect(() => {
    if (!editing) return
    void fetch("/api/members")
      .then(async (response) => {
        if (!response.ok) return []
        const data = (await response.json()) as {
          members?: { userId: string; name: string }[]
        }
        return data.members ?? []
      })
      .then(setMembers)
      .catch(() => setMembers([]))
  }, [editing])

  async function save() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/tournaments/actions/staff`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          panitiaUserIds,
          wasitUserIds,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not save staff")
        return
      }
      setEditing(false)
      onUpdated()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  const panitiaDisplay =
    tournament.panitiaNames?.length > 0
      ? tournament.panitiaNames.join(" · ")
      : (tournament.panitiaName ?? "Belum ditetapkan")
  const wasitDisplay =
    tournament.wasitNames?.length > 0
      ? tournament.wasitNames.join(" · ")
      : (tournament.wasitName ?? "Belum ditetapkan")

  return (
    <div className="jade-card mt-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Panitia &amp; wasit
        </p>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-jade-accent"
          >
            {editing ? "Cancel" : "Assign"}
          </button>
        ) : null}
      </div>
      {!editing ? (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[9px] uppercase text-muted-foreground">
              Panitia (committee)
            </dt>
            <dd className="text-sm font-medium">{panitiaDisplay}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase text-muted-foreground">
              Wasit · live table &amp; scan
            </dt>
            <dd className="text-sm font-medium">{wasitDisplay}</dd>
          </div>
        </dl>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <StaffChecklist
            title="Panitia"
            members={members}
            selected={panitiaUserIds}
            onToggle={(id) => setPanitiaUserIds((prev) => toggleId(prev, id))}
          />
          <StaffChecklist
            title="Wasit"
            members={members}
            selected={wasitUserIds}
            onToggle={(id) => setWasitUserIds((prev) => toggleId(prev, id))}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => void save()}
            className={cn(
              "sm:col-span-2 h-10 rounded-full bg-jade-accent font-mono text-[10px] uppercase tracking-[0.14em] text-white disabled:opacity-50",
            )}
          >
            {pending ? "Saving…" : "Save panitia & wasit"}
          </button>
        </div>
      )}
      {error ? (
        <p className="mt-2 font-mono text-[10px] uppercase text-jade-red">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function StaffChecklist({
  title,
  members,
  selected,
  onToggle,
}: {
  title: string
  members: { userId: string; name: string }[]
  selected: string[]
  onToggle: (userId: string) => void
}) {
  return (
    <div className="max-h-52 overflow-y-auto rounded-lg border border-[#102A20]/10 bg-white p-2">
      <p className="px-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      <ul className="mt-2 space-y-1">
        {members.map((member) => (
          <li key={member.userId}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-jade-soft/40">
              <input
                type="checkbox"
                checked={selected.includes(member.userId)}
                onChange={() => onToggle(member.userId)}
                className="size-3.5 rounded border-[#102A20]/25"
              />
              {member.name}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}