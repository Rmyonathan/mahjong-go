import {
  expectedTableCountForRound,
  playersAtStartOfKoRound,
} from "@/lib/tournaments/ko-bracket"

export function knockoutRoundLabel(
  roundNumber: number,
  registeredCount: number,
  advancePerTable: number,
) {
  const players = playersAtStartOfKoRound(
    registeredCount,
    roundNumber,
    advancePerTable,
  )
  const tables = expectedTableCountForRound(
    registeredCount,
    roundNumber,
    advancePerTable,
  )

  if (tables === 1 && players <= 4) return "Final"
  if (players <= 4) return "4 Besar"
  if (players <= 8) return "8 Besar"
  if (players <= 16) return "16 Besar"
  return `Round ${roundNumber}`
}