import type { LogHandInput } from "@/lib/session/service"
import { computePayoutDeltas } from "@/lib/session/live-demo"

const SPECS = [
  {
    winnerSeatIndex: 0,
    method: "discard" as const,
    dealtBySeatIndex: 1,
    totalFan: 4,
    combos: [
      { label: "All Chows", fan: 2 },
      { label: "Red Dragon", fan: 2 },
    ],
  },
  {
    winnerSeatIndex: 1,
    method: "self-draw" as const,
    dealtBySeatIndex: null,
    totalFan: 3,
    combos: [{ label: "Half Flush", fan: 3 }],
  },
  {
    winnerSeatIndex: 2,
    method: "discard" as const,
    dealtBySeatIndex: 3,
    totalFan: 5,
    combos: [
      { label: "All Pungs", fan: 3 },
      { label: "Seat Wind", fan: 2 },
    ],
  },
  {
    winnerSeatIndex: 3,
    method: "discard" as const,
    dealtBySeatIndex: 0,
    totalFan: 2,
    combos: [{ label: "All Chows", fan: 2 }],
  },
]

export function buildDemoTournamentHands(count: 1 | 4 = 4): LogHandInput[] {
  const slice = SPECS.slice(0, count)
  return slice.map((spec) => {
    const deltas = computePayoutDeltas({
      seatCount: 4,
      winnerSeatIndex: spec.winnerSeatIndex,
      method: spec.method,
      dealtBySeatIndex: spec.dealtBySeatIndex,
      totalFan: spec.totalFan,
    })
    const points = Math.max(...deltas, 0)
    return {
      winnerSeatIndex: spec.winnerSeatIndex,
      method: spec.method,
      dealtBySeatIndex: spec.dealtBySeatIndex,
      points,
      combos: spec.combos,
      deltas,
    }
  })
}