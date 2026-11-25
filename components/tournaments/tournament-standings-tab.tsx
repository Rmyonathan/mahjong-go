"use client"

import { knockoutRoundLabel } from "@/lib/tournaments/bracket-labels"
import {
  canClaimRevival,
  sortStandings,
} from "@/lib/tournaments/tournament-detail"
import { advancingEntryIdsForTable } from "@/lib/tournaments/round-table-scores"
import {
  formatTournamentFeeIdr,
  tournamentEntryStatusLabel,
  type ApiTournamentDetail,
  type ApiTournamentEntry,
} from "@/lib/tournaments/types"
import { TournamentAdminAddPlayer } from "@/components/tournaments/tournament-admin-add-player"
import { TournamentAdminEntryControls } from "@/components/tournaments/tournament-admin-entry-row"
import { cn } from "@/lib/utils"

function statusBadgeClass(status: ApiTournamentEntry["status"]) {
  switch (status) {
    case "CHAMPION":
      return "border-jade-gold/50 bg-jade-gold/15 text-jade-ink"
    case "ACTIVE":
      return "border-jade-accent/40 bg-jade-soft text-jade-accent"
    case "REVIVED":
      return "border-jade-gold/40 bg-jade-gold/10 text-jade-ink"
    case "ELIMINATED":
      return "border-jade-red/30 bg-jade-red/5 text-jade-red"
    default:
      return "border-[#102A20]/12 bg-white text-muted-foreground"
  }
}

export function TournamentStandingsTab({
  tournament,
  userId,
  isAdmin,
  canAdminister,
  onRevive,
  onRegister,
  onRefresh,
  actionPending,
  actionError,
}: {
  tournament: ApiTournamentDetail
  userId: string | null
  isAdmin: boolean
  canAdminister: boolean
  onRevive: (entryId: string) => void
  onRegister: () => void
  onRefresh: () => void
  actionPending: boolean
  actionError: string | null
}) {
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
  const liveRoundTables = tournament.tables.filter(
    (table) => table.roundNumber === tournament.currentRound,
  )

  const ranked = sortStandings(
    tournament.entries,
    isKo && tournament.status === "COMPLETED",
  )

  const showRegister =
    Boolean(userId) &&
    !tournament.myEntryId &&
    tournament.status === "REGISTRATION" &&
    tournament.entryCount < tournament.maxPlayers

  return (
    <div className="space-y-4">
      {showRegister ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-jade-accent/30 bg-jade-soft/40 p-4">
          <p className="text-sm">
            Join this open — entry{" "}
            <span className="font-semibold">
              {formatTournamentFeeIdr(tournament.entryFeeIdr)}
            </span>
          </p>
          <button
            type="button"
            disabled={actionPending}
            onClick={onRegister}
            className="tap-press h-10 rounded-full bg-jade-accent px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white disabled:opacity-50"
          >
            Register now
          </button>
        </div>
      ) : null}

      {actionError ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red">
          {actionError}
        </p>
      ) : null}

      {canAdminister ? (
        <TournamentAdminAddPlayer
          tournament={tournament}
          onRefresh={onRefresh}
        />
      ) : null}

      {isKo && liveRoundTables.length > 0 ? (
        <div className="space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {knockoutRoundLabel(
              tournament.currentRound,
              registeredCount,
              advancePerTable,
            )}{" "}
            · table scores (this round only)
          </p>
          <ul className="grid gap-4 lg:grid-cols-2">
            {liveRoundTables.map((table) => {
              const seatIds = table.seats.map((seat) => seat.entryId)
              const scores = new Map<string, number>()
              for (const seat of table.seats) {
                if (seat.entryId) scores.set(seat.entryId, seat.roundScore ?? 0)
              }
              const advanceIds = new Set(
                advancingEntryIdsForTable(seatIds, scores, advancePerTable),
              )
              const ordered = [...table.seats]
                .filter((seat) => seat.entryId)
                .sort(
                  (a, b) =>
                    (b.roundScore ?? 0) - (a.roundScore ?? 0) ||
                    (a.playerName ?? "").localeCompare(b.playerName ?? ""),
                )
              return (
                <li
                  key={table.id}
                  className="rounded-xl border border-[#102A20]/10 bg-white p-4"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Table {table.tableNumber}
                  </p>
                  <ol className="mt-2 space-y-1.5">
                    {ordered.map((seat, idx) => (
                      <li
                        key={seat.entryId}
                        className={cn(
                          "flex justify-between rounded-lg px-2 py-1.5 text-sm",
                          advanceIds.has(seat.entryId ?? "")
                            ? "bg-jade-soft/50"
                            : "",
                        )}
                      >
                        <span>
                          {idx + 1}. {seat.playerName}
                        </span>
                        <span className="font-mono text-xs">
                          {seat.roundScore ?? 0}
                        </span>
                      </li>
                    ))}
                  </ol>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#102A20]/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#102A20]/10 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-3">Rank</th>
              <th className="px-3 py-3">Player</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">
                {isKo && tournament.status === "COMPLETED"
                  ? "Place"
                  : isKo
                    ? "Event"
                    : "Score"}
              </th>
              <th className="px-3 py-3 text-right">Revivals</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {ranked.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No players registered yet.
                </td>
              </tr>
            ) : (
              ranked.map((entry, index) => {
                const isSelf = Boolean(
                  userId && entry.userId && entry.userId === userId,
                )
                const reviveEligible = canClaimRevival(
                  tournament,
                  entry,
                  isSelf,
                )
                return (
                  <tr
                    key={entry.id}
                    className={cn(
                      "border-b border-[#102A20]/6 last:border-0",
                      isSelf && "bg-jade-soft/30",
                    )}
                  >
                    <td className="px-3 py-3 font-mono text-xs">{index + 1}</td>
                    <td className="px-3 py-3 font-medium">{entry.playerName}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]",
                          statusBadgeClass(entry.status),
                        )}
                      >
                        {tournamentEntryStatusLabel(entry.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {isKo && tournament.status === "COMPLETED"
                        ? entry.finishPlace
                          ? `${entry.finishPlace}${entry.finishPlace === 1 ? "st" : entry.finishPlace === 2 ? "nd" : entry.finishPlace === 3 ? "rd" : "th"}`
                          : "—"
                        : isKo
                          ? "—"
                          : entry.score}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {entry.revivalsUsed}/{tournament.maxRevivalsPerPlayer}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {reviveEligible ? (
                        <button
                          type="button"
                          disabled={actionPending}
                          onClick={() => onRevive(entry.id)}
                          className="tap-press rounded-full border border-jade-gold/50 bg-jade-gold/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.1em] disabled:opacity-50"
                        >
                          Buy revival (
                          {formatTournamentFeeIdr(tournament.revivalFeeIdr)})
                        </button>
                      ) : null}
                      {isAdmin ? (
                        <TournamentAdminEntryControls
                          tournamentId={tournament.id}
                          entry={entry}
                          onUpdated={onRefresh}
                        />
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}