import type { HandTile } from "./types"

const SUIT_RANK: Record<string, number> = {
  dots: 0,
  bamboo: 1,
  characters: 2,
}

const WIND_RANK: Record<string, number> = {
  east: 0,
  south: 1,
  west: 2,
  north: 3,
}

const DRAGON_RANK: Record<string, number> = {
  red: 0,
  green: 1,
  white: 2,
}

/** [BARU] Kunci sort: Bulatan → Bambu → Karakter → Honor (Angin → Naga). */
function tileSortKey(tile: HandTile): number {
  if (tile.category === "suit") {
    return SUIT_RANK[tile.suit]! * 100 + tile.value
  }
  if (tile.category === "honor") {
    if ("wind" in tile && tile.wind) {
      return 300 + WIND_RANK[tile.wind]!
    }
    if ("dragon" in tile && tile.dragon) {
      return 400 + DRAGON_RANK[tile.dragon]!
    }
  }
  return 999
}

/** [BARU] Urutkan tangan utama per suit lalu nilai. */
export function sortMainHand(tiles: HandTile[]): HandTile[] {
  return [...tiles].sort((a, b) => tileSortKey(a) - tileSortKey(b))
}
