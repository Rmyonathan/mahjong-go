/**
 * Nine Gates (Chuuren Poutou / 九蓮宝燈) — pola limit satu suit.
 *
 * Fondasi: 1-1-1-2-3-4-5-6-7-8-9-9-9 (satu corak) + satu ubin ekstra
 * dari corak yang sama → sembilan pilihan menang (1–9).
 */

import type { SuitType, Tile } from "./types"

export const SUIT_ORDER: SuitType[] = ["dots", "bamboo", "characters"]

/** Minimum tiap nilai dalam fondasi 111-2345678-999. */
export const NINE_GATES_MIN: Record<number, number> = {
  1: 3,
  2: 1,
  3: 1,
  4: 1,
  5: 1,
  6: 1,
  7: 1,
  8: 1,
  9: 3,
}

/** Total slot fondasi (3 + 7 + 3). */
export const NINE_GATES_FOUNDATION_SLOTS = 13

export function suitValueCounts(tiles: Tile[], suit: SuitType): number[] {
  const counts = new Array<number>(10).fill(0)
  for (const t of tiles) {
    if (t.category === "suit" && t.suit === suit) {
      counts[t.value] += 1
    }
  }
  return counts
}

/** Berapa slot fondasi yang sudah terisi (maks. 13). */
export function nineGatesFilledSlots(counts: number[]): number {
  let filled = 0
  for (let v = 1; v <= 9; v++) {
    filled += Math.min(counts[v] ?? 0, NINE_GATES_MIN[v]!)
  }
  return filled
}

/** Kekurangan ubin untuk melengkapi fondasi pola. */
export function nineGatesDeficiency(counts: number[]): number {
  let d = 0
  for (let v = 1; v <= 9; v++) {
    d += Math.max(0, NINE_GATES_MIN[v]! - (counts[v] ?? 0))
  }
  return d
}

/**
 * Ubin melebihi kapasitas berguna sebelum menang.
 * Nilai 1/9: maks. 4 (3 fondasi + 1 ekstra); 2–8: maks. 2 (1 + 1 ekstra).
 */
export function nineGatesExcess(counts: number[]): number {
  let excess = 0
  for (let v = 1; v <= 9; v++) {
    const cap = v === 1 || v === 9 ? 4 : 2
    excess += Math.max(0, (counts[v] ?? 0) - cap)
  }
  return excess
}

export interface NineGatesMeasure {
  suit: SuitType
  filled: number
  deficiency: number
  percent: number
  isPure: boolean
}

/** Ukur progres Nine Gates untuk satu suit. */
export function measureNineGatesForSuit(
  tiles: Tile[],
  suit: SuitType,
  options: { strict?: boolean } = {},
): NineGatesMeasure | null {
  const strict = options.strict ?? false

  const trashCount = tiles.filter(
    (t) =>
      t.category === "honor" ||
      (t.category === "suit" && t.suit !== suit),
  ).length

  // Deteksi menang: wajib murni satu suit.
  if (strict && trashCount > 0) return null

  const counts = suitValueCounts(tiles, suit)
  const filled = nineGatesFilledSlots(counts)
  if (filled === 0) return null

  const deficiency = nineGatesDeficiency(counts)
  let percent = Math.round((filled / NINE_GATES_FOUNDATION_SLOTS) * 100)

  // [FIX] Saran strategi: ukur fondasi suit target; penalti ringan per ubin sampah.
  if (!strict && trashCount > 0) {
    percent = Math.max(0, percent - trashCount * 3)
  }

  return { suit, filled, deficiency, percent, isPure: trashCount === 0 }
}

/** Suit terbaik untuk Nine Gates pada tangan saat ini. */
export function bestNineGatesMeasure(
  tiles: Tile[],
  options: { strict?: boolean } = {},
): NineGatesMeasure | null {
  let best: NineGatesMeasure | null = null
  for (const suit of SUIT_ORDER) {
    const m = measureNineGatesForSuit(tiles, suit, options)
    if (!m) continue
    if (
      !best ||
      m.filled > best.filled ||
      (m.filled === best.filled && m.deficiency < best.deficiency)
    ) {
      best = m
    }
  }
  return best
}

/**
 * Deteksi Nine Gates lengkap — 14 ubin, satu suit, fondasi 111-2345678-999
 * + tepat satu ubin ekstra dari suit yang sama.
 */
export function detectNineGatesSuit(standardTiles: Tile[]): SuitType | null {
  if (standardTiles.length !== 14) return null

  for (const suit of SUIT_ORDER) {
    const m = measureNineGatesForSuit(standardTiles, suit, { strict: true })
    if (!m || m.deficiency > 0) continue

    const counts = suitValueCounts(standardTiles, suit)
    const suitTotal = counts.slice(1).reduce((sum, n) => sum + n, 0)
    if (suitTotal !== 14) continue

    return suit
  }
  return null
}

function adjustForTileCount(shanten: number, tileCount: number): number {
  const mod = tileCount % 3
  if (mod === 0) return shanten + 1
  return shanten
}

/** Shanten menuju Nine Gates — berbasis kekurangan fondasi, bukan dominasi suit. */
export function calculateNineGatesShanten(hand: Tile[]): number {
  const standard = hand.filter((t) => t.category !== "bonus")
  let best = 99

  for (const suit of SUIT_ORDER) {
    const counts = suitValueCounts(standard, suit)
    const trash = standard.filter(
      (t) =>
        t.category === "honor" ||
        (t.category === "suit" && t.suit !== suit),
    )

    const deficiency = nineGatesDeficiency(counts)
    const excess = nineGatesExcess(counts)
    const filled = nineGatesFilledSlots(counts)

    let raw = deficiency + trash.length * 2 + excess
    if (standard.length < 14) {
      raw = Math.max(raw, NINE_GATES_FOUNDATION_SLOTS - filled)
    }

    const shanten = adjustForTileCount(Math.max(-1, raw - 1), standard.length)
    best = Math.min(best, shanten)
  }

  return best
}

/** Suit target Nine Gates untuk prioritas buangan. */
export function nineGatesTargetSuit(hand: Tile[]): SuitType {
  const measure = bestNineGatesMeasure(
    hand.filter((t) => t.category !== "bonus"),
    { strict: false },
  )
  if (measure) return measure.suit

  let bestSuit: SuitType = "dots"
  let bestCount = 0
  for (const suit of SUIT_ORDER) {
    const n = hand.filter(
      (t) => t.category === "suit" && t.suit === suit,
    ).length
    if (n > bestCount) {
      bestCount = n
      bestSuit = suit
    }
  }
  return bestSuit
}
