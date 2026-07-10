/**
 * Mesin Shanten (Deficiency) & Uke-ire (Tile Acceptance) — deterministik.
 *
 * Menghitung seberapa dekat sebuah tangan ke kondisi menang, lalu mensimulasikan
 * buangan terbaik berdasarkan jumlah ubin fisik yang masih bisa ditarik.
 */

import { SUIT_TILES, HONOR_TILES, TILE_BY_ID } from "./tiles"
import {
  calculateBlocks,
  REQUIRED_BLOCKS,
} from "./suggestions"
import {
  calculateNineGatesShanten,
  nineGatesTargetSuit,
  NINE_GATES_MIN,
  suitValueCounts,
} from "./nine-gates"
import { parseDragonSuitTarget } from "./dragon-suit"
import type { SuitType, Tile } from "./types"

/** 34 jenis ubin standar (suit + honor; tanpa Bunga/Musim). */
export const STANDARD_TILE_KINDS: Tile[] = [...SUIT_TILES, ...HONOR_TILES]

/** Indeks 0–33 untuk memoization & larik hitungan. */
const TILE_INDEX_IDS: string[] = STANDARD_TILE_KINDS.map((t) => t.id)

const INDEX_BY_ID: Record<string, number> = Object.fromEntries(
  TILE_INDEX_IDS.map((id, i) => [id, i]),
)

/** 13 jenis ubin Thirteen Orphans. */
const ORPHAN_IDS = new Set<string>([
  "characters-1",
  "characters-9",
  "bamboo-1",
  "bamboo-9",
  "dots-1",
  "dots-9",
  "wind-east",
  "wind-south",
  "wind-west",
  "wind-north",
  "dragon-red",
  "dragon-green",
  "dragon-white",
])

/** Hasil pemeriksaan shanten khusus (atipikal). */
export interface SpecialShanten {
  sevenPairs: number
  thirteenOrphans: number
}

/** Ubin uke-ire yang masih tersisa di dek. */
export interface UkeIreTile {
  tile: Tile
  /** Salinan fisik yang masih bisa ditarik. */
  remaining: number
}

/** Rekomendasi buangan dengan daftar uke-ire. */
export interface DiscardRecommendation {
  /** Id jenis ubin yang dibuang. */
  discardId: string
  /** Representasi ubin untuk UI. */
  discardTile: Tile
  /** Total salinan ubin uke-ire yang masih ada di dek. */
  ukeIreCount: number
  /** Daftar ubin yang menurunkan shanten jika ditarik. */
  ukeIreTiles: UkeIreTile[]
  /** Shanten setelah buangan (sebelum draw). */
  shantenAfterDiscard: number
}

/** Hasil analisis lengkap untuk panel UI. */
export interface ShantenAnalysis {
  shanten: number
  standardShanten: number
  special: SpecialShanten
  recommendations: DiscardRecommendation[]
  /** [BARU] Ubin penyelesaian saat tenpai (shanten 0). */
  winningTiles: UkeIreTile[]
  /** [BARU] Target yang dipakai untuk analisis ini. */
  targetKey: string | null
}

// ---------------------------------------------------------------------------
// Konversi tangan → larik hitungan 34-slot.
// ---------------------------------------------------------------------------

function toCounts(hand: Tile[]): number[] {
  const counts = new Array<number>(34).fill(0)
  for (const tile of hand) {
    if (tile.category === "bonus") continue
    const idx = INDEX_BY_ID[tile.id]
    if (idx !== undefined) counts[idx] += 1
  }
  return counts
}

function countsToTiles(counts: number[]): Tile[] {
  const out: Tile[] = []
  for (let i = 0; i < 34; i++) {
    const tile = TILE_BY_ID[TILE_INDEX_IDS[i]]
    if (!tile) continue
    for (let n = 0; n < counts[i]; n++) out.push(tile)
  }
  return out
}

function totalTiles(counts: number[]): number {
  return counts.reduce((s, n) => s + n, 0)
}

/** Penyesuaian shanten untuk jumlah ubin ≠ 13 (12 → +1, 14 → +0, dst.). */
function adjustForTileCount(shanten: number, tileCount: number): number {
  const mod = tileCount % 3
  if (mod === 0) return shanten + 1
  return shanten
}

// ---------------------------------------------------------------------------
// [BARU] Shanten standar — backtracking + memoization.
// Formula: 8 - (2 × set_lengkap) - min(proto_set, 4 - set_lengkap) - (pasang ? 1 : 0)
// ---------------------------------------------------------------------------

const shantenMemo = new Map<string, number>()

function memoKey(
  counts: number[],
  idx: number,
  completeSets: number,
  protoSets: number,
  hasPair: boolean,
): string {
  return `${idx}|${completeSets}|${protoSets}|${hasPair ? 1 : 0}|${counts.slice(idx).join(",")}`
}

