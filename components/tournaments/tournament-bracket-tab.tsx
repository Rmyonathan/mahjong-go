"use client"

import { useMemo } from "react"

import { knockoutRoundLabel } from "@/lib/tournaments/bracket-labels"
import {
  finalTableBadgeLabel,
  isFinalKoRound,
} from "@/lib/tournaments/ko-finals"
import {
  advancingEntryIdsForTable,
  rankSeatedByRoundScore,
} from "@/lib/tournaments/round-table-scores"
import type { ApiTournamentDetail, ApiTournamentTable } from "@/lib/tournaments/types"
import { cn } from "@/lib/utils"

function seatRankOnTable(
  table: ApiTournamentTable,
  entryId: string | null,
  advanceIds: Set<string>,
  tableFinished: boolean,
) {
  if (!entryId) return "open"
  if (tableFinished && advanceIds.has(entryId)) return "advancing"
  if (tableFinished && !advanceIds.has(entryId)) return "out"
  return "playing"
}

export function TournamentBracketTab({
  tournament,
}: {
  tournament: ApiTournamentDetail
}) {
  const showKnockout =
    tournament.format === "KNOCKOUT" || tournament.format === "HYBRID_KO"
  const advancePerTable = Math.min(
    2,
    Math.max(1, tournament.koAdvancePerTable ?? 1),
  )

  const registeredCount = Math.max(
    tournament.entryCount,
    tournament.maxPlayers,
  )

  const rounds = useMemo(() => {
    const map = new Map<number, ApiTournamentTable[]>()
    const pool = showKnockout
      ? tournament.tables.filter((table) => table.isKnockoutMatch)
      : tournament.tables
    const source = pool.length > 0 ? pool : tournament.tables
    for (const table of source) {
      const list = map.get(table.roundNumber) ?? []
      list.push(table)
      map.set(table.roundNumber, list)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, tables]) => ({
        roundNumber,
        label: showKnockout
          ? knockoutRoundLabel(
              roundNumber,
              registeredCount,
              advancePerTable,
            )
          : `Round ${roundNumber}`,
        tables: tables.sort((a, b) => a.tableNumber - b.tableNumber),
      }))
  }, [advancePerTable, registeredCount, showKnockout, tournament.tables])

  if (rounds.length === 0) {
    return (
      <div className="jade-card px-5 py-10 text-center">
        <p className="font-serif text-2xl">Bracket pending</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {showKnockout ? (
            <>
              Director rolls seating on <span className="font-medium">Live tables</span>
              , then{" "}
              <span className="font-medium">Close KO round &amp; roll</span> — top{" "}
              {advancePerTable} per table by <span className="font-medium">this
              table&apos;s</span> logged hands (least minus wins when all negative).
            </>
          ) : (
            "Points-race events show table assignments per round when live."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {showKnockout ? (
        <p className="text-sm text-muted-foreground">
          Scores are <span className="font-medium">this table only</span> — same
          numbers as live tables. When the round is closed, top {advancePerTable}{" "}
          per table advance (highest round score; ties broken consistently).
        </p>
      ) : null}
      {rounds.map((round) => (
        <section key={round.roundNumber}>
          <h3 className="font-serif text-xl uppercase">{round.label}</h3>
          <ul className="mt-4 grid gap-4 lg:grid-cols-2">
            {round.tables.map((table) => {
              const seatIds = table.seats.map((seat) => seat.entryId)
              const scores = new Map<string, number>()
              for (const seat of table.seats) {
                if (seat.entryId) {
                  scores.set(seat.entryId, seat.roundScore ?? 0)
                }
              }
              const isFinal = isFinalKoRound(
                round.roundNumber,
                round.tables.length,
                registeredCount,
                advancePerTable,
              )
              const ranked = rankSeatedByRoundScore(seatIds, scores)
              const advanceIds = new Set(
                isFinal
                  ? ranked.slice(0, 3)
                  : advancingEntryIdsForTable(
                      seatIds,
                      scores,
                      advancePerTable,
                    ),
              )
              const tableFinished = table.status === "FINISHED"
              const badge = table.isKnockoutMatch
                ? finalTableBadgeLabel(
                    round.roundNumber,
                    round.tables.length,
                    registeredCount,
                    advancePerTable,
                  )
                : null

              return (
                <li
                  key={table.id}
                  className="rounded-xl border border-[#102A20]/12 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Table {table.tableNumber} · {table.status}
                    </p>
                    {badge ? (
                      <span className="rounded-full bg-jade-ink px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                        {badge}
                      </span>
                    ) : null}
                  </div>
                  <ol className="mt-3 space-y-2">
                    {table.seats.map((seat, seatIndex) => {
                      const place =
                        seat.entryId && tableFinished && isFinal
                          ? tournament.entries.find(
                              (entry) => entry.id === seat.entryId,
                            )?.finishPlace
                          : null
                      let rank = seatRankOnTable(
                        table,
                        seat.entryId,
                        advanceIds,
                        tableFinished && !isFinal,
                      )
                      if (tableFinished && isFinal && place) {
                        rank = place <= 3 ? "advancing" : "out"
                      }
                      return (
                        <li
                          key={seatIndex}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                            rank === "out"
                              ? "border-jade-red/20 bg-jade-red/5 line-through opacity-70"
                              : rank === "advancing"
                                ? "border-jade-accent/40 bg-jade-soft"
                                : rank === "playing" && advanceIds.has(seat.entryId ?? "")
                                  ? "border-jade-accent/25 bg-jade-soft/50"
                                  : "border-[#102A20]/8",
                          )}
                        >
                          <span>
                            Seat {seatIndex + 1} ·{" "}
                            {seat.playerName ?? "— open —"}
                            {place ? (
                              <span className="ml-1 font-mono text-[10px] text-jade-accent">
                                · P{place}
                              </span>
                            ) : null}
                          </span>
                          <span className="font-mono text-xs">
                            {seat.entryId
                              ? (seat.roundScore ?? 0)
                              : "—"}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}