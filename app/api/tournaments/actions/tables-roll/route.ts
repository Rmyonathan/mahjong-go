import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  executeTableRoll,
  rollEligibleEntries,
} from "@/lib/tournaments/execute-table-roll"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import { canAdministerTournament } from "@/lib/tournaments/staff"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    tournamentId?: string
    advanceRound?: boolean
    isKnockoutMatch?: boolean
    finishPreviousRound?: boolean
  }
  const tournamentId = body.tournamentId?.trim()
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 })
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      entries: true,
      tables: true,
      staff: { select: { userId: true, role: true } },
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

  const isKnockout =
    body.isKnockoutMatch ??
    (tournament.format === "KNOCKOUT" || tournament.format === "HYBRID_KO")

  if (isKnockout && body.advanceRound) {
    return NextResponse.json(
      {
        error:
          "Use Close KO round — it eliminates by table score and rolls the next stage automatically",
      },
      { status: 400 },
    )
  }

  const targetRound = body.advanceRound
    ? tournament.currentRound + 1
    : tournament.currentRound

  let eligible
  try {
    eligible = rollEligibleEntries(
      tournament.entries,
      isKnockout,
      targetRound,
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cannot roll tables"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (eligible.length < 2) {
    return NextResponse.json(
      {
        error:
          "Need at least 2 registered players — register on Standings & roster first",
      },
      { status: 400 },
    )
  }

  const avoidFromRound =
    body.advanceRound && !isKnockout
      ? tournament.currentRound
      : Math.max(1, targetRound - 1)

  try {
    const created = await prisma.$transaction(async (tx) => {
      const finishRound =
        body.finishPreviousRound !== false
          ? tournament.currentRound
          : undefined

      return executeTableRoll(tx, {
        tournamentId,
        tournamentStatus: tournament.status,
        targetRound,
        avoidFromRound,
        isKnockout,
        existingTables: tournament.tables,
        eligible,
        finishRoundNumber: finishRound,
        allowReplaceEmptyRound: !body.advanceRound,
      })
    })

    return NextResponse.json({ round: targetRound, tables: created })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not roll tables"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}