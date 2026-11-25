import {
  expectedTableCountForRound,
  playersAtStartOfKoRound,
} from "@/lib/tournaments/ko-bracket"

export function isFinalKoRound(
  roundNumber: number,
  tablesInRound: number,
  entryCount: number,
  advancePerTable: number,
): boolean {
  if (tablesInRound !== 1) return false
  return (
    expectedTableCountForRound(entryCount, roundNumber, advancePerTable) === 1 &&
    playersAtStartOfKoRound(entryCount, roundNumber, advancePerTable) <= 4
  )
}

export function finalTableBadgeLabel(
  roundNumber: number,
  tablesInRound: number,
  entryCount: number,
  advancePerTable: number,
): string {
  if (
    isFinalKoRound(roundNumber, tablesInRound, entryCount, advancePerTable)
  ) {
    return "Podium · 1st–3rd"
  }
  return `Top ${advancePerTable} advance`
}