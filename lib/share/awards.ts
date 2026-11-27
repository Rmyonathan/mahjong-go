import type { LiveHand, LiveSession } from "@/lib/session/live-demo"

export type SessionAward = {
  id: "mvp" | "biggest" | "dealt"
  title: string
  subtitle: string
  playerName: string
  detail: string
}

export function computeSessionAwards(session: LiveSession): SessionAward[] {
  const ranked = [...session.seats].sort((a, b) => b.net - a.net)
  const mvp = ranked[0]

  const biggestHand = session.hands
    .filter((hand) => hand.winnerSeatIndex >= 0 && hand.points > 0)
    .reduce<LiveHand | null>(
      (best, hand) => (!best || hand.points > best.points ? hand : best),
      null,
    )
  const biggestSeat =
    biggestHand && biggestHand.winnerSeatIndex >= 0
      ? session.seats[biggestHand.winnerSeatIndex]
      : null

  const dealtInKing = [...session.seats].sort(
    (a, b) => b.dealtIn - a.dealtIn || a.net - b.net,
  )[0]

  const awards: SessionAward[] = []

  if (mvp) {
    awards.push({
      id: "mvp",
      title: "MVP of the Night",
      subtitle: "Top net on the ledger",
      playerName: mvp.name,
      detail: `${mvp.wins} wins · net ${formatAwardPts(mvp.net)}`,
    })
  }

  if (biggestSeat && biggestHand) {
    const combo =
      [...biggestHand.combos]
        .filter((c) => c.label !== "Draw")
        .sort((a, b) => b.fan - a.fan)[0]?.label ?? "Winning hand"
    awards.push({
      id: "biggest",
      title: "Biggest Hand",
      subtitle: combo,
      playerName: biggestSeat.name,
      detail: formatAwardPts(biggestHand.points),
    })
  }

  if (dealtInKing && dealtInKing.dealtIn > 0) {
    awards.push({
      id: "dealt",
      title: "Most Dealt In",
      subtitle: "Softest discards",
      playerName: dealtInKing.name,
      detail: `${dealtInKing.dealtIn} deal-ins`,
    })
  }

  return awards
}

function formatAwardPts(value: number) {
  const abs = new Intl.NumberFormat("id-ID").format(Math.abs(value))
  if (value > 0) return `+${abs}`
  if (value < 0) return `−${abs}`
  return "0"
}