function shantenLeaf(
  completeSets: number,
  protoSets: number,
  hasPair: boolean,
): number {
  const cappedProto = Math.min(protoSets, Math.max(0, 4 - completeSets))
  return 8 - 2 * completeSets - cappedProto - (hasPair ? 1 : 0)
}

function calculateStandardShantenFromCounts(counts: number[]): number {
  shantenMemo.clear()
  const raw = standardShantenDfs(counts, 0, 0, 0, false)
  return adjustForTileCount(raw, totalTiles(counts))
}

function standardShantenDfs(
  counts: number[],
  idx: number,
  completeSets: number,
  protoSets: number,
  hasPair: boolean,
): number {
  while (idx < 34 && counts[idx] === 0) idx++
  if (idx >= 34) return shantenLeaf(completeSets, protoSets, hasPair)

  const key = memoKey(counts, idx, completeSets, protoSets, hasPair)
  const cached = shantenMemo.get(key)
  if (cached !== undefined) return cached

  let best = shantenLeaf(completeSets, protoSets, hasPair)

  const takeComplete = (nextComplete: number) => {
    best = Math.min(
      best,
      standardShantenDfs(counts, idx, nextComplete, protoSets, hasPair),
    )
  }

  const takeProto = (nextProto: number) => {
    if (completeSets + protoSets >= 4) return
    best = Math.min(
      best,
      standardShantenDfs(counts, idx, completeSets, nextProto, hasPair),
    )
  }

  // --- Set lengkap: Kong (4 salinan = 1 meld) ---
  if (counts[idx] >= 4) {
    counts[idx] -= 4
    takeComplete(completeSets + 1)
    counts[idx] += 4
  }

  // --- Set lengkap: Pung (3 salinan) ---
  if (counts[idx] >= 3) {
    counts[idx] -= 3
    takeComplete(completeSets + 1)
    counts[idx] += 3
  }

  // --- Set lengkap: Chow (urutan suit) ---
  if (idx < 27 && idx % 9 < 7 && counts[idx] >= 1 && counts[idx + 1] >= 1 && counts[idx + 2] >= 1) {
    counts[idx]--
    counts[idx + 1]--
    counts[idx + 2]--
    takeComplete(completeSets + 1)
    counts[idx]++
    counts[idx + 1]++
    counts[idx + 2]++
  }

  // --- Proto-set: Pasang (mata) ---
  if (!hasPair && counts[idx] >= 2) {
    counts[idx] -= 2
    best = Math.min(
      best,
      standardShantenDfs(counts, idx, completeSets, protoSets, true),
    )
    counts[idx] += 2
  }

  // --- Proto-set: tunggu (taatsu) — hanya jika belum 4 blok ---
  if (completeSets + protoSets < 4) {
    // Pasang sebagai proto bila mata sudah ada.
    if (hasPair && counts[idx] >= 2) {
      counts[idx] -= 2
      takeProto(protoSets + 1)
      counts[idx] += 2
    }
    // Tunggu terbuka (v, v+1) — suit.
    if (idx < 27 && idx % 9 < 8 && counts[idx] >= 1 && counts[idx + 1] >= 1) {
      counts[idx]--
      counts[idx + 1]--
      takeProto(protoSets + 1)
      counts[idx]++
      counts[idx + 1]++
    }
    // Tunggu bercelah / tepi (v, v+2) — suit.
    if (idx < 27 && idx % 9 < 7 && counts[idx] >= 1 && counts[idx + 2] >= 1) {
      counts[idx]--
      counts[idx + 2]--
      takeProto(protoSets + 1)
      counts[idx]++
      counts[idx + 2]++
    }
    // Honor: dua salinan menunggu Pung ketiga.
    if (idx >= 27 && counts[idx] >= 2) {
      counts[idx] -= 2
      takeProto(protoSets + 1)
      counts[idx] += 2
    }
  }

  // --- Buang satu ubin terisolasi (0 poin) ---
  counts[idx]--
  best = Math.min(
    best,
    standardShantenDfs(counts, idx, completeSets, protoSets, hasPair),
  )
  counts[idx]++

  shantenMemo.set(key, best)
  return best
}

/** Shanten standar (4 set + 1 pasang). */
export function calculateStandardShanten(hand: Tile[]): number {
  return calculateStandardShantenFromCounts(toCounts(hand))
}

// ---------------------------------------------------------------------------
// [BARU] Shanten khusus — Seven Pairs & Thirteen Orphans.
// ---------------------------------------------------------------------------

export function checkSpecialShanten(hand: Tile[]): SpecialShanten {
  const counts = toCounts(hand)

  // Seven Pairs: 6 - (jumlah pasang unik).
  let uniquePairs = 0
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) uniquePairs += 1
  }
  const sevenPairs = 6 - uniquePairs

  // Thirteen Orphans: 13 - (ubin orphan unik) - (1 jika ada pasang orphan).
  let uniqueOrphans = 0
  let orphanPair = false
  for (const id of ORPHAN_IDS) {
    const idx = INDEX_BY_ID[id]
    if (idx === undefined) continue
    if (counts[idx] >= 1) uniqueOrphans += 1
    if (counts[idx] >= 2) orphanPair = true
  }
  const thirteenOrphans = 13 - uniqueOrphans - (orphanPair ? 1 : 0)

  return { sevenPairs, thirteenOrphans }
}

