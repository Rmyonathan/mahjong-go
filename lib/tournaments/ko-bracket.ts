/** How many KO bracket rounds for N entrants at 4 per table. */
export function computeKoRoundCount(
  entryCount: number,
  advancePerTable: number,
): number {
  let players = Math.max(2, entryCount)
  let rounds = 0
  while (true) {
    rounds++
    const tables = Math.ceil(players / 4)
    if (tables <= 1 && players <= 4) break
    players = tables * advancePerTable
    if (rounds > 12) break
  }
  return Math.max(1, rounds)
}

export function playersAtStartOfKoRound(
  registeredCount: number,
  roundNumber: number,
  advancePerTable: number,
): number {
  let players = Math.max(2, registeredCount)
  for (let round = 1; round < roundNumber; round++) {
    const tables = Math.ceil(players / 4)
    players = tables * advancePerTable
  }
  return players
}

export function expectedTableCountForRound(
  entryCount: number,
  roundNumber: number,
  advancePerTable: number,
): number {
  const players = playersAtStartOfKoRound(
    entryCount,
    roundNumber,
    advancePerTable,
  )
  return Math.max(1, Math.ceil(players / 4))
}