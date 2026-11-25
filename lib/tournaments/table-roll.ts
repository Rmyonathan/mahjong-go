import type { TournamentEntry } from "@prisma/client"

/** EDIT HERE — entry statuses that may be seated when rolling tables. */
export const ROLL_ELIGIBLE_STATUSES = [
  "ACTIVE",
  "REVIVED",
  "REGISTERED",
] as const

/** EDIT HERE — how many players advance per KO table when closing a round. */
export const KO_ADVANCE_PER_TABLE = 1

/** EDIT HERE — label for empty seat on partial tables. */
export const BYE_SEAT_LABEL = "BYE"

type EligibleEntry = Pick<
  TournamentEntry,
  "id" | "playerName" | "status" | "score"
>

export function shuffleInPlace<T>(items: T[], random = Math.random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return items
}

/** Previous round table groups as sorted sets of entry ids. */
export function previousTableGroups(
  tables: {
    roundNumber: number
    seat1EntryId: string | null
    seat2EntryId: string | null
    seat3EntryId: string | null
    seat4EntryId: string | null
  }[],
  roundNumber: number,
): Set<string> {
  const key = (ids: string[]) => [...ids].sort().join("|")
  const groups = new Set<string>()
  for (const table of tables) {
    if (table.roundNumber !== roundNumber) continue
    const ids = [
      table.seat1EntryId,
      table.seat2EntryId,
      table.seat3EntryId,
      table.seat4EntryId,
    ].filter((id): id is string => Boolean(id))
    if (ids.length >= 2) groups.add(key(ids))
  }
  return groups
}

/**
 * EDIT HERE — pack players into tables of 4, nudging assignments to avoid
 * repeating the exact same quartet from the prior round when possible.
 */
export function buildSeatingPlan(
  entries: EligibleEntry[],
  avoidGroups: Set<string>,
): string[][] {
  const pool = [...entries]
  shuffleInPlace(pool)
  const tables: string[][] = []

  while (pool.length > 0) {
    const table: string[] = []
    for (let seat = 0; seat < 4 && pool.length > 0; seat++) {
      let pickIndex = 0
      if (table.length >= 3 && pool.length > 0) {
        const probeKey = [...table, pool[0]!.id].sort().join("|")
        if (avoidGroups.has(probeKey) && pool.length > 1) {
          pickIndex = 1
        }
      }
      table.push(pool.splice(pickIndex, 1)[0]!.id)
    }
    tables.push(table)
  }

  return tables
}

export function tableSeatFields(
  entryIds: string[],
): [
  string | null,
  string | null,
  string | null,
  string | null,
] {
  return [
    entryIds[0] ?? null,
    entryIds[1] ?? null,
    entryIds[2] ?? null,
    entryIds[3] ?? null,
  ]
}