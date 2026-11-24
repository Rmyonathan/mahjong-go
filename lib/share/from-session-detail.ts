import type { SessionDetail } from "@/lib/mock/jade-board"
import type { JadePlayer } from "@/lib/mock/jade-data"
import type { LiveSession, LiveWind } from "@/lib/session/live-demo"

const WINDS: LiveWind[] = ["east", "south", "west", "north"]

/**
 * Build a LiveSession-shaped payload so finished `/session/[id]` pages can
 * reuse Session Newspaper + win-story share cards.
 */
export function sessionDetailToLiveShare(
  session: SessionDetail,
  players:
    | Map<string, JadePlayer>
    | Record<string, Pick<JadePlayer, "name" | "nickname">>,
): LiveSession {
  const lookup = (id: string) => {
    if (players instanceof Map) return players.get(id)
    return players[id]
  }

  const seatCount = (Math.min(
    4,
    Math.max(3, session.standings.length || session.playerIds.length || 4),
  ) || 4) as 3 | 4

  const orderedIds = session.standings.map((row) => row.playerId)
  const playerIds =
    orderedIds.length >= 3
      ? orderedIds.slice(0, seatCount)
      : session.playerIds.slice(0, seatCount)

  const seats = playerIds.map((playerId, index) => {
    const standing =
      session.standings.find((row) => row.playerId === playerId) ??
      session.standings[index]
    const player = lookup(playerId)
    const name = player?.name ?? playerId
    const nickname = player?.nickname ?? name.split(" ")[0] ?? name
    return {
      wind: WINDS[index] ?? "east",
      playerId,
      name,
      nickname,
      net: standing?.net ?? 0,
      wins: standing?.wins ?? 0,
      dealtIn: standing?.dealtIn ?? 0,
      selfDraw: standing?.selfDraw ?? 0,
      form: standing?.form ?? [],
    }
  })

  const hands = session.hands.map((hand) => {
    const isDraw = Boolean(hand.isDraw)
    const winnerSeatIndex = isDraw ? -1 : playerIds.indexOf(hand.winnerId)
    const dealtBySeatIndex =
      hand.dealtById != null ? playerIds.indexOf(hand.dealtById) : null
    const fromDeltas = Math.max(
      0,
      ...Object.values(hand.deltas).filter((value) => value > 0),
      0,
    )
    return {
      id: hand.id,
      handNo: hand.handNo,
      winnerSeatIndex,
      method: hand.method,
      dealtBySeatIndex:
        dealtBySeatIndex != null && dealtBySeatIndex >= 0
          ? dealtBySeatIndex
          : null,
      tileIds: hand.tileIds,
      winningTileId: hand.winningTileId,
      combos: hand.combos,
      points: hand.points && hand.points > 0 ? hand.points : fromDeltas,
      deltas: playerIds.map((playerId) => hand.deltas[playerId] ?? 0),
    }
  })

  return {
    id: session.id,
    title: session.title,
    board: "advanced",
    seatCount,
    seats,
    hands,
    race: seats.map((seat) => {
      const series = session.race[seat.playerId]
      return series && series.length > 0 ? series : [0, seat.net]
    }),
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    status: "finished",
    handNumber: Math.max(1, hands.length + 1),
    dealerSeatIndex: 0,
  }
}
