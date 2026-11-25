import { prisma } from "@/lib/db"
import { logTournamentHand } from "@/lib/tournaments/tournament-hand-service"
import type { LogHandInput } from "@/lib/session/service"

/** Mirror a logged `GameSession` hand into tournament standings when linked. */
export async function syncTournamentHandFromSession(
  tournamentTableId: string,
  input: LogHandInput,
) {
  const table = await prisma.tournamentTable.findUnique({
    where: { id: tournamentTableId },
    select: { tournamentId: true },
  })
  if (!table) return null

  const totalFan =
    input.combos.length > 0
      ? input.combos.reduce((sum, combo) => sum + combo.fan, 0)
      : undefined

  return logTournamentHand(table.tournamentId, tournamentTableId, {
    winnerSeatIndex:
      input.method === "draw" || input.winnerSeatIndex < 0
        ? -1
        : input.winnerSeatIndex,
    method:
      input.method === "draw"
        ? "draw"
        : input.method === "self-draw"
          ? "self-draw"
          : "discard",
    dealtBySeatIndex: input.dealtBySeatIndex,
    points: input.points,
    totalFan,
    combos: input.combos,
    tileIds: input.tileIds,
    winningTileId: input.winningTileId,
    deltas: input.deltas,
  })
}