"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { TournamentHandLogModal } from "@/components/tournaments/tournament-hand-log-modal"
import { knockoutRoundLabel } from "@/lib/tournaments/bracket-labels"
import { isFinalKoRound } from "@/lib/tournaments/ko-finals"
import { advancingEntryIdsForTable } from "@/lib/tournaments/round-table-scores"
import { BYE_SEAT_LABEL } from "@/lib/tournaments/table-roll"
import type { ApiTournamentDetail, ApiTournamentTable } from "@/lib/tournaments/types"
import { cn } from "@/lib/utils"

export function TournamentTablesTab({
  tournament,
  canAdminister,
  canLogHands,
  onRefresh,
}: {
  tournament: ApiTournamentDetail
  canAdminister: boolean
  canLogHands: boolean
  onRefresh: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)

  const isKo =
    tournament.format === "KNOCKOUT" || tournament.format === "HYBRID_KO"
  const advancePerTable = Math.min(
    2,
    Math.max(1, tournament.koAdvancePerTable ?? 1),
  )
  const registeredCount = Math.max(
    tournament.entryCount,
    tournament.maxPlayers,
  )
  const liveRound = tournament.currentRound
  const liveRoundLabel = isKo
    ? knockoutRoundLabel(liveRound, registeredCount, advancePerTable)
    : `Round ${liveRound}`
  const roundTables = useMemo(
    () =>
      tournament.tables.filter((table) => table.roundNumber === liveRound),
    [tournament.tables, liveRound],
  )
  const isLiveFinal =
    isKo &&
    isFinalKoRound(
      liveRound,
      roundTables.length,
      registeredCount,
      advancePerTable,
    )
  const closeKoLabel = isLiveFinal
    ? "Close final & podium"
    : "Close KO round & roll"
  const openLiveCount = roundTables.filter((table) => table.liveSessionId).length
  const allLiveLogsClosed =
    roundTables.length > 0 && openLiveCount === 0
  const tournamentOpen = tournament.status !== "COMPLETED"

  const selectedTable: ApiTournamentTable | null =
    roundTables.find((table) => table.id === selectedTableId) ??
    roundTables[0] ??
    null

  async function rollTables(advanceRound: boolean) {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/tournaments/actions/tables-roll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          advanceRound,
          finishPreviousRound: true,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Roll failed")
        return
      }
      onRefresh()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  async function closeKoRoundAndRoll() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/tournaments/actions/rounds-advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          roundNumber: liveRound,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not advance round")
        return
      }
      onRefresh()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  async function openLiveTable(tableId: string, existingSessionId: string | null) {
    if (existingSessionId) {
      router.push(`/session/live?id=${existingSessionId}`)
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/tournaments/actions/open-live-table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          tableId,
        }),
      })
      const data = (await response.json()) as {
        error?: string
        session?: { id: string }
      }
      if (!response.ok || !data.session?.id) {
        setError(data.error ?? "Could not open live table")
        return
      }
      router.push(`/session/live?id=${data.session.id}`)
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  const showDevSim =
    process.env.NODE_ENV !== "production" && canAdminister && tournamentOpen

  async function simulateTableHands(count: 1 | 4) {
    if (!selectedTable) return
    setPending(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/tournaments/actions/simulate-table-hands`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId: tournament.id,
            tableId: selectedTable.id,
            count,
          }),
        },
      )
      const data = (await response.json()) as {
        error?: string
        handsLogged?: number
        sessionId?: string
      }
      if (!response.ok) {
        setError(data.error ?? "Simulate failed")
        return
      }
      onRefresh()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  async function logDraw(tableId: string) {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/tournaments/actions/table-hand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          tableId,
          winnerSeatIndex: -1,
          method: "draw",
          dealtBySeatIndex: null,
          points: 0,
          combos: [],
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not log draw")
        return
      }
      onRefresh()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  if (roundTables.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isKo ? (
            <>
              KO flow: <span className="font-medium">Create tables</span> → play
              →{" "}
              <span className="font-medium">Close KO round &amp; roll</span> (top{" "}
              {advancePerTable} per table by table score, then auto 8 Besar / 4
              Besar / Final seating).{" "}
            </>
          ) : null}
          Roll seating here, then open each table in the full{" "}
          <Link
            href="/schedule"
            className="font-semibold text-jade-accent underline-offset-2 hover:underline"
          >
            live table
          </Link>{" "}
          view (game log, camera scan, score race) — same as schedule meets.
        </p>
        {canAdminister ? (
          <div className="jade-card space-y-3 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Director — create seating
            </p>
            <p className="text-sm">
              Need at least{" "}
              <span className="font-semibold">2 registered players</span> on
              Standings &amp; roster, then roll to create tables for round{" "}
              {liveRound}.
            </p>
            <div className="flex flex-wrap gap-2">
              <AdminToolButton
                disabled={pending}
                onClick={() => void rollTables(false)}
                label="Create tables (roll)"
                primary
              />
              {!isKo ? (
                <AdminToolButton
                  disabled={pending}
                  onClick={() => void rollTables(true)}
                  label="Roll next round"
                />
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tables will appear when the director rolls seating.
          </p>
        )}
        {error ? <ErrorLine message={error} /> : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {roundTables.length > 0 ? (
        <p className="rounded-xl border border-[#102A20]/10 bg-white px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{liveRoundLabel}</span>
          : {roundTables.length} table
          {roundTables.length === 1 ? "" : "s"} ·{" "}
          {openLiveCount > 0
            ? `${openLiveCount} live log${openLiveCount === 1 ? "" : "s"} still open`
            : "no live logs open (wasit ended or not started)"}
          {allLiveLogsClosed && canAdminister ? (
            <span className="mt-1 block font-medium text-foreground">
              Every table log is closed — when play is done, use{" "}
              <span className="font-semibold">
                {isKo ? "Close KO round & roll" : "Close KO round"}
              </span>
              . Reopen any table with{" "}
              <span className="font-semibold">Open live table</span> if someone
              ended early by mistake.
            </span>
          ) : allLiveLogsClosed ? (
            <span className="mt-1 block">
              All live logs closed — panitia advances the round when ready.
            </span>
          ) : null}
        </p>
      ) : null}
      {canAdminister ? (
        <div className="flex flex-wrap gap-2">
          <AdminToolButton
            disabled={pending}
            onClick={() => void rollTables(false)}
            label="Re-roll round"
          />
          {!isKo ? (
            <AdminToolButton
              disabled={pending}
              onClick={() => void rollTables(true)}
              label="Roll next round"
            />
          ) : (
            <AdminToolButton
              disabled={pending}
              onClick={() => void closeKoRoundAndRoll()}
              label={closeKoLabel}
              primary
            />
          )}
        </div>
      ) : null}
      {error ? <ErrorLine message={error} /> : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {roundTables.map((table) => (
          <button
            key={table.id}
            type="button"
            onClick={() => setSelectedTableId(table.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em]",
              (selectedTable?.id ?? "") === table.id
                ? "border-jade-ink bg-jade-ink text-white"
                : "border-[#102A20]/15 bg-white",
            )}
          >
            Table {table.tableNumber} ·{" "}
            {isKo
              ? knockoutRoundLabel(
                  table.roundNumber,
                  registeredCount,
                  advancePerTable,
                )
              : `R${table.roundNumber}`}{" "}
            <span className="opacity-80">· {table.status}</span>
          </button>
        ))}
      </div>

      {selectedTable ? (
        <div className="jade-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-serif text-xl">
              Table {selectedTable.tableNumber} —{" "}
              {isKo
                ? knockoutRoundLabel(
                    selectedTable.roundNumber,
                    registeredCount,
                    advancePerTable,
                  )
                : `Round ${selectedTable.roundNumber}`}
            </h3>
            {selectedTable.isKnockoutMatch ? (
              <span className="rounded-full bg-jade-ink px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                KO
              </span>
            ) : null}
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {selectedTable.seats.map((seat, index) => {
              const seatIds = selectedTable.seats.map((row) => row.entryId)
              const scores = new Map<string, number>()
              for (const row of selectedTable.seats) {
                if (row.entryId) scores.set(row.entryId, row.roundScore ?? 0)
              }
              const advanceIds = new Set(
                advancingEntryIdsForTable(seatIds, scores, advancePerTable),
              )
              const showRoundScore = isKo
              const points = showRoundScore
                ? (seat.roundScore ?? 0)
                : (seat.score ?? 0)
              return (
                <li
                  key={index}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2",
                    isKo && seat.entryId && advanceIds.has(seat.entryId)
                      ? "border-jade-accent/30 bg-jade-soft/40"
                      : "border-[#102A20]/10 bg-white",
                  )}
                >
                  <span className="text-sm">
                    Seat {index + 1} ·{" "}
                    {seat.playerName ?? (
                      <span className="text-muted-foreground">
                        {BYE_SEAT_LABEL}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs">
                    {points} pts
                    {showRoundScore ? (
                      <span className="ml-1 text-muted-foreground">table</span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
          {selectedTable.sessionLogs.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {selectedTable.sessionLogs.map((session) => (
                <li key={session.id}>
                  <Link
                    href={
                      session.status === "LIVE"
                        ? `/session/live?id=${session.id}`
                        : `/session/${session.id}`
                    }
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#102A20]/10 bg-white px-3 py-2 text-sm transition hover:border-jade-accent/40 hover:bg-jade-soft/30"
                  >
                    <span>Table session · {session.handCount} hands</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-jade-accent">
                      {session.status === "LIVE"
                        ? "Resume live log"
                        : "Full ledger →"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {tournamentOpen ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium">End table log</span> (in live view)
              only saves the session — keep playing until the round is done. Use{" "}
              <span className="font-medium">{closeKoLabel}</span> when the whole
              stage (e.g. Final) is finished.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {canLogHands && tournamentOpen ? (
              <button
                type="button"
                disabled={pending || selectedTable.status === "FINISHED"}
                onClick={() =>
                  void openLiveTable(
                    selectedTable.id,
                    selectedTable.liveSessionId,
                  )
                }
                className="tap-press h-11 rounded-full bg-jade-accent px-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white disabled:opacity-50"
              >
                {selectedTable.liveSessionId
                  ? "Resume live table"
                  : "Open live table"}
              </button>
            ) : null}
            {canLogHands && tournamentOpen ? (
              <div className="contents">
                <button
                  type="button"
                  disabled={pending || selectedTable.status === "FINISHED"}
                  onClick={() => setLogOpen(true)}
                  className="tap-press h-11 rounded-full border border-jade-accent/50 bg-jade-soft px-5 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent disabled:opacity-50"
                >
                  Quick log (scan or calculator)
                </button>
                <button
                  type="button"
                  disabled={pending || selectedTable.status === "FINISHED"}
                  onClick={() => void logDraw(selectedTable.id)}
                  className="h-11 rounded-full border border-[#102A20]/15 px-5 font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"
                >
                  Log draw
                </button>
                {showDevSim ? (
                  <>
                    <button
                      type="button"
                      disabled={pending || selectedTable.status === "FINISHED"}
                      onClick={() => void simulateTableHands(1)}
                      className="h-11 rounded-full border border-dashed border-jade-gold/60 bg-jade-gold/10 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink disabled:opacity-50"
                    >
                      Sim 1 hand
                    </button>
                    <button
                      type="button"
                      disabled={pending || selectedTable.status === "FINISHED"}
                      onClick={() => void simulateTableHands(4)}
                      className="h-11 rounded-full border border-dashed border-jade-gold/60 bg-jade-gold/10 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink disabled:opacity-50"
                    >
                      Sim 4 hands · this table
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <TournamentHandLogModal
        open={logOpen}
        table={selectedTable}
        onClose={() => setLogOpen(false)}
        onLogged={() => {
          setLogOpen(false)
          onRefresh()
        }}
        tournamentId={tournament.id}
      />
    </div>
  )
}

function AdminToolButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  primary?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "tap-press h-10 rounded-full px-4 font-mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-50",
        primary
          ? "bg-jade-accent text-white"
          : "border border-jade-ink",
      )}
    >
      {label}
    </button>
  )
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red">
      {message}
    </p>
  )
}
