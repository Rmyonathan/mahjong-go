"use client"

import { useEffect, useMemo, useState } from "react"

import type { ApiTournamentDetail } from "@/lib/tournaments/types"
import { cn } from "@/lib/utils"

export function TournamentAdminAddPlayer({
  tournament,
  onRefresh,
}: {
  tournament: ApiTournamentDetail
  onRefresh: () => void
}) {
  const [members, setMembers] = useState<{ userId: string; name: string }[]>([])
  const [pickedUserId, setPickedUserId] = useState("")
  const [guestName, setGuestName] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registeredUserIds = useMemo(
    () =>
      new Set(
        tournament.entries
          .map((entry) => entry.userId)
          .filter((id): id is string => Boolean(id)),
      ),
    [tournament.entries],
  )

  const available = useMemo(
    () => members.filter((member) => !registeredUserIds.has(member.userId)),
    [members, registeredUserIds],
  )

  const atCapacity = tournament.entryCount >= tournament.maxPlayers

  useEffect(() => {
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
  }, [])

  async function registerBody(body: Record<string, string>) {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/tournaments/actions/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: tournament.id, ...body }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not add player")
        return
      }
      setPickedUserId("")
      setGuestName("")
      onRefresh()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  function addRandomMember() {
    if (available.length === 0) {
      setError("No unregistered members left")
      return
    }
    const pick = available[Math.floor(Math.random() * available.length)]!
    void registerBody({ userId: pick.userId })
  }

  return (
    <div className="rounded-xl border border-dashed border-[#102A20]/20 bg-[#F6F4EE]/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Director — fill roster (testing)
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {/* EDIT HERE — replace with meet-style booking: QRIS + WA confirm like schedule seats */}
        Later: self-serve registration via QR + WhatsApp confirmation (same flow as
        booking a table).
      </p>
      {atCapacity ? (
        <p className="mt-2 text-sm text-muted-foreground">Tournament is full.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-[12rem] flex-1 text-xs">
            Club member
            <select
              value={pickedUserId}
              disabled={pending}
              onChange={(e) => setPickedUserId(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-[#102A20]/15 bg-white px-2 text-xs"
            >
              <option value="">— Pick member —</option>
              {available.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || !pickedUserId}
            onClick={() => void registerBody({ userId: pickedUserId })}
            className="tap-press h-10 rounded-full bg-jade-accent px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white disabled:opacity-50"
          >
            Add member
          </button>
          <button
            type="button"
            disabled={pending || available.length === 0}
            onClick={() => addRandomMember()}
            className={cn(
              "tap-press h-10 rounded-full border border-jade-ink px-4 font-mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-50",
            )}
          >
            Add random member
          </button>
        </div>
      )}
      <GuestNameRow
        guestName={guestName}
        setGuestName={setGuestName}
        pending={pending}
        atCapacity={atCapacity}
        onAdd={() =>
          guestName.trim()
            ? void registerBody({ playerName: guestName.trim() })
            : setError("Guest name required")
        }
      />
      {error ? (
        <p className="mt-2 font-mono text-[10px] uppercase text-jade-red">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function GuestNameRow({
  guestName,
  setGuestName,
  pending,
  atCapacity,
  onAdd,
}: {
  guestName: string
  setGuestName: (value: string) => void
  pending: boolean
  atCapacity: boolean
  onAdd: () => void
}) {
  if (atCapacity) return null
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="min-w-[12rem] flex-1 text-xs">
        Guest name (no account)
        <input
          value={guestName}
          disabled={pending}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Walk-in player"
          className="mt-1 h-10 w-full rounded-lg border border-[#102A20]/15 bg-white px-3 text-xs"
        />
      </label>
      <button
        type="button"
        disabled={pending || !guestName.trim()}
        onClick={onAdd}
        className="h-10 rounded-full border border-[#102A20]/20 px-4 font-mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-50"
      >
        Add guest
      </button>
    </div>
  )
}