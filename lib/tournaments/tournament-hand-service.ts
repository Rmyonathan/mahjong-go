import type { HandWinMethod } from "@prisma/client"

import { prisma } from "@/lib/db"
import { computePayoutDeltas } from "@/lib/session/live-demo"

export interface TournamentLogHandInput {
  winnerSeatIndex: number
  method: "self-draw" | "discard" | "draw"
  dealtBySeatIndex: number | null
  points: number
  totalFan?: number
  combos: { label: string; fan: number }[]
  tileIds?: string[]
  winningTileId?: string
  deltas?: number[]
}

function seatEntryIds(table: {
  seat1EntryId: string | null
  seat2EntryId: string | null
  seat3EntryId: string | null
  seat4EntryId: string | null
}) {
  return [
    table.seat1EntryId,
    table.seat2EntryId,
    table.seat3EntryId,
    table.seat4EntryId,
  ]
}

export async function logTournamentHand(
  tournamentId: string,
  tableId: string,
  input: TournamentLogHandInput,
) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.tournamentTable.findFirst({
      where: { id: tableId, tournamentId },
    })
    if (!table) throw new Error("Table not found")

    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      select: { format: true },
    })
    const koScoringOnly =
      tournament?.format === "KNOCKOUT" ||
      tournament?.format === "HYBRID_KO"

    const seatIds = seatEntryIds(table)
    const occupied = seatIds
      .map((entryId, seatIndex) => ({ entryId, seatIndex }))
      .filter((row) => row.entryId)

    if (occupied.length < 2 && input.method !== "draw") {
      throw new Error("Need at least 2 seated players to log a win")
    }

    const isDraw = input.method === "draw" || input.winnerSeatIndex < 0
    const seatCount = 4

    let winMethod: HandWinMethod = "DRAW"
    let winnerEntryId: string | null = null
    let dealtInEntryId: string | null = null
    let deltas: number[]

    if (isDraw) {
      deltas = Array.from({ length: seatCount }, () => 0)
    } else {
      const winnerId = seatIds[input.winnerSeatIndex]
      if (!winnerId) throw new Error("Invalid winner seat")
      winnerEntryId = winnerId
      winMethod = input.method === "self-draw" ? "SELF_DRAW" : "DISCARD"

      if (winMethod === "DISCARD") {
        if (
          input.dealtBySeatIndex == null ||
          !seatIds[input.dealtBySeatIndex]
        ) {
          throw new Error("Dealt-in seat required for discard wins")
        }
        dealtInEntryId = seatIds[input.dealtBySeatIndex]
      }

      deltas =
        input.deltas ??
        computePayoutDeltas({
          seatCount,
          winnerSeatIndex: input.winnerSeatIndex,
          method: input.method === "self-draw" ? "self-draw" : "discard",
          dealtBySeatIndex: input.dealtBySeatIndex,
          winnerPoints: input.points,
          totalFan: input.totalFan,
        })
    }

    const lastHand = await tx.tournamentHand.findFirst({
      where: { tableId },
      orderBy: { handNumber: "desc" },
      select: { handNumber: true },
    })
    const handNumber = (lastHand?.handNumber ?? 0) + 1

    const combosSummary =
      input.combos.length > 0
        ? input.combos.map((combo) => combo.label).join(" · ")
        : null

    const hand = await tx.tournamentHand.create({
      data: {
        tournamentId,
        tableId,
        roundNumber: table.roundNumber,
        handNumber,
        winnerEntryId,
        dealtInEntryId,
        winMethod,
        points: isDraw ? 0 : Math.max(0, Math.round(input.points)),
        combosSummary,
        deltasJson: JSON.stringify(deltas),
      },
    })

    for (let seatIndex = 0; seatIndex < seatCount; seatIndex++) {
      const entryId = seatIds[seatIndex]
      if (!entryId) continue
      const delta = deltas[seatIndex] ?? 0
      if (delta === 0 || koScoringOnly) continue
      await tx.tournamentEntry.update({
        where: { id: entryId },
        data: { score: { increment: delta } },
      })
    }

    if (table.status === "WAITING") {
      await tx.tournamentTable.update({
        where: { id: tableId },
        data: { status: "LIVE" },
      })
    }

    return hand
  })
}