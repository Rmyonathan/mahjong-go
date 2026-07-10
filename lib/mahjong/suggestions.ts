/**
 * Blueprint Scorer — Sistem Rekomendasi Target Tangan Mahjong-Go.
 *
 * Menghitung "persentase kecocokan" tiap pola tangan menang Hong Kong Old
 * Style. Pola STANDAR (Full/Half Flush, Ping Hu, Chicken Hand, All Pungs)
 * dinilai lewat ANALISIS BLOK berbasis konektivitas ubin, sedangkan pola
 * KHUSUS (Seven Pairs, Thirteen Orphans, All Honors) tetap memakai rasio ubin.
 */

import type { SuitType, Tile } from "./types"
import { bestNineGatesMeasure } from "./nine-gates"
import {
  analyzeDragonSuitComposition,
  DRAGON_SUIT_HANDS,
  isAllowedDragonSuitTile,
} from "./dragon-suit"

/** Basis ubin sebuah tangan menang standar. */
export const TARGET_HAND_SIZE = 14

/** Sebuah tangan menang butuh 5 blok (4 set + 1 pasang). */
export const REQUIRED_BLOCKS = 5

/** Label Bahasa Indonesia untuk tiap suit. */
const SUIT_LABEL_ID: Record<SuitType, string> = {
  dots: "Bulatan",
  bamboo: "Bambu",
  characters: "Karakter",
}

const SUIT_ORDER: SuitType[] = ["dots", "bamboo", "characters"]

/** Ambang minimum agar sebuah pola ditampilkan. */
const MIN_PERCENT = 25
/** [BARU] Ambang minimum untuk Limit Hand agar tetap bisa dipilih manual. */
const MIN_LIMIT_PERCENT = 15

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

/** [BARU] Kategori probabilitas — standar (<5 Fan) vs legendaris (5+ Fan). */
export type SuggestionCategory = "standard" | "legendary"

/** Sebuah hasil kecocokan pola tangan. */
export interface HandSuggestion {
  key: string
  /** Nama pola, mis. "Half Flush (Karakter)". */
  name: string
  /** Persentase kecocokan (0–100, dibulatkan). */
  percent: number
  /** [BARU] `standard` = tangan dasar; `legendary` = limit / high fan. */
  category: SuggestionCategory
  /** Skor blok (0–5) untuk pola berbasis analisis-blok. */
  blocks?: number
  /** Jumlah ubin cocok untuk pola khusus berbasis ubin. */
  matched?: number
  /** Basis pembanding untuk pola berbasis ubin (selalu 14). */
  total?: number
}

/** [BARU] Tentukan kategori dari key pola. */
export function getSuggestionCategory(key: string): SuggestionCategory {
  if (key.startsWith("full-flush-")) return "legendary"
  if (key.startsWith("flush-seven-pairs-")) return "legendary"
  const legendary = new Set([
    "big-three-dragons",
    "little-four-winds",
    "big-four-winds",
    "thirteen-orphans",
    "nine-gates",
    "all-honors",
    "all-terminals",
    "all-kongs",
    "jade-dragon",
    "ruby-dragon",
    "pearl-dragon",
  ])
  return legendary.has(key) ? "legendary" : "standard"
}

// ===========================================================================
// [BARU] ANALISIS BLOK (Block/Shape Analysis) — inti perbaikan konektivitas.
// ===========================================================================

/**
 * Skor blok maksimum untuk satu suit (larik hitungan salinan, indeks 1..9).
 *
 * - Blok Lengkap  = 1.0 : Chow penuh (v,v+1,v+2) atau Pung (v,v,v).
 * - Proto-Blok    = 0.5 : Pasang (v,v), tunggu terbuka (v,v+1), tunggu
 *                          bercelah/tepi (v,v+2).
 * - Ubin lepas    = 0.0 : tak terhubung.
 *
 * Rekursif mencoba semua dekomposisi dan mengambil skor tertinggi.
 * `allowPung=false` dipakai Ping Hu (Pung dilarang).
 */
