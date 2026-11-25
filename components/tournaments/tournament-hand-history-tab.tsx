"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { knockoutRoundLabel } from "@/lib/tournaments/bracket-labels"
import {
  tournamentHandWinMethodLabel,
  type ApiTournamentDetail,
  type ApiTournamentHand,
  type ApiTournamentTable,
} from "@/lib/tournaments/types"
import { formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

export function TournamentHandHistoryTab({
  tournament,
}: {
  tournament: ApiTournamentDetail
}) {
  const [roundFilter, setRoundFilter] = useState<number | "all">("all")
  const [tableFilter, setTableFilter] = useState<number | "all">("all")

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

  const koTables = useMemo(() => {
    const pool = tournament.tables.filter((table) => table.isKnockoutMatch)
    return pool.length > 0 ? pool : tournament.tables
  }, [tournament.tables])

  const rounds = useMemo(() => {
    const set = new Set<number>()
    for (const table of koTables) set.add(table.roundNumber)
    for (const hand of tournament.hands) set.add(hand.roundNumber)
    return Array.from(set).sort((a, b) => b - a)
  }, [koTables, tournament.hands])

  function roundLabel(round: number) {
    if (isKo) {
      return knockoutRoundLabel(round, registeredCount, advancePerTable)
    }
    return `Round ${round}`
  }

  const tableNumbers = useMemo(() => {
    const set = new Set(koTables.map((table) => table.tableNumber))
    return Array.from(set).sort((a, b) => a - b)
  }, [koTables])

  const filteredTables = useMemo(() => {
    return koTables.filter((table) => {
      if (roundFilter !== "all" && table.roundNumber !== roundFilter) {
        return false
      }
      if (tableFilter !== "all" && table.tableNumber !== tableFilter) {
        return false
      }
      return true
    })
  }, [koTables, roundFilter, tableFilter])

  const handsByTableId = useMemo(() => {
    const map = new Map<string, ApiTournamentHand[]>()
    for (const hand of tournament.hands) {
      const list = map.get(hand.tableId) ?? []
      list.push(hand)
      map.set(hand.tableId, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.handNumber - a.handNumber)
    }
    return map
  }, [tournament.hands])

  const filteredHands = useMemo(() => {
    return tournament.hands.filter((hand) => {
      if (roundFilter !== "all" && hand.roundNumber !== roundFilter) return false
      if (tableFilter !== "all" && hand.tableNumber !== tableFilter) return false
      return true
    })
  }, [tournament.hands, roundFilter, tableFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label="Round"
          value={roundFilter === "all" ? "all" : String(roundFilter)}
          onChange={(value) =>
            setRoundFilter(value === "all" ? "all" : Number(value))
          }
          options={[
            { value: "all", label: "All rounds" },
            ...rounds.map((round) => ({
              value: String(round),
              label: roundLabel(round),
            })),
          ]}
        />
        <FilterSelect
          label="Table"
          value={tableFilter === "all" ? "all" : String(tableFilter)}
          onChange={(value) =>
            setTableFilter(value === "all" ? "all" : Number(value))
          }
          options={[
            { value: "all", label: "All tables" },
            ...tableNumbers.map((table) => ({
              value: String(table),
              label: `Table ${table}`,
            })),
          ]}
        />
      </div>

      {isKo ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Same <span className="font-medium">session ledger</span> as normal
            tables at <span className="font-mono">/session/…</span> — full
            newspaper, hand posts, and end-screen. Quick log now writes there
            automatically.
          </p>
          {filteredTables.length === 0 ? (
            <div className="jade-card px-5 py-10 text-center text-sm text-muted-foreground">
              No KO tables in this filter yet.
            </div>
          ) : (
            <ul className="space-y-4">
              {filteredTables.map((table) => (
                <KoTableHistoryBlock
                  key={table.id}
                  table={table}
                  roundLabel={roundLabel(table.roundNumber)}
                  hands={handsByTableId.get(table.id) ?? []}
                />
              ))}
            </ul>
          )}
        </div>
      ) : filteredHands.length === 0 ? (
        <div className="jade-card px-5 py-10 text-center text-sm text-muted-foreground">
          No hands logged yet — directors log wins from the Live Tables tab.
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredHands.map((hand) => (
            <HandHistoryCard key={hand.id} hand={hand} />
          ))}
        </ul>
      )}
    </div>
  )
}

