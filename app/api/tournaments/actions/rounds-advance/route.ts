import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  executeTableRoll,
  koSurvivorEntries,
} from "@/lib/tournaments/execute-table-roll"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import { canAdministerTournament } from "@/lib/tournaments/staff"
import { isFinalKoRound } from "@/lib/tournaments/ko-finals"
import {
  rankSeatedByRoundScore,
  roundTableScores,
  seatedEntryIds,
} from "@/lib/tournaments/round-table-scores"

function shouldRollNextKoRound(
  survivorCount: number,
  advancePerTable: number,
) {
  if (survivorCount < 2) return false
  if (survivorCount <= 4) return survivorCount > advancePerTable
  return true
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    tournamentId?: string
    roundNumber?: number
  }
  const tournamentId = body.tournamentId?.trim()
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 })
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tables: true,
      entries: true,
      staff: { select: { userId: true, role: true } },
      hands: true,
    },
  })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }
  const staff = resolveTournamentStaff({
    panitiaUserId: tournament.panitiaUserId,
    wasitUserId: tournament.wasitUserId,
    staff: tournament.staff,
  })
  if (
    !canAdministerTournament(
      user.id,
      user.role,
      tournament.createdById,
      staff.panitiaUserIds,
    )
  ) {
    return NextResponse.json({ error: "Admin or creator only" }, { status: 403 })
  }

  const roundNumber = body.roundNumber ?? tournament.currentRound
  const advancePerTable = Math.min(
    2,
    Math.max(1, tournament.koAdvancePerTable ?? 1),
  )
  const roundTables = tournament.tables.filter(
    (table) => table.roundNumber === roundNumber,
  )
  if (roundTables.length === 0) {
    return NextResponse.json(
      { error: "No tables in that round" },
      { status: 400 },
    )
  }

  const isKnockout =
    tournament.format === "KNOCKOUT" || tournament.format === "HYBRID_KO"
  const koTables = roundTables.filter((table) => table.isKnockoutMatch)
  const eliminated: string[] = []
  const advanced: string[] = []
  const podium: { entryId: string; place: number }[] = []

  const entryCount = tournament.entries.length
  const nextRound = roundNumber + 1
  let rolledTables: unknown[] = []
  let closedFinal = false

  const isFinal =
    isKnockout &&
    isFinalKoRound(roundNumber, koTables.length, entryCount, advancePerTable)

  await prisma.$transaction(async (tx) => {
    for (const table of roundTables) {
      await tx.tournamentTable.update({
        where: { id: table.id },
        data: { status: "FINISHED" },
      })
    }

    if (isFinal && koTables.length === 1) {
      const table = koTables[0]!
      const seatIds = seatedEntryIds(table)
      const scores = roundTableScores(tournament.hands, table.id, seatIds)
      const rankedIds = rankSeatedByRoundScore(seatIds, scores)

      for (let index = 0; index < rankedIds.length; index++) {
        const entryId = rankedIds[index]!
        const place = index + 1
        podium.push({ entryId, place })

        if (place === 1) {
          advanced.push(entryId)
          await tx.tournamentEntry.update({
            where: { id: entryId },
            data: {
              status: "CHAMPION",
              finishPlace: 1,
              eliminatedRound: null,
              score: 0,
            },
          })
        } else if (place <= 3) {
          advanced.push(entryId)
          await tx.tournamentEntry.update({
            where: { id: entryId },
            data: {
              status: "ELIMINATED",
              finishPlace: place,
              eliminatedRound: roundNumber,
              score: 0,
            },
          })
        } else {
          eliminated.push(entryId)
          await tx.tournamentEntry.update({
            where: { id: entryId },
            data: {
              status: "ELIMINATED",
              finishPlace: place,
              eliminatedRound: roundNumber,
            },
          })
        }
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: "COMPLETED", currentRound: roundNumber },
      })
      closedFinal = true
    } else {
      for (const table of koTables) {
        const seatIds = seatedEntryIds(table)
        const scores = roundTableScores(tournament.hands, table.id, seatIds)
        const rankedIds = rankSeatedByRoundScore(seatIds, scores)
        const winners = rankedIds.slice(0, advancePerTable)
        const losers = rankedIds.slice(advancePerTable)
        for (const entryId of winners) {
          advanced.push(entryId)
          await tx.tournamentEntry.update({
            where: { id: entryId },
            data: {
              status: "ACTIVE",
              eliminatedRound: null,
              score: 0,
              finishPlace: null,
            },
          })
        }
        for (const entryId of losers) {
          eliminated.push(entryId)
          await tx.tournamentEntry.update({
            where: { id: entryId },
            data: {
              status: "ELIMINATED",
              eliminatedRound: roundNumber,
              finishPlace: null,
            },
          })
        }
      }
    }

    if (closedFinal) {
      return
    }

    if (isKnockout && koTables.length > 0) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { currentRound: nextRound },
      })

      const freshEntries = await tx.tournamentEntry.findMany({
        where: { tournamentId },
      })
      const survivors = koSurvivorEntries(freshEntries)

      if (shouldRollNextKoRound(survivors.length, advancePerTable)) {
        rolledTables = await executeTableRoll(tx, {
          tournamentId,
          tournamentStatus: tournament.status,
          targetRound: nextRound,
          avoidFromRound: roundNumber,
          isKnockout: true,
          existingTables: tournament.tables,
          eligible: survivors,
          allowReplaceEmptyRound: false,
        })
      }
    } else {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { currentRound: nextRound },
      })
    }
  })

  return NextResponse.json({
    roundNumber,
    nextRound: closedFinal ? roundNumber : nextRound,
    advancePerTable,
    advanced,
    eliminated,
    rolledTables: rolledTables.length,
    final: closedFinal,
    podium,
  })
}