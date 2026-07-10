/**
 * Tabel bayaran Hong Kong Old Style (HKOS).
 *
 * Nilai per lawan saat menang lewat buangan (ron).
 * Tsumo: setiap lawan membayar setengah (dibulatkan ke atas).
 */

/** Bayaran per lawan berdasarkan total Fan (ron). */
const HKOS_RON_PAYOUT: Record<number, number> = {
  1: 2,
  2: 4,
  3: 8,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
}

const LIMIT_PAYOUT = 128

export interface HkosPayout {
  totalFan: number
  /** Bayaran dari satu lawan (ron). */
  perOpponentRon: number
  /** Total dari 3 lawan (ron). */
  totalRon: number
  /** Bayaran dari satu lawan (tsumo). */
  perOpponentTsumo: number
  /** Total dari 3 lawan (tsumo). */
  totalTsumo: number
  isLimit: boolean
}

export function getHkosPayout(totalFan: number): HkosPayout {
  const fan = Math.max(totalFan, 0)
  const isLimit = fan >= 10
  const perOpponentRon = isLimit
    ? LIMIT_PAYOUT
    : (HKOS_RON_PAYOUT[fan] ?? LIMIT_PAYOUT)

  const perOpponentTsumo = Math.ceil(perOpponentRon / 2)

  return {
    totalFan: fan,
    perOpponentRon,
    totalRon: perOpponentRon * 3,
    perOpponentTsumo,
    totalTsumo: perOpponentTsumo * 3,
    isLimit,
  }
}