function KoTableHistoryBlock({
  table,
  roundLabel,
  hands,
}: {
  table: ApiTournamentTable
  roundLabel: string
  hands: ApiTournamentHand[]
}) {
  return (
    <li className="jade-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-serif text-lg">
          {roundLabel} · Table {table.tableNumber}
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {table.status}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {table.sessionLogs.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            No session yet — use{" "}
            <span className="font-medium">Open live table</span> or{" "}
            <span className="font-medium">Quick log</span> (creates the same
            session ledger).
          </li>
        ) : (
          table.sessionLogs.map((session) => (
            <li key={session.id}>
              <Link
                href={
                  session.status === "LIVE"
                    ? `/session/live?id=${session.id}`
                    : `/session/${session.id}`
                }
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-jade-accent/25 bg-jade-soft/30 px-3 py-2.5 transition hover:border-jade-accent/50"
              >
                <span className="text-sm font-medium">
                  {session.title || "Table session"}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-jade-accent">
                  {session.status === "LIVE"
                    ? "Resume live"
                    : "Full ledger · end screen"}
                  {" · "}
                  {session.handCount} hands →
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
      {hands.length > 0 && table.sessionLogs.length === 0 ? (
        <div className="mt-4 border-t border-[#102A20]/10 pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Legacy quick logs (before session link)
          </p>
          <ul className="mt-2 space-y-2">
            {hands.slice(0, 8).map((hand) => (
              <HandHistoryCard key={hand.id} hand={hand} compact />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  )
}

function HandHistoryCard({
  hand,
  compact,
}: {
  hand: ApiTournamentHand
  compact?: boolean
}) {
  const activeDeltas = hand.deltas.filter(
    (row) => row.entryId && row.delta !== 0,
  )
  return (
    <li
      className={cn(
        compact
          ? "rounded-lg border border-[#102A20]/8 bg-[#F6F4EE]/60 p-3"
          : "jade-card p-4",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          R{hand.roundNumber} · T{hand.tableNumber} · Hand #{hand.handNumber}
        </p>
        <span className="rounded-full border border-[#102A20]/12 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]">
          {tournamentHandWinMethodLabel(hand.winMethod)}
        </span>
      </div>
      <p className={cn("font-serif", compact ? "text-base" : "text-lg", "mt-2")}>
        {hand.winMethod === "DRAW" ? (
          "Exhaustive draw"
        ) : (
          <>
            {hand.winnerName ?? "—"}{" "}
            <span className="font-mono text-sm text-jade-accent">
              +{hand.points}
            </span>
          </>
        )}
      </p>
      {!compact && hand.combosSummary ? (
        <p className="mt-1 text-sm text-muted-foreground">{hand.combosSummary}</p>
      ) : null}
      <ul className="mt-2 flex flex-wrap gap-2">
        {activeDeltas.map((row) => (
          <li
            key={`${hand.id}-${row.seatIndex}`}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[10px]",
              row.delta > 0
                ? "border-jade-accent/40 text-jade-accent"
                : "border-jade-red/30 text-jade-red",
            )}
          >
            {row.playerName ?? `Seat ${row.seatIndex + 1}`}{" "}
            {formatSignedPoints(row.delta)}
          </li>
        ))}
      </ul>
    </li>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block h-10 min-w-[8.5rem] rounded-lg border border-[#102A20]/15 bg-white px-2 text-xs text-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}