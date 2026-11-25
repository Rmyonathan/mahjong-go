import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  buildSeatingPlan,
  previousTableGroups,
  ROLL_ELIGIBLE_STATUSES,
  tableSeatFields,
} from "@/lib/tournaments/table-roll"

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const { id: tournamentId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    advanceRound?: boolean
    isKnockoutMatch?: boolean
    finishPreviousRound?: boolean
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      entries: true,
      tables: true,
    },
  })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  const eligible = tournament.entries.filter((entry) =>
    (ROLL_ELIGIBLE_STATUSES as readonly string[]).includes(entry.status),
  )
  if (eligible.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 eligible players to roll tables" },
      { status: 400 },
    )
  }

  const targetRound = body.advanceRound
    ? tournament.currentRound + 1
    : tournament.currentRound

  const avoid = previousTableGroups(
    tournament.tables,
    tournament.currentRound,
  )
  const plan = buildSeatingPlan(eligible, avoid)
  const isKnockout =
    body.isKnockoutMatch ??
    (tournament.format === "KNOCKOUT" || tournament.format === "HYBRID_KO")

  try {
  const created = await prisma.$transaction(async (tx) => {
    if (body.finishPreviousRound !== false) {
      await tx.tournamentTable.updateMany({
        where: {
          tournamentId,
          roundNumber: tournament.currentRound,
          status: { in: ["LIVE", "WAITING"] },
        },
        data: { status: "FINISHED" },
      })
    }

    const existingTarget = await tx.tournamentTable.findMany({
      where: { tournamentId, roundNumber: targetRound },
    })
  // EDIT HERE — re-roll same round only when no hands were logged on that round yet.
    if (existingTarget.length > 0) {
      if (body.advanceRound) {
        throw new Error(
          `Round ${targetRound} already has tables — cannot advance into occupied round`,
        )
      }
      const handsOnRound = await tx.tournamentHand.count({
        where: {
          tournamentId,
          roundNumber: targetRound,
        },
      })
      if (handsOnRound > 0) {
        throw new Error(
          "Cannot re-roll — hands already logged this round",
        )
      }
      await tx.tournamentTable.deleteMany({
        where: { tournamentId, roundNumber: targetRound },
      })
    }

    const tables = []
    let tableNumber = 1
    for (const group of plan) {
      const [s1, s2, s3, s4] = tableSeatFields(group)
      const table = await tx.tournamentTable.create({
        data: {
          tournamentId,
          roundNumber: targetRound,
          tableNumber,
          isKnockoutMatch: Boolean(isKnockout),
          status: "LIVE",
          seat1EntryId: s1,
          seat2EntryId: s2,
          seat3EntryId: s3,
          seat4EntryId: s4,
        },
      })
      tables.push(table)
      tableNumber++
    }

    await tx.tournamentEntry.updateMany({
      where: {
        id: { in: eligible.map((entry) => entry.id) },
        status: "REGISTERED",
      },
      data: { status: "ACTIVE" },
    })

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        currentRound: targetRound,
        status: tournament.status === "REGISTRATION" ? "LIVE" : tournament.status,
      },
    })

    return tables
  })

  return NextResponse.json({ round: targetRound, tables: created })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not roll tables"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}