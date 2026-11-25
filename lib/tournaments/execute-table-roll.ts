import type {
  Prisma,
  TournamentEntry,
  TournamentStatus,
  TournamentTable,
} from "@prisma/client"

import {
  buildSeatingPlan,
  previousTableGroups,
  ROLL_ELIGIBLE_STATUSES,
  tableSeatFields,
} from "@/lib/tournaments/table-roll"

export type RollEligibleEntry = Pick<
  TournamentEntry,
  "id" | "playerName" | "status" | "score"
>

export async function executeTableRoll(
  tx: Prisma.TransactionClient,
  input: {
    tournamentId: string
    tournamentStatus: TournamentStatus
    targetRound: number
    avoidFromRound: number
    isKnockout: boolean
    existingTables: Pick<
      TournamentTable,
      | "roundNumber"
      | "seat1EntryId"
      | "seat2EntryId"
      | "seat3EntryId"
      | "seat4EntryId"
    >[]
    eligible: RollEligibleEntry[]
    finishRoundNumber?: number
    allowReplaceEmptyRound: boolean
  },
) {
  const {
    tournamentId,
    tournamentStatus,
    targetRound,
    avoidFromRound,
    isKnockout,
    existingTables,
    eligible,
    finishRoundNumber,
    allowReplaceEmptyRound,
  } = input

  if (eligible.length < 2) {
    throw new Error(
      "Need at least 2 eligible players to roll tables",
    )
  }

  if (finishRoundNumber != null) {
    await tx.tournamentTable.updateMany({
      where: {
        tournamentId,
        roundNumber: finishRoundNumber,
        status: { in: ["LIVE", "WAITING"] },
      },
      data: { status: "FINISHED" },
    })
  }

  const existingTarget = existingTables.filter(
    (table) => table.roundNumber === targetRound,
  )
  if (existingTarget.length > 0) {
    if (!allowReplaceEmptyRound) {
      throw new Error(
        `Round ${targetRound} already has tables — close the KO round instead of rolling twice`,
      )
    }
    const handsOnRound = await tx.tournamentHand.count({
      where: { tournamentId, roundNumber: targetRound },
    })
    if (handsOnRound > 0) {
      throw new Error("Cannot re-roll — hands already logged this round")
    }
    await tx.tournamentTable.deleteMany({
      where: { tournamentId, roundNumber: targetRound },
    })
  }

  const avoid = previousTableGroups(existingTables, avoidFromRound)
  const plan = buildSeatingPlan(eligible, avoid)

  const created = []
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
    created.push(table)
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
      status: tournamentStatus === "REGISTRATION" ? "LIVE" : tournamentStatus,
    },
  })

  return created
}

export function koSurvivorEntries(entries: TournamentEntry[]) {
  return entries.filter(
    (entry) =>
      entry.status === "ACTIVE" ||
      entry.status === "REVIVED" ||
      entry.status === "CHAMPION",
  )
}

export function rollEligibleEntries(
  entries: TournamentEntry[],
  isKnockout: boolean,
  targetRound: number,
) {
  if (isKnockout && targetRound > 1) {
    const survivors = koSurvivorEntries(entries)
    if (survivors.length < 2) {
      throw new Error(
        "Close KO round first — survivors advance before the next seating",
      )
    }
    return survivors
  }
  return entries.filter((entry) =>
    (ROLL_ELIGIBLE_STATUSES as readonly string[]).includes(entry.status),
  )
}