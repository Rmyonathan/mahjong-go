/**
 * Jade / Ruby / Pearl Dragon — Half Flush eksklusif per pasangan Naga + suit.
 *
 * - Jade:  Naga Hijau + Bambu saja
 * - Ruby:  Naga Merah + Karakter saja
 * - Pearl: Naga Putih + Bulatan saja
 *
 * Tidak boleh ada Angin atau Naga lain (berbeda dari Half Flush biasa).
 * Naga target harus Pung/Kong (3+), bukan Pasang (2). Sisanya boleh Pung/Kong atau Chi.
 */

import type { SuitType, Tile } from "./types"

export interface DragonSuitConfig {
  key: string
  name: string
  dragonId: string
  suit: SuitType
}

export const DRAGON_SUIT_HANDS: DragonSuitConfig[] = [
  {
    key: "jade-dragon",
    name: "Jade Dragon",
    dragonId: "dragon-green",
    suit: "bamboo",
  },
  {
    key: "ruby-dragon",
    name: "Ruby Dragon",
    dragonId: "dragon-red",
    suit: "characters",
  },
  {
    key: "pearl-dragon",
    name: "Pearl Dragon",
    dragonId: "dragon-white",
    suit: "dots",
  },
]

/** Ubin yang sah untuk tangan Naga+suit ini. */
export function isAllowedDragonSuitTile(
  tile: Tile,
  dragonId: string,
  suit: SuitType,
): boolean {
  return (
    tile.id === dragonId ||
    (tile.category === "suit" && tile.suit === suit)
  )
}

export interface DragonSuitComposition {
  dragonCount: number
  suitCount: number
  forbiddenCount: number
  isPure: boolean
}

/** Hitung komposisi tangan terhadap aturan Naga+suit eksklusif. */
export function analyzeDragonSuitComposition(
  tiles: Tile[],
  dragonId: string,
  suit: SuitType,
): DragonSuitComposition {
  let dragonCount = 0
  let suitCount = 0
  let forbiddenCount = 0

  for (const tile of tiles) {
    if (tile.id === dragonId) {
      dragonCount += 1
      continue
    }
    if (tile.category === "suit" && tile.suit === suit) {
      suitCount += 1
      continue
    }
    if (tile.category !== "bonus") {
      forbiddenCount += 1
    }
  }

  return {
    dragonCount,
    suitCount,
    forbiddenCount,
    isPure: forbiddenCount === 0,
  }
}

/**
 * Deteksi menang — semua ubin Naga target + suit; Naga harus Pung/Kong (3+).
 */
export function isDragonSuitWin(
  standardTiles: Tile[],
  dragonId: string,
  suit: SuitType,
  _pairId: string,
  pungLikeIds: string[],
): boolean {
  const { dragonCount, forbiddenCount } = analyzeDragonSuitComposition(
    standardTiles,
    dragonId,
    suit,
  )
  if (forbiddenCount > 0 || dragonCount < 3) return false

  return pungLikeIds.includes(dragonId)
}

export function parseDragonSuitTarget(
  target: string,
): { dragonId: string; suit: SuitType } | null {
  const found = DRAGON_SUIT_HANDS.find((h) => h.key === target)
  if (!found) return null
  return { dragonId: found.dragonId, suit: found.suit }
}