function suitBlocks(c: number[], start: number, allowPung: boolean): number {
  let i = start
  while (i <= 9 && c[i] === 0) i++
  if (i > 9) return 0

  let best = 0

  // Blok lengkap: Chow (v, v+1, v+2).
  if (i <= 7 && c[i] > 0 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--
    c[i + 1]--
    c[i + 2]--
    best = Math.max(best, 1 + suitBlocks(c, i, allowPung))
    c[i]++
    c[i + 1]++
    c[i + 2]++
  }

  // Blok lengkap: Pung (v, v, v) — hanya jika diizinkan.
  if (allowPung && c[i] >= 3) {
    c[i] -= 3
    best = Math.max(best, 1 + suitBlocks(c, i, allowPung))
    c[i] += 3
  }

  // Proto-blok: pasang (v, v).
  if (c[i] >= 2) {
    c[i] -= 2
    best = Math.max(best, 0.5 + suitBlocks(c, i, allowPung))
    c[i] += 2
  }

  // Proto-blok: tunggu terbuka (v, v+1).
  if (i <= 8 && c[i] > 0 && c[i + 1] > 0) {
    c[i]--
    c[i + 1]--
    best = Math.max(best, 0.5 + suitBlocks(c, i, allowPung))
    c[i]++
    c[i + 1]++
  }

  // Proto-blok: tunggu bercelah/tepi (v, v+2).
  if (i <= 7 && c[i] > 0 && c[i + 2] > 0) {
    c[i]--
    c[i + 2]--
    best = Math.max(best, 0.5 + suitBlocks(c, i, allowPung))
    c[i]++
    c[i + 2]++
  }

  // Ubin lepas: buang satu salinan (0 poin) lalu lanjut.
  c[i]--
  best = Math.max(best, suitBlocks(c, i, allowPung))
  c[i]++

  return best
}

/**
 * Evaluasi konektivitas sekumpulan ubin → total skor blok (0..N).
 * Ubin suit dianalisis untuk Chow/Pung/tunggu; ubin honor hanya bisa
 * membentuk Pung (1.0) atau pasang (0.5). Ubin bonus diabaikan.
 */
export function calculateBlocks(
  tiles: Tile[],
  options: { allowPung?: boolean } = {},
): number {
  const allowPung = options.allowPung ?? true

  const bySuit: Record<SuitType, number[]> = {
    dots: new Array(10).fill(0),
    bamboo: new Array(10).fill(0),
    characters: new Array(10).fill(0),
  }
  const honorCounts = new Map<string, number>()

  for (const tile of tiles) {
    if (tile.category === "suit") {
      bySuit[tile.suit][tile.value] += 1
    } else if (tile.category === "honor") {
      honorCounts.set(tile.id, (honorCounts.get(tile.id) ?? 0) + 1)
    }
  }

  let total = 0
  for (const suit of SUIT_ORDER) {
    total += suitBlocks(bySuit[suit].slice(), 1, allowPung)
  }
  for (const count of honorCounts.values()) {
    if (allowPung && count >= 3) total += 1
    else if (count >= 2) total += 0.5
  }
  return total
}

// ===========================================================================
// Pembuat entri hasil.
// ===========================================================================

/** Entri berbasis blok: persen = (blok / 5) * 100 (cap 100%). */
function blockSuggestion(
  key: string,
  name: string,
  rawBlocks: number,
): HandSuggestion {
  const blocks = Math.max(0, Math.min(rawBlocks, REQUIRED_BLOCKS))
  const percent = Math.round((blocks / REQUIRED_BLOCKS) * 100)
  return { key, name, percent, category: getSuggestionCategory(key), blocks }
}

/** Entri berbasis ubin (khusus pola atipikal): persen = (matched / 14) * 100. */
function tileSuggestion(
  key: string,
  name: string,
  rawMatched: number,
  total: number = TARGET_HAND_SIZE,
): HandSuggestion {
  const matched = Math.max(0, Math.min(rawMatched, total))
  const percent = Math.round((matched / total) * 100)
  return {
    key,
    name,
    percent,
    category: getSuggestionCategory(key),
    matched,
    total,
  }
}

// ===========================================================================
// Evaluator utama.
// ===========================================================================

/**
 * Menganalisis tangan dan mengembalikan semua pola > 25%, diurutkan dari
 * persentase tertinggi ke terendah.
 */
export function suggestTargetHands(mainHand: Tile[]): HandSuggestion[] {
  // Abaikan ubin bonus (Bunga/Musim) — tidak masuk struktur tangan menang.
  const tiles = mainHand.filter((t) => t.category !== "bonus")
  if (tiles.length === 0) return []

  // --- Fitur dasar untuk pola KHUSUS & All Pungs ---
  const countById = new Map<string, number>()
  const terminalHonorIds = new Set<string>()
  const suitTiles: Tile[] = []
  let honorCount = 0

  for (const tile of tiles) {
    countById.set(tile.id, (countById.get(tile.id) ?? 0) + 1)
    if (tile.category === "suit") {
      suitTiles.push(tile)
      if (tile.value === 1 || tile.value === 9) terminalHonorIds.add(tile.id)
    } else if (tile.category === "honor") {
      honorCount += 1
      terminalHonorIds.add(tile.id)
    }
  }

  const results: HandSuggestion[] = []

  // -------------------------------------------------------------------------
  // [UPGRADE] Pola STANDAR — analisis blok berbasis konektivitas.
  // -------------------------------------------------------------------------

  // --- Full Flush (Ching Yi Sher) — blok hanya dari ubin suit tsb. ---
  for (const suit of SUIT_ORDER) {
    const only = suitTiles.filter((t) => t.category === "suit" && t.suit === suit)
    if (only.length === 0) continue
    results.push(
      blockSuggestion(
        `full-flush-${suit}`,
        `Full Flush (${SUIT_LABEL_ID[suit]})`,
        calculateBlocks(only),
      ),
    )
  }

  // --- Half Flush (Huen Yi Sher) — blok dari ubin suit tsb. + seluruh honor ---
  for (const suit of SUIT_ORDER) {
    const subset = tiles.filter(
      (t) =>
        (t.category === "suit" && t.suit === suit) || t.category === "honor",
    )
    if (subset.length === 0) continue
    results.push(
      blockSuggestion(
        `half-flush-${suit}`,
        `Half Flush (${SUIT_LABEL_ID[suit]})`,
        calculateBlocks(subset),
      ),
    )
  }

  // --- All Chows / Ping Hu — blok suit TANPA Pung ---
  // [FIX] Honor (Angin/Naga) BUKAN kegagalan; cukup diabaikan (ubin lepas / 0
  // poin) — pemain tinggal membuangnya. Hanya ubin suit yang dievaluasi
  // calculateBlocks(), jadi tak ada lagi penalti yang menjatuhkan skor ke 0.
  let pingHuBlocks = calculateBlocks(suitTiles, { allowPung: false })

  // [FIX #2] Aturan ketat "pasang tak boleh honor" HANYA fatal untuk tangan
  // LENGKAP (14 ubin yang sudah 5 blok penuh) yang pasangnya honor. Untuk
  // rekomendasi parsial, blok suit yang menentukan persentase. Catatan: karena
  // honor tidak ikut dihitung sebagai blok di atas, Ping Hu tak akan pernah
  // mencapai 5.0 blok tanpa pasang dari suit — sehingga tangan yang belum jadi
  // atau penuh honor tidak akan pernah di-nol-kan secara keliru.
  const hasHonorPair = [...countById.entries()].some(
    ([id, c]) => c >= 2 && (id.startsWith("wind-") || id.startsWith("dragon-")),
  )
  if (
    tiles.length === TARGET_HAND_SIZE &&
    hasHonorPair &&
    pingHuBlocks >= REQUIRED_BLOCKS
  ) {
    pingHuBlocks = 0 // tangan jadi berpasangan honor → bukan Ping Hu sah
  }

  results.push(blockSuggestion("all-chows", "All Chows (Ping Hu)", pingHuBlocks))

  // --- Chicken Hand (dulu "Standar Tepat Cepat") — blok seluruh tangan ---
  results.push(
    blockSuggestion("chicken-hand", "Chicken Hand", calculateBlocks(tiles)),
  )

  // --- All Pungs (Toitoi) — Pung (1.0) + Pasang (0.5), lalu /5 ---
  let toitoiScore = 0
  for (const count of countById.values()) {
    if (count >= 3) toitoiScore += 1
    else if (count === 2) toitoiScore += 0.5
  }
  results.push(blockSuggestion("all-pungs", "All Pungs (Toitoi)", toitoiScore))

  // -------------------------------------------------------------------------
  // [DIPERTAHANKAN] Pola KHUSUS — rasio ubin (tidak diubah).
  // -------------------------------------------------------------------------

  // --- Seven Unique Pairs — pasang unik * 2 ---
  let uniquePairs = 0
  for (const count of countById.values()) if (count >= 2) uniquePairs += 1
  // [BARU] Basis: ((uniquePairs * 2) / 14) * 100; penalti jika pasang unik < 4.
  let sevenPairsPercent = Math.round(
    ((uniquePairs * 2) / TARGET_HAND_SIZE) * 100,
  )
  if (uniquePairs < 4) {
    sevenPairsPercent = Math.round(sevenPairsPercent / 2) // // dibagi 2 agar turun ke bawah daftar
  }
  results.push({
    key: "seven-pairs",
    name: "Seven Unique Pairs",
    percent: sevenPairsPercent,
    category: getSuggestionCategory("seven-pairs"),
    matched: uniquePairs * 2,
    total: TARGET_HAND_SIZE,
  })

  // --- Flush Seven Pairs — tujuh pasang unik satu suit (Limit Hand 10 Fan) ---
  for (const suit of SUIT_ORDER) {
    const inSuit = tiles.filter(
      (t): t is Extract<Tile, { category: "suit" }> =>
        t.category === "suit" && t.suit === suit,
    )
    if (inSuit.length < 2) continue

    const suitCounts = new Map<string, number>()
    for (const tile of inSuit) {
      suitCounts.set(tile.id, (suitCounts.get(tile.id) ?? 0) + 1)
    }
    let uniquePairsInSuit = 0
    for (const count of suitCounts.values()) {
      if (count >= 2) uniquePairsInSuit += 1
    }

    let flushSevenPercent = Math.round(
      ((uniquePairsInSuit * 2) / TARGET_HAND_SIZE) * 100,
    )
    if (uniquePairsInSuit < 4) {
      flushSevenPercent = Math.round(flushSevenPercent / 2)
    }

    const wrongSuit = suitTiles.filter(
      (t) => t.category === "suit" && t.suit !== suit,
    ).length
    const trash = wrongSuit + honorCount
    flushSevenPercent = Math.max(0, flushSevenPercent - trash * 4)

    if (flushSevenPercent <= MIN_LIMIT_PERCENT && inSuit.length < 4) continue

    results.push({
      key: `flush-seven-pairs-${suit}`,
      name: `Flush Seven Pairs (${SUIT_LABEL_ID[suit]})`,
      percent: Math.max(flushSevenPercent, MIN_LIMIT_PERCENT + 1),
      category: getSuggestionCategory(`flush-seven-pairs-${suit}`),
      matched: uniquePairsInSuit * 2,
      total: TARGET_HAND_SIZE,
    })
  }

  // --- Thirteen Orphans — jenis ujung (1/9) & honor unik ---
  results.push(
    tileSuggestion("thirteen-orphans", "Thirteen Orphans", terminalHonorIds.size),
  )

  // --- All Honors — total Angin & Naga ---
  results.push(tileSuggestion("all-honors", "All Honors", honorCount))

  // --- All Terminals — ubin 1/9 suit saja ---
  let terminalCount = 0
  for (const tile of suitTiles) {
    if (tile.category === "suit" && (tile.value === 1 || tile.value === 9)) {
      terminalCount += 1
    }
  }
  if (terminalCount >= 4) {
    results.push(tileSuggestion("all-terminals", "All Terminals", terminalCount))
  }

  // -------------------------------------------------------------------------
  // [BARU] Limit Hands — selalu tampil jika cocok struktur minor (> 15%).
  // -------------------------------------------------------------------------

  let dragonTiles = 0
  let windTiles = 0
  for (const tile of tiles) {
    if (tile.id.startsWith("dragon-")) dragonTiles += 1
    if (tile.id.startsWith("wind-")) windTiles += 1
  }

  const hasPairOrPung = [...countById.values()].some((c) => c >= 2)

  // [FIX] Nine Gates — fondasi 111-2345678-999; sampah suit lain tidak menyembunyikan saran.
  const nineGates = bestNineGatesMeasure(tiles, { strict: false })
  if (
    nineGates &&
    (nineGates.percent > MIN_LIMIT_PERCENT || nineGates.filled >= 6)
  ) {
    results.push({
      key: "nine-gates",
      name: `Nine Gates (${SUIT_LABEL_ID[nineGates.suit]})`,
      percent: Math.max(nineGates.percent, MIN_LIMIT_PERCENT + 1),
      category: getSuggestionCategory("nine-gates"),
      matched: nineGates.filled,
      total: 13,
    })
  }

  // Little / Big Three Dragons — ≥ 3 ubin Naga.
  if (dragonTiles >= 3) {
    const dragonPercent = Math.max(
      MIN_LIMIT_PERCENT + 1,
      Math.round((dragonTiles / 9) * 100),
    )
    results.push({
      key: "little-three-dragons",
      name: "Little Three Dragons",
      percent: dragonPercent,
      category: getSuggestionCategory("little-three-dragons"),
      matched: dragonTiles,
      total: 9,
    })
    results.push({
      key: "big-three-dragons",
      name: "Big Three Dragons",
      percent: Math.min(100, dragonPercent + 5),
      category: getSuggestionCategory("big-three-dragons"),
      matched: dragonTiles,
      total: 9,
    })
  }

  // Little / Big Four Winds — ≥ 4 ubin Angin.
  if (windTiles >= 4) {
    const windPercent = Math.max(
      MIN_LIMIT_PERCENT + 1,
      Math.round((windTiles / 12) * 100),
    )
    results.push({
      key: "little-four-winds",
      name: "Little Four Winds",
      percent: windPercent,
      category: getSuggestionCategory("little-four-winds"),
      matched: windTiles,
      total: 12,
    })
    results.push({
      key: "big-four-winds",
      name: "Big Four Winds",
      percent: Math.min(100, windPercent + 5),
      category: getSuggestionCategory("big-four-winds"),
      matched: windTiles,
      total: 12,
    })
  }

  // All Kongs — tersedia jika ada pasang atau Pung.
  if (hasPairOrPung) {
    let kongProgress = 0
    for (const count of countById.values()) {
      if (count >= 4) kongProgress += 1
      else if (count >= 3) kongProgress += 0.75
      else if (count >= 2) kongProgress += 0.35
    }
    const kongPercent = Math.max(
      MIN_LIMIT_PERCENT + 1,
      Math.round((kongProgress / 4) * 100),
    )
    results.push({
      key: "all-kongs",
      name: "All Kongs",
      percent: kongPercent,
      category: getSuggestionCategory("all-kongs"),
      matched: Math.round(kongProgress * 10) / 10,
      total: 4,
    })
  }

  // [FIX] Jade / Ruby / Pearl — Naga pasangan+suit eksklusif; sampah tidak menyembunyikan saran.
  for (const { key, name, dragonId, suit } of DRAGON_SUIT_HANDS) {
    const comp = analyzeDragonSuitComposition(tiles, dragonId, suit)
    if (comp.dragonCount === 0) continue

    const relevant = tiles.filter((t) =>
      isAllowedDragonSuitTile(t, dragonId, suit),
    )
    const rawBlocks = calculateBlocks(relevant)
    const blocks = Math.max(0, Math.min(rawBlocks, REQUIRED_BLOCKS))
    let percent = Math.round((blocks / REQUIRED_BLOCKS) * 100)

    if (comp.forbiddenCount > 0) {
      percent = Math.max(0, percent - comp.forbiddenCount * 4)
    }
    if (comp.dragonCount === 1) {
      percent = Math.max(0, percent - 5)
    }

    if (percent <= MIN_LIMIT_PERCENT && relevant.length < 4) continue

    results.push({
      key,
      name,
      percent: Math.max(percent, MIN_LIMIT_PERCENT + 1),
      category: getSuggestionCategory(key),
      blocks,
    })
  }

  // Ambil yang > 25% lalu urutkan dari tertinggi ke terendah.
  // [BARU] Limit hands & Seven Pairs tetap tampil di bawah ambang jika relevan.
  const limitKeys = new Set([
    "nine-gates",
    "little-three-dragons",
    "big-three-dragons",
    "little-four-winds",
    "big-four-winds",
    "all-kongs",
    "all-terminals",
    "seven-pairs",
    "jade-dragon",
    "ruby-dragon",
    "pearl-dragon",
  ])
  const filtered = results.filter(
    (r) =>
      r.percent > MIN_PERCENT ||
      limitKeys.has(r.key) ||
      r.key.startsWith("flush-seven-pairs-"),
  )
  if (
    uniquePairs >= 1 &&
    !filtered.some((r) => r.key === "seven-pairs")
  ) {
    const seven = results.find((r) => r.key === "seven-pairs")
    if (seven) filtered.push(seven)
  }
  // Dedupe by key (Nine Gates hanya satu entri).
  const byKey = new Map<string, HandSuggestion>()
  for (const r of filtered) {
    const existing = byKey.get(r.key)
    if (!existing || r.percent > existing.percent) byKey.set(r.key, r)
  }
  return [...byKey.values()].sort(
    (a, b) => b.percent - a.percent || a.name.localeCompare(b.name),
  )
}
