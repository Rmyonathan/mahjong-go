/**
 * Jade Mahjong Faan → Social Points / Jade Miles (per 1.000).
 * Source: public/jade_mahjong_hk_rules_scoring_specification.md §6
 */

// EDIT HERE — Jade Faan-to-base table (units of 1.000 Jade Miles)
export const FAAN_TO_BASE_POINTS: Record<number, number> = {
  0: 1000, // Chicken Hand (when ruleset allows 0 Faan)
  1: 1000,
  2: 2000,
  3: 4000,
  4: 8000,
  5: 12000, // EDIT HERE — some houses use 16000 for 5 Faan
  6: 16000,
  7: 24000,
  8: 32000,
  9: 48000,
  10: 64000, // Limit / max
}

/** Cap total Faan for payout (Limit 10). */
export const FAAN_LIMIT = 10

// EDIT HERE — set true for full-shooter / bao (discarder pays entire 4×B alone)
export const FULL_SHOOTER_DISCARD = false

export type WinMethodPayout = "discard" | "self-draw"

export interface JadePayout {
  totalFan: number
  cappedFan: number
  /** Base B from the table (per 1.000). */
  basePoints: number
  isLimit: boolean
  /** Winner take on discard (normally 4×B). */
  winnerDiscard: number
  /** Discarder pays (normally 2×B). */
  discarderPays: number
  /** Each of the other two pays on discard (normally 1×B). */
  otherPaysDiscard: number
  /** Winner take on self-draw (6×B). */
  winnerSelfDraw: number
  /** Each of 3 opponents pays on self-draw (2×B). */
  eachPaysSelfDraw: number
  /** @deprecated Prefer winnerDiscard — kept for older UI labels */
  perOpponentRon: number
  totalRon: number
  perOpponentTsumo: number
  totalTsumo: number
}

export function basePointsForFan(totalFan: number): number {
  const capped = Math.min(FAAN_LIMIT, Math.max(0, Math.floor(totalFan)))
  return FAAN_TO_BASE_POINTS[capped] ?? FAAN_TO_BASE_POINTS[FAAN_LIMIT]!
}

export function getJadePayout(totalFan: number): JadePayout {
  const fan = Math.max(0, Math.floor(totalFan))
  const cappedFan = Math.min(FAAN_LIMIT, fan)
  const B = basePointsForFan(cappedFan)
  const isLimit = fan >= FAAN_LIMIT

  const discarderPays = FULL_SHOOTER_DISCARD ? 4 * B : 2 * B
  const otherPaysDiscard = FULL_SHOOTER_DISCARD ? 0 : 1 * B
  const winnerDiscard = FULL_SHOOTER_DISCARD
    ? 4 * B
    : discarderPays + otherPaysDiscard * 2

  return {
    totalFan: fan,
    cappedFan,
    basePoints: B,
    isLimit,
    winnerDiscard,
    discarderPays,
    otherPaysDiscard,
    winnerSelfDraw: 6 * B,
    eachPaysSelfDraw: 2 * B,
    // Legacy-shaped fields (ron ≈ old “per opponent” display uses discarder share)
    perOpponentRon: discarderPays,
    totalRon: winnerDiscard,
    perOpponentTsumo: 2 * B,
    totalTsumo: 6 * B,
  }
}

/** @deprecated Use getJadePayout — same math, Jade house table. */
export function getHkosPayout(totalFan: number): JadePayout {
  return getJadePayout(totalFan)
}

/**
 * Zero-sum seat deltas from Jade §6.
 * Discard: discarder −2B, others −1B, winner +4B.
 * Self-draw: each opponent −2B, winner +6B.
 */
export function getJadeSeatDeltas(options: {
  seatCount: number
  winnerSeatIndex: number
  method: WinMethodPayout
  dealtBySeatIndex: number | null
  /** Total Faan before cap — B is derived inside. */
  totalFan: number
}): number[] {
  const {
    seatCount,
    winnerSeatIndex,
    method,
    dealtBySeatIndex,
    totalFan,
  } = options
  const payout = getJadePayout(totalFan)
  const deltas = Array.from({ length: seatCount }, () => 0)

  if (method === "self-draw") {
    deltas[winnerSeatIndex] = payout.winnerSelfDraw
    for (let i = 0; i < seatCount; i++) {
      if (i === winnerSeatIndex) continue
      deltas[i] = -payout.eachPaysSelfDraw
    }
    return deltas
  }

  // Discard / Rong
  deltas[winnerSeatIndex] = payout.winnerDiscard
  if (dealtBySeatIndex != null && dealtBySeatIndex !== winnerSeatIndex) {
    deltas[dealtBySeatIndex] = -payout.discarderPays
  }
  for (let i = 0; i < seatCount; i++) {
    if (i === winnerSeatIndex || i === dealtBySeatIndex) continue
    deltas[i] = -payout.otherPaysDiscard
  }

  // If dealt-in missing, fall back to equal split of winner take (should not happen)
  const sum = deltas.reduce((a, b) => a + b, 0)
  if (sum !== 0 && dealtBySeatIndex == null) {
    const losers = Array.from({ length: seatCount }, (_, i) => i).filter(
      (i) => i !== winnerSeatIndex,
    )
    const share = Math.floor(payout.winnerDiscard / losers.length)
    let rem = payout.winnerDiscard - share * losers.length
    deltas[winnerSeatIndex] = payout.winnerDiscard
    for (const index of losers) {
      deltas[index] = -(share + (rem > 0 ? 1 : 0))
      if (rem > 0) rem -= 1
    }
  }

  return deltas
}

export function formatJadeMiles(points: number): string {
  return new Intl.NumberFormat("id-ID").format(points)
}
