import type { TournamentHand } from "@prisma/client"

export function seatedEntryIds(table: {
  seat1EntryId: string | null
  seat2EntryId: string | null
  seat3EntryId: string | null
  seat4EntryId: string | null
}): (string | null)[] {
  return [
    table.seat1EntryId,
    table.seat2EntryId,
    table.seat3EntryId,
    table.seat4EntryId,
  ]
}

/** Net points at one table (one round) from logged tournament hands. */
export function roundTableScores(
  hands: Pick<TournamentHand, "tableId" | "deltasJson">[],
  tableId: string,
  seatEntryIds: (string | null)[],
): Map<string, number> {
  const nets = new Map<string, number>()
  for (const entryId of seatEntryIds) {
    if (entryId) nets.set(entryId, 0)
  }
  for (const hand of hands) {
    if (hand.tableId !== tableId) continue
    let deltas: number[] = []
    try {
      const parsed = JSON.parse(hand.deltasJson) as unknown
      deltas = Array.isArray(parsed)
        ? parsed.map((value) => Number(value) || 0)
        : []
    } catch {
      continue
    }
    for (let seatIndex = 0; seatIndex < seatEntryIds.length; seatIndex++) {
      const entryId = seatEntryIds[seatIndex]
      if (!entryId) continue
      nets.set(entryId, (nets.get(entryId) ?? 0) + (deltas[seatIndex] ?? 0))
    }
  }
  return nets
}

/** Higher score wins; if all minus, least minus (closest to zero) ranks higher. */
export function rankSeatedByRoundScore(
  seatEntryIds: (string | null)[],
  scores: Map<string, number>,
): string[] {
  return seatEntryIds
    .filter((id): id is string => Boolean(id))
    .sort((a, b) => {
      const diff = (scores.get(b) ?? 0) - (scores.get(a) ?? 0)
      if (diff !== 0) return diff
      return a.localeCompare(b)
    })
}

export function advancingEntryIdsForTable(
  seatEntryIds: (string | null)[],
  scores: Map<string, number>,
  advancePerTable: number,
): string[] {
  return rankSeatedByRoundScore(seatEntryIds, scores).slice(
    0,
    Math.max(1, advancePerTable),
  )
}