/** Shanten terendah dari standar + khusus. */
export function getBestShanten(hand: Tile[]): number {
  const standard = calculateStandardShanten(hand)
  const special = checkSpecialShanten(hand)
  return Math.min(standard, special.sevenPairs, special.thirteenOrphans)
}

// ---------------------------------------------------------------------------
// [BARU] Shanten berbasis target — formula eksplisit per pola (bukan BFS generik).
// ---------------------------------------------------------------------------

/** Konversi skor blok (0–5) → shanten (-1 = agar, 0 = tenpai, dst.). */
function blocksToShanten(blocks: number, tileCount: number): number {
  const raw = Math.ceil(REQUIRED_BLOCKS - blocks - 1e-9) - 1
  return adjustForTileCount(raw, tileCount)
}

function parseSuitFromTarget(target: string, prefix: string): SuitType | null {
  if (!target.startsWith(prefix)) return null
  const suit = target.slice(prefix.length) as SuitType
  return suit === "dots" || suit === "bamboo" || suit === "characters"
    ? suit
    : null
}

/** [FIX] Shanten Naga+suit: Naga pasang/Pung + suit; penalti honor/suit salah. */
function calculateDragonFlushShanten(
  hand: Tile[],
  dragonId: string,
  targetSuit: SuitType,
): number {
  const relevant = hand.filter(
    (t) =>
      t.id === dragonId ||
      (t.category === "suit" && t.suit === targetSuit),
  )
  const trash = hand.filter(
    (t) =>
      t.category !== "bonus" &&
      t.id !== dragonId &&
      !(t.category === "suit" && t.suit === targetSuit),
  )
  const counts = toCounts(hand)
  const dragonIdx = INDEX_BY_ID[dragonId]
  const dragonCopies = dragonIdx !== undefined ? counts[dragonIdx]! : 0

  let dragonDeficit = 0
  if (dragonCopies === 0) dragonDeficit = 4
  else if (dragonCopies === 1) dragonDeficit = 2

  const relevantShanten = calculateStandardShanten(relevant)
  const raw = relevantShanten + trash.length * 2 + dragonDeficit
  let adjusted = adjustForTileCount(Math.max(-1, raw), hand.length)

  // Agar (-1) hanya bila tangan 14 ubin & struktur 4 set + 1 pasang benar-benar sah.
  if (
    adjusted === -1 &&
    trash.length === 0 &&
    dragonDeficit === 0 &&
    hand.filter((t) => t.category !== "bonus").length === 14
  ) {
    const fullShanten = calculateStandardShanten(hand)
    if (fullShanten !== -1) adjusted = Math.max(0, fullShanten)
  }

  return adjusted
}

/** [BARU] All Pungs: Pung=0 jarak, Pasang=1, Ubin lepas=2. */
function calculateAllPungsShanten(hand: Tile[]): number {
  const counts = toCounts(hand)
  let pungs = 0
  let pairs = 0
  let isolated = 0

  for (let i = 0; i < 34; i++) {
    const c = counts[i]
    if (c >= 3) {
      pungs += 1
      const rest = c - 3
      if (rest === 2) pairs += 1
      else if (rest === 1) isolated += 1
    } else if (c === 2) {
      pairs += 1
    } else if (c === 1) {
      isolated += 1
    }
  }

  const hasPair = pairs > 0
  // (4 - pungs) * 2 + (1 jika belum ada pasang) - pasang + ubin lepas * 2
  const raw =
    (4 - pungs) * 2 + (hasPair ? 0 : 1) - pairs + isolated * 2
  return adjustForTileCount(Math.max(-1, raw), hand.length)
}

// ---------------------------------------------------------------------------
// [FIX] All Chows (Ping Hu) — DFS presisi hanya-Chow (Pung/Kong dilarang).
//
// Block-score lama tak pernah mencapai -1 untuk tangan Ping Hu lengkap (pasang
// hanya bernilai 0.5 blok), sehingga kemenangan tak terdeteksi & uke-ire/saran
// buangan tidak akurat. DFS ini mengurai suit menjadi 4 Chow + 1 pasang persis
// seperti aturan menang, lalu honor dihukum sebagai sampah (+2 tiap ubin).
// ---------------------------------------------------------------------------

const chowShantenMemo = new Map<string, number>()

function allChowsDfs(
  counts: number[],
  idx: number,
  completeSets: number,
  protoSets: number,
  hasPair: boolean,
): number {
  // Hanya proses ubin suit (indeks 0–26). Honor tidak bisa membentuk Chow.
  while (idx < 27 && counts[idx] === 0) idx++
  if (idx >= 27) return shantenLeaf(completeSets, protoSets, hasPair)

  const key = `${idx}|${completeSets}|${protoSets}|${hasPair ? 1 : 0}|${counts
    .slice(idx, 27)
    .join(",")}`
  const cached = chowShantenMemo.get(key)
  if (cached !== undefined) return cached

  let best = shantenLeaf(completeSets, protoSets, hasPair)
  const inSuit = idx % 9

  // Chow lengkap (v, v+1, v+2).
  if (
    inSuit < 7 &&
    counts[idx] >= 1 &&
    counts[idx + 1] >= 1 &&
    counts[idx + 2] >= 1
  ) {
    counts[idx]--
    counts[idx + 1]--
    counts[idx + 2]--
    best = Math.min(
      best,
      allChowsDfs(counts, idx, completeSets + 1, protoSets, hasPair),
    )
    counts[idx]++
    counts[idx + 1]++
    counts[idx + 2]++
  }

  // Pasang (mata).
  if (!hasPair && counts[idx] >= 2) {
    counts[idx] -= 2
    best = Math.min(
      best,
      allChowsDfs(counts, idx, completeSets, protoSets, true),
    )
    counts[idx] += 2
  }

  if (completeSets + protoSets < 4) {
    // Pasang sebagai proto (mata sudah ada di tempat lain).
    if (hasPair && counts[idx] >= 2) {
      counts[idx] -= 2
      best = Math.min(
        best,
        allChowsDfs(counts, idx, completeSets, protoSets + 1, hasPair),
      )
      counts[idx] += 2
    }
    // Tunggu terbuka (v, v+1).
    if (inSuit < 8 && counts[idx] >= 1 && counts[idx + 1] >= 1) {
      counts[idx]--
      counts[idx + 1]--
      best = Math.min(
        best,
        allChowsDfs(counts, idx, completeSets, protoSets + 1, hasPair),
      )
      counts[idx]++
      counts[idx + 1]++
    }
    // Tunggu bercelah/tepi (v, v+2).
    if (inSuit < 7 && counts[idx] >= 1 && counts[idx + 2] >= 1) {
      counts[idx]--
      counts[idx + 2]--
      best = Math.min(
        best,
        allChowsDfs(counts, idx, completeSets, protoSets + 1, hasPair),
      )
      counts[idx]++
      counts[idx + 2]++
    }
  }

  // Buang satu ubin terisolasi.
  counts[idx]--
  best = Math.min(best, allChowsDfs(counts, idx, completeSets, protoSets, hasPair))
  counts[idx]++

  chowShantenMemo.set(key, best)
  return best
}

function calculateAllChowsShanten(hand: Tile[]): number {
  const suitOnly = hand.filter((t) => t.category === "suit")
  const honors = hand.filter(
    (t) => t.category !== "bonus" && t.category !== "suit",
  )
  const counts = toCounts(suitOnly)
  chowShantenMemo.clear()
  const raw = allChowsDfs(counts, 0, 0, 0, false)
  return (
    adjustForTileCount(Math.max(-1, raw), suitOnly.length) + honors.length * 2
  )
}

/** [BARU] Seven Pairs: 6 - jumlah pasang unik. */
function calculateSevenPairsShanten(hand: Tile[]): number {
  const counts = toCounts(hand)
  let uniquePairs = 0
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) uniquePairs += 1
  }
  return adjustForTileCount(6 - uniquePairs, hand.length)
}

/** Flush Seven Pairs — pasang unik satu suit; penalti honor/suit salah. */
function calculateFlushSevenPairsShanten(
  hand: Tile[],
  targetSuit: SuitType,
): number {
  const relevant = hand.filter(
    (t) => t.category === "suit" && t.suit === targetSuit,
  )
  const trash = hand.filter(
    (t) =>
      t.category !== "bonus" &&
      !(t.category === "suit" && t.suit === targetSuit),
  )
  const counts = toCounts(relevant)
  let uniquePairs = 0
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) uniquePairs += 1
  }
  return adjustForTileCount(6 - uniquePairs, hand.length) + trash.length * 2
}

/** [BARU] Full/Half Flush: shanten suit target + penalti suit salah. */
function calculateFlushShanten(
  hand: Tile[],
  targetSuit: SuitType,
  includeHonors: boolean,
): number {
  const relevant = hand.filter(
    (t) =>
      (t.category === "suit" && t.suit === targetSuit) ||
      (includeHonors && t.category === "honor"),
  )
  const wrongSuit = hand.filter(
    (t) => t.category === "suit" && t.suit !== targetSuit,
  )
  const relevantShanten = calculateStandardShanten(relevant)
  // Penalti berat per ubin suit salah — prioritas buang.
  return relevantShanten + wrongSuit.length * 2
}

/** [BARU] Thirteen Orphans shanten. */
function calculateThirteenOrphansShanten(hand: Tile[]): number {
  return adjustForTileCount(
    checkSpecialShanten(hand).thirteenOrphans,
    hand.length,
  )
}

const SUIT_ORDER_SHANTEN: SuitType[] = ["dots", "bamboo", "characters"]

const WIND_IDS = [
  "wind-east",
  "wind-south",
  "wind-west",
  "wind-north",
] as const

const DRAGON_IDS = [
  "dragon-red",
  "dragon-green",
  "dragon-white",
] as const

/** [BARU] Progres Pung/Pasang untuk sekumpulan honor. */
function collectionProgress(
  hand: Tile[],
  ids: readonly string[],
): { pungs: number; pairs: number; singles: number } {
  const counts = toCounts(hand)
  let pungs = 0
  let pairs = 0
  let singles = 0
  for (const id of ids) {
    const idx = INDEX_BY_ID[id]
    const c = idx !== undefined ? counts[idx]! : 0
    if (c >= 3) pungs += 1
    else if (c === 2) pairs += 1
    else if (c === 1) singles += 1
  }
  return { pungs, pairs, singles }
}

/** [BARU] Shanten koleksi Pung (Naga/Angin) + penalti ubin di luar koleksi. */
function calculateCollectionShanten(
  hand: Tile[],
  collectionIds: readonly string[],
  requiredPungs: number,
  pairInCollection: boolean,
): number {
  const { pungs, pairs, singles } = collectionProgress(hand, collectionIds)
  const tileCounts = toCounts(hand)
  const anyPair = tileCounts.some((c) => c >= 2)
  const hasPair = pairInCollection ? pairs > 0 : anyPair
  const outside = hand.filter(
    (t) => t.category !== "bonus" && !collectionIds.includes(t.id),
  ).length
  const raw =
    Math.max(0, requiredPungs - pungs) * 2 +
    (hasPair ? 0 : 1) -
    pairs +
    singles * 2 +
    outside * 2
  return adjustForTileCount(Math.max(-1, raw), hand.length)
}

/** [BARU] All Kongs — jarak ke 4 Kong + pasang. */
function calculateAllKongsShanten(hand: Tile[]): number {
  const counts = toCounts(hand)
  let kongs = 0
  let nearKongs = 0
  let pairs = 0
  let isolated = 0
  for (let i = 0; i < 34; i++) {
    const c = counts[i]
    if (c >= 4) kongs += 1
    else if (c === 3) nearKongs += 1
    else if (c === 2) pairs += 1
    else if (c === 1) isolated += 1
  }
  const raw =
    (4 - kongs) * 3 + (pairs > 0 ? 0 : 1) - nearKongs - pairs + isolated * 2
  return adjustForTileCount(Math.max(-1, raw), hand.length)
}

/** [BARU] Shanten untuk target tertentu. */
export function getTargetShanten(
  hand: Tile[],
  selectedTarget: string | null,
): number {
  if (!selectedTarget) return getBestShanten(hand)

  const fullSuit = parseSuitFromTarget(selectedTarget, "full-flush-")
  if (fullSuit) return calculateFlushShanten(hand, fullSuit, false)

  const halfSuit = parseSuitFromTarget(selectedTarget, "half-flush-")
  if (halfSuit) return calculateFlushShanten(hand, halfSuit, true)

  const flushSevenSuit = parseSuitFromTarget(
    selectedTarget,
    "flush-seven-pairs-",
  )
  if (flushSevenSuit) {
    return calculateFlushSevenPairsShanten(hand, flushSevenSuit)
  }

  switch (selectedTarget) {
    case "all-pungs":
      return calculateAllPungsShanten(hand)
    case "seven-pairs":
      return calculateSevenPairsShanten(hand)
    case "thirteen-orphans":
      return calculateThirteenOrphansShanten(hand)
    case "nine-gates":
      return calculateNineGatesShanten(hand)
    case "big-three-dragons":
      return calculateCollectionShanten(hand, DRAGON_IDS, 3, false)
    case "little-three-dragons":
      return calculateCollectionShanten(hand, DRAGON_IDS, 2, true)
    case "big-four-winds":
      return calculateCollectionShanten(hand, WIND_IDS, 4, false)
    case "little-four-winds":
      return calculateCollectionShanten(hand, WIND_IDS, 3, true)
    case "all-kongs":
      return calculateAllKongsShanten(hand)
    case "jade-dragon":
      return calculateDragonFlushShanten(hand, "dragon-green", "bamboo")
    case "ruby-dragon":
      return calculateDragonFlushShanten(hand, "dragon-red", "characters")
    case "pearl-dragon":
      return calculateDragonFlushShanten(hand, "dragon-white", "dots")
    case "all-chows":
      return calculateAllChowsShanten(hand)
    case "all-honors": {
      const honors = hand.filter((t) => t.category === "honor")
      return blocksToShanten(calculateBlocks(honors), honors.length)
    }
    case "all-terminals": {
      const terminals = hand.filter(
        (t) => t.category === "suit" && (t.value === 1 || t.value === 9),
      )
      const wrong = hand.length - terminals.length
      return (
        blocksToShanten(calculateBlocks(terminals), terminals.length) +
        wrong * 2
      )
    }
    case "chicken-hand":
      return getBestShanten(hand)
    default:
      return getBestShanten(hand)
  }
}

// ---------------------------------------------------------------------------
// [BARU] Deteksi set lengkap & prioritas buangan.
// ---------------------------------------------------------------------------

function handCountById(hand: Tile[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const tile of hand) {
    map.set(tile.id, (map.get(tile.id) ?? 0) + 1)
  }
  return map
}

/** Apakah ubin suit ini bagian dari Chow lengkap di tangan? */
function isInCompleteChow(tile: Tile, hand: Tile[]): boolean {
  if (tile.category !== "suit") return false
  const bySuitValue = new Map<number, number>()
  for (const t of hand) {
    if (t.category === "suit" && t.suit === tile.suit) {
      bySuitValue.set(t.value, (bySuitValue.get(t.value) ?? 0) + 1)
    }
  }
  const v = tile.value
  const has = (n: number) => (bySuitValue.get(n) ?? 0) > 0
  return (
    (v >= 3 && has(v - 2) && has(v - 1)) ||
    (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) ||
    (v <= 7 && has(v + 1) && has(v + 2))
  )
}

/** [BARU] Skor prioritas buangan — lebih tinggi = buang lebih dulu. */
function getDiscardPriority(
  tile: Tile,
  hand: Tile[],
  selectedTarget: string,
): number {
  const counts = handCountById(hand)
  const c = counts.get(tile.id) ?? 0

  // [BARU] Full Flush — honor & suit salah = sampah absolut (sebelum proteksi Pung/Chow).
  const fullSuit = parseSuitFromTarget(selectedTarget, "full-flush-")
  if (fullSuit) {
    if (tile.category === "honor") return 1000
    if (tile.category === "suit" && tile.suit !== fullSuit) return 1000
  }

  // [BARU] Half Flush — suit salah = sampah absolut; honor tetap valid.
  const halfSuit = parseSuitFromTarget(selectedTarget, "half-flush-")
  if (halfSuit) {
    if (tile.category === "suit" && tile.suit !== halfSuit) return 1000
  }

  const flushSevenSuit = parseSuitFromTarget(
    selectedTarget,
    "flush-seven-pairs-",
  )
  if (flushSevenSuit) {
    if (tile.category === "honor") return 1000
    if (tile.category === "suit" && tile.suit !== flushSevenSuit) return 1000
  }

  // [BARU] Jade / Ruby / Pearl — Naga target + suit target saja yang sah.
  const dragonFlush = parseDragonSuitTarget(selectedTarget)
  if (dragonFlush) {
    const { dragonId, suit } = dragonFlush
    if (tile.category === "honor" && tile.id !== dragonId) return 1000
    if (tile.category === "suit" && tile.suit !== suit) return 1000
  }

  // [FIX] Nine Gates — honor & suit salah = sampah absolut (satu corak murni).
  if (selectedTarget === "nine-gates") {
    if (tile.category === "honor") return 1000
    if (tile.category === "suit" && tile.suit !== nineGatesTargetSuit(hand)) {
      return 1000
    }
  }

  // Jangan buang Pung/Kong lengkap.
  if (c >= 3) return -1000

  // Jangan buang Chow lengkap (kecuali target All Pungs).
  if (
    selectedTarget !== "all-pungs" &&
    isInCompleteChow(tile, hand)
  ) {
    return -1000
  }

  // [BARU] All Pungs: jaga pasang kerja; buang ubin lepas dulu.
  if (selectedTarget === "all-pungs") {
    if (c === 2) return -500
    if (c === 1) return 500
    if (tile.category === "suit") {
      const sameSuit = hand.filter(
        (h) => h.category === "suit" && h.suit === tile.suit,
      ).length
      if (sameSuit <= 1) return 400
    }
    return 0
  }

  // Seven Pairs / Flush Seven Pairs: jaga pasang unik.
  if (
    (selectedTarget === "seven-pairs" ||
      selectedTarget.startsWith("flush-seven-pairs-")) &&
    c === 2
  ) {
    return -500
  }

  // [BARU] Full Flush — hanya evaluasi ubin suit target.
  if (fullSuit && tile.category === "suit" && tile.suit === fullSuit) {
    if (c === 1) return 300
    return 0
  }

  // [BARU] Half Flush — honor valid; suit target dievaluasi normal.
  if (
    halfSuit &&
    (tile.category === "honor" ||
      (tile.category === "suit" && tile.suit === halfSuit))
  ) {
    if (c === 1) return 200
    return 0
  }

  // [BARU] Dragon flush — jaga Naga target; buang ubin suit lepas.
  if (dragonFlush) {
    const { dragonId, suit } = dragonFlush
    if (tile.id === dragonId) {
      if (c === 2) return -400
      if (c === 1) return -100
      return 0
    }
    if (tile.category === "suit" && tile.suit === suit) {
      if (c === 1) return 300
      return 0
    }
  }

  if (selectedTarget === "all-chows" && tile.category === "honor") return 1000
  if (selectedTarget === "thirteen-orphans") {
    return ORPHAN_IDS.has(tile.id) ? 0 : 1000
  }
  if (selectedTarget === "all-honors" && tile.category === "suit") return 1000
  if (
    selectedTarget === "all-terminals" &&
    (tile.category !== "suit" || (tile.value !== 1 && tile.value !== 9))
  ) {
    return 1000
  }

  // [FIX] Nine Gates — buang kelebihan di luar kapasitas fondasi; jaga kekurangan.
  if (selectedTarget === "nine-gates" && tile.category === "suit") {
    const targetSuit = nineGatesTargetSuit(hand)
    if (tile.suit === targetSuit) {
      const counts = suitValueCounts(hand, targetSuit)
      const v = tile.value
      const count = counts[v] ?? 0
      const min = NINE_GATES_MIN[v]!
      const cap = v === 1 || v === 9 ? 4 : 2
      if (count > cap) return 900
      if (count > min && v >= 2 && v <= 8) return 350
      if (count <= min) return -200
      if (c === 1) return 150
      return 0
    }
  }

  const dragonTargets = new Set([
    "big-three-dragons",
    "little-three-dragons",
  ])
  if (dragonTargets.has(selectedTarget)) {
    if (!DRAGON_IDS.includes(tile.id as (typeof DRAGON_IDS)[number])) {
      return 1000
    }
    if (c === 2) return -300
    if (c === 1) return 300
    return 0
  }

  const windTargets = new Set(["big-four-winds", "little-four-winds"])
  if (windTargets.has(selectedTarget)) {
    if (!WIND_IDS.includes(tile.id as (typeof WIND_IDS)[number])) {
      return 1000
    }
    if (c === 2) return -300
    if (c === 1) return 300
    return 0
  }

  if (selectedTarget === "all-kongs") {
    if (c === 4) return -1000
    if (c === 3) return -400
    if (c === 2) return -200
    if (c === 1) return 400
  }

  // Chicken Hand & default: buang ubin lepas.
  if (c === 1) return 200
  if (c === 2) return -100
  return 0
}

// ---------------------------------------------------------------------------
// [BARU] Uke-ire & simulasi buangan.
// ---------------------------------------------------------------------------

function countVisible(visibleTiles: Tile[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const tile of visibleTiles) {
    map.set(tile.id, (map.get(tile.id) ?? 0) + 1)
  }
  return map
}

function remainingInDeck(
  tileId: string,
  visible: Map<string, number>,
  /** [BARU] Simulasi buangan: kurangi 1 salinan terlihat jika dibuang. */
  discardedTileId?: string,
): number {
  const rep = TILE_BY_ID[tileId]
  if (!rep) return 0
  let seen = visible.get(tileId) ?? 0
  if (discardedTileId === tileId) seen -= 1
  return Math.max(0, rep.copies - seen)
}

/** [BARU] Ubin yang menyelesaikan tangan saat tenpai (shanten 0, tanpa buang). */
export function getWinningTiles(
  hand: Tile[],
  visibleTiles: Tile[],
  selectedTarget: string | null,
): UkeIreTile[] {
  const standardHand = hand.filter((t) => t.category !== "bonus")
  if (standardHand.length === 0 || !selectedTarget) return []

  const currentShanten = getTargetShanten(standardHand, selectedTarget)
  if (currentShanten !== 0) return []

  const visible = countVisible(visibleTiles)
  const counts = toCounts(standardHand)
  const winningMap = new Map<string, number>()

  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 4) continue
    const candidate = TILE_BY_ID[TILE_INDEX_IDS[i]!]!
    const trialHand = [...standardHand, candidate]
    const newShanten = getTargetShanten(trialHand, selectedTarget)
    if (newShanten < 0) {
      const left = remainingInDeck(candidate.id, visible)
      if (left > 0) winningMap.set(candidate.id, left)
    }
  }

  return [...winningMap.entries()]
    .map(([id, remaining]) => ({
      tile: TILE_BY_ID[id]!,
      remaining,
    }))
    .sort(
      (a, b) =>
        b.remaining - a.remaining || a.tile.label.localeCompare(b.tile.label),
    )
}

/** [BARU] Rekomendasi buangan — uke-ire vs winning-out berdasarkan shanten pasca-buang. */
export function getRecommendations(
  hand: Tile[],
  visibleTiles: Tile[],
  selectedTarget: string | null = null,
): DiscardRecommendation[] {
  const standardHand = hand.filter((t) => t.category !== "bonus")
  if (standardHand.length === 0 || !selectedTarget) return []

  const currentShanten = getTargetShanten(standardHand, selectedTarget)

  // Tenpai menunggu draw (13, 10, 7… ubin) — tidak perlu saran buang.
  if (currentShanten === 0 && standardHand.length % 3 === 1) return []

  const visible = countVisible(visibleTiles)
  const uniqueDiscardIds = [...new Set(standardHand.map((t) => t.id))]

  type Scored = DiscardRecommendation & { sortPriority: number }
  const recommendations: Scored[] = []

  for (const discardId of uniqueDiscardIds) {
    const discardIdx = standardHand.findIndex((t) => t.id === discardId)
    if (discardIdx === -1) continue

    const discardTile = TILE_BY_ID[discardId]!
    const discardPriority = getDiscardPriority(
      discardTile,
      standardHand,
      selectedTarget,
    )

    const afterDiscard = [
      ...standardHand.slice(0, discardIdx),
      ...standardHand.slice(discardIdx + 1),
    ]
    const afterCounts = toCounts(afterDiscard)
    const shantenAfterDiscard = getTargetShanten(afterDiscard, selectedTarget)

    const ukeIreMap = new Map<string, number>()

    for (let i = 0; i < 34; i++) {
      if (afterCounts[i] >= 4) continue

      const candidate = TILE_BY_ID[TILE_INDEX_IDS[i]!]!
      const trialHand = [...afterDiscard, candidate]
      const newShanten = getTargetShanten(trialHand, selectedTarget)

      // [BARU] Bandingkan terhadap shanten pasca-buang, bukan pra-buang.
      const improves =
        shantenAfterDiscard <= 0
          ? newShanten < 0
          : newShanten < shantenAfterDiscard

      if (improves) {
        const left = remainingInDeck(candidate.id, visible, discardId)
        if (left > 0) ukeIreMap.set(candidate.id, left)
      }
    }

    const ukeIreTiles: UkeIreTile[] = [...ukeIreMap.entries()]
      .map(([id, remaining]) => ({
        tile: TILE_BY_ID[id]!,
        remaining,
      }))
      .sort(
        (a, b) =>
          b.remaining - a.remaining || a.tile.label.localeCompare(b.tile.label),
      )

    recommendations.push({
      discardId,
      discardTile,
      ukeIreCount: ukeIreTiles.reduce((s, u) => s + u.remaining, 0),
      ukeIreTiles,
      shantenAfterDiscard,
      sortPriority: discardPriority,
    })
  }

  // [BARU] Utamakan uke-ire terbanyak; buang ubin lepas/off-target dulu.
  const viable = recommendations.filter((r) => r.sortPriority >= 0)
  const pool = viable.length > 0 ? viable : recommendations

  return pool
    .sort(
      (a, b) =>
        // [FIX] Jangan pernah menaikkan shanten: pilih buangan yang memberi
        // shanten terendah dulu (mis. buang suit salah pada Half/Full Flush),
        // baru bandingkan uke-ire lalu prioritas off-target.
        a.shantenAfterDiscard - b.shantenAfterDiscard ||
        b.ukeIreCount - a.ukeIreCount ||
        b.sortPriority - a.sortPriority ||
        a.discardTile.label.localeCompare(b.discardTile.label),
    )
    .slice(0, 3)
    .map(
      ({
        discardId,
        discardTile,
        ukeIreCount,
        ukeIreTiles,
        shantenAfterDiscard,
      }) => ({
        discardId,
        discardTile,
        ukeIreCount,
        ukeIreTiles,
        shantenAfterDiscard,
      }),
    )
}

/** Analisis lengkap untuk panel UI (satu entry point). */
export function analyzeHand(
  hand: Tile[],
  visibleTiles: Tile[],
  selectedTarget: string | null = null,
): ShantenAnalysis {
  const standardHand = hand.filter((t) => t.category !== "bonus")
  const shanten = getTargetShanten(standardHand, selectedTarget)
  const winningTiles =
    shanten === 0
      ? getWinningTiles(standardHand, visibleTiles, selectedTarget)
      : []

  return {
    shanten,
    standardShanten: calculateStandardShanten(standardHand),
    special: checkSpecialShanten(standardHand),
    recommendations: getRecommendations(
      standardHand,
      visibleTiles,
      selectedTarget,
    ),
    winningTiles,
    targetKey: selectedTarget,
  }
}

/** Label Bahasa Indonesia untuk nilai shanten. */
export function formatShantenLabel(shanten: number): string {
  if (shanten < 0) return "Siap Menang (Agar)"
  if (shanten === 0) return "Tenpai — Menunggu 1 Ubin"
  if (shanten === 1) return "1 Langkah Menuju Menang (1-Shanten)"
  return `${shanten} Langkah Menuju Menang (${shanten}-Shanten)`
}

// Ekspor util internal untuk pengujian.
export { toCounts, countsToTiles, adjustForTileCount }
