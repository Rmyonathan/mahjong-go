/**
 * Mesin skor Mahjong (deterministik).
 *
 * FASE 3 — penguraian struktur tangan penuh (4 set + 1 pasang):
 *   All Chows, All Pungs, Half Flush, Full Flush.
 * FASE 4 — Special Hands (Limit Hands & Atypical Hands):
 *   Seven Pairs, Thirteen Orphans, Little/Big Three Dragons,
 *   Little/Big Four Winds, Jade/Ruby/Pearl Dragon, Nine Gates,
 *   All Honors, All Terminals, All Kongs.
 *
 * Semua perhitungan deterministik & bisa diverifikasi — tanpa tebakan AI.
 */

import type {
  GameContext,
  RuleVariant,
  SuitType,
  Tile,
} from "./types";
import { WIND_TO_SEAT } from "./types";
import { detectNineGatesSuit } from "./nine-gates";
import { isDragonSuitWin } from "./dragon-suit";
import { minFanForRuleset, rulesetFromDb } from "./rulesets";

/** Ambang batas Fan untuk dianggap "Limit Hand" (Tangan Batas). */
const LIMIT_FAN = 10;

/** Satu "faan"/pola yang berkontribusi pada skor. */
export interface ScorePattern {
  /** Kunci stabil pola, mis. `"all-pungs"`. */
  key: string;
  /** Nama pola dalam Bahasa Indonesia. */
  name: string;
  /** Nilai Fan (poin) yang diberikan pola ini. */
  fan: number;
  /** Penjelasan singkat. */
  description?: string;
}

/** Hasil lengkap penilaian sebuah tangan. */
export interface ScoreResult {
  /** Total Fan (poin) dari seluruh pola. */
  totalFan: number;
  /** Rincian pola/elemen yang terdeteksi (scored elements). */
  patterns: ScorePattern[];
  /** Varian aturan yang dipakai. */
  variant: RuleVariant;
  /** Apakah tangan sah untuk bayar (termasuk min Faan hitungan). */
  isValidHand: boolean;
  /** Bentuk 4 set + pair (atau pola limit) — tanpa cek min Faan. */
  hasValidStructure: boolean;
  /** Apakah tangan mencapai status Limit Hand (>= 10 Fan dari satu pola). */
  isLimitHand: boolean;
  /** Pesan informatif untuk pengguna (termasuk rincian struktur). */
  messages: string[];
}

/** Opsi tambahan (di luar konteks Angin). */
export interface ScoreOptions {
  /** Varian aturan. Default: Hong Kong Old Style. */
  variant?: RuleVariant;
  /** Apakah menang dengan self-draw (tsumo). Belum dipakai pada fase ini. */
  selfDraw?: boolean;
}

const DRAGON_IDS: { id: string; name: string }[] = [
  { id: "dragon-red", name: "Naga Merah" },
  { id: "dragon-green", name: "Naga Hijau" },
  { id: "dragon-white", name: "Naga Putih" },
];

const WIND_LABEL_ID: Record<string, string> = {
  East: "Tong",
  South: "Nan",
  West: "Xi",
  North: "Pei",
};

const SUIT_LABEL_ID: Record<SuitType, string> = {
  dots: "Bulatan",
  bamboo: "Bambu",
  characters: "Karakter",
};

/** Ke-13 jenis ubin "orphan" (terminal 1/9 tiap suit + seluruh honor). */
const THIRTEEN_ORPHAN_IDS = [
  "dots-1",
  "dots-9",
  "bamboo-1",
  "bamboo-9",
  "characters-1",
  "characters-9",
  "wind-east",
  "wind-south",
  "wind-west",
  "wind-north",
  "dragon-red",
  "dragon-green",
  "dragon-white",
];

/** Bangun peta jumlah ubin berdasarkan `id` jenisnya. */
function countById(hand: Tile[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const tile of hand) {
    counts.set(tile.id, (counts.get(tile.id) ?? 0) + 1)
  }
  return counts
}

// ===========================================================================
// [FASE 3] Penguraian struktur tangan (backtracking)
// ===========================================================================

/** Sebuah set 3-ubin hasil penguraian. */
interface ParsedSet {
  type: "pung" | "chow"
  /** `id` ubin perwakilan (untuk chow: ubin terendah, mis. `dots-3`). */
  id: string
}

/** Hasil penguraian bagian "sisa" (setelah Kong diekstrak). */
interface Decomposition {
  sets: ParsedSet[]
  /** `id` ubin yang menjadi pasangan (mata). */
  pairId: string
}

/** Urutan/rank ubin agar penelusuran deterministik (suit lebih dulu, lalu honor). */
function tileRank(tile: Tile): number {
  if (tile.category === "suit") {
    const suitOrder: Record<SuitType, number> = {
      dots: 0,
      bamboo: 1,
      characters: 2,
    }
    return suitOrder[tile.suit] * 100 + tile.value
  }
  if (tile.category === "honor") {
    if (tile.honor === "wind") {
      const order: Record<string, number> = {
        east: 0,
        south: 1,
        west: 2,
        north: 3,
      }
      return 1000 + (order[tile.wind] ?? 0)
    }
    const order: Record<string, number> = { red: 0, green: 1, white: 2 }
    return 1100 + (order[tile.dragon] ?? 0)
  }
  return 9999
}

/**
 * Backtracking rekursif deterministik.
 *
 * Selalu memproses ubin tersisa dengan rank terkecil lebih dulu, dan mencoba
 * (dalam urutan): jadikan Pasang → Pung → Chow. Mengembalikan satu dekomposisi
 * lengkap (semua ubin terpakai, tepat 1 pasang) atau `null` bila mustahil.
 */
function solve(
  counts: Map<string, number>,
  orderedKeys: string[],
  repById: Map<string, Tile>,
  hasPair: boolean,
): Decomposition | null {
  const key = orderedKeys.find((k) => (counts.get(k) ?? 0) > 0)

  if (!key) {
    return hasPair ? { sets: [], pairId: "" } : null
  }

  const count = counts.get(key) as number
  const rep = repById.get(key) as Tile

  // (a) Coba jadikan Pasang (mata) — hanya jika belum ada pasangan.
  if (!hasPair && count >= 2) {
    counts.set(key, count - 2)
    const res = solve(counts, orderedKeys, repById, true)
    counts.set(key, count)
    if (res) {
      res.pairId = key
      return res
    }
  }

  // (b) Coba jadikan Pung (3 identik).
  if (count >= 3) {
    counts.set(key, count - 3)
    const res = solve(counts, orderedKeys, repById, hasPair)
    counts.set(key, count)
    if (res) {
      res.sets.unshift({ type: "pung", id: key })
      return res
    }
  }

  // (c) Coba jadikan Chow (3 berurutan, suit sama) — honor tidak bisa Chow.
  if (rep.category === "suit" && rep.value <= 7) {
    const k1 = `${rep.suit}-${rep.value + 1}`
    const k2 = `${rep.suit}-${rep.value + 2}`
    const c0 = counts.get(key) as number
    const c1 = counts.get(k1) ?? 0
    const c2 = counts.get(k2) ?? 0
    if (c1 > 0 && c2 > 0) {
      counts.set(key, c0 - 1)
      counts.set(k1, c1 - 1)
      counts.set(k2, c2 - 1)
      const res = solve(counts, orderedKeys, repById, hasPair)
      counts.set(key, c0)
      counts.set(k1, c1)
      counts.set(k2, c2)
      if (res) {
        res.sets.unshift({ type: "chow", id: key })
        return res
      }
    }
  }

  return null
}

/** Hasil analisis struktur lengkap sebuah tangan. */
interface HandStructure {
  isValid: boolean
  kongs: string[]
  sets: ParsedSet[]
  pairId: string
}

/**
 * Urai ubin suit/honor menjadi struktur: Kong (4-of-a-kind) + (Pung/Chow) +
 * tepat 1 Pasang. Valid bila total set (Kong + Pung + Chow) = 4.
 *
 * Empat ubin identik bisa menjadi Kong ATAU Pung + ubin dalam Chow lain
 * (mis. Chow 7-8-9 + Pung 9). Karena itu kita coba dua strategi:
 * 1) ekstrak 4-of-a-kind sebagai Kong dulu (All Kongs, dll.)
 * 2) tanpa ekstraksi — biarkan backtracking membentuk Pung + sisa ubin
 */
function parseHandStructure(standardTiles: Tile[]): HandStructure {
  const withKongs = tryParseHandStructure(standardTiles, true)
  if (withKongs.isValid) return withKongs
  const withoutKongs = tryParseHandStructure(standardTiles, false)
  if (withoutKongs.isValid) return withoutKongs
  return { isValid: false, kongs: [], sets: [], pairId: "" }
}

function tryParseHandStructure(
  standardTiles: Tile[],
  extractKongs: boolean,
): HandStructure {
  const baseCounts = countById(standardTiles)
  const counts = new Map(baseCounts)

  const repById = new Map<string, Tile>()
  for (const tile of standardTiles) {
    if (!repById.has(tile.id)) repById.set(tile.id, tile)
  }
  const orderedKeys = Array.from(repById.keys()).sort(
    (a, b) => tileRank(repById.get(a) as Tile) - tileRank(repById.get(b) as Tile),
  )

  const kongs: string[] = []
  if (extractKongs) {
    for (const key of orderedKeys) {
      if ((counts.get(key) ?? 0) === 4) {
        kongs.push(key)
        counts.set(key, 0)
      }
    }
  }

  const decomposition = solve(counts, orderedKeys, repById, false)
  if (!decomposition) {
    return { isValid: false, kongs, sets: [], pairId: "" }
  }

  const totalSets = kongs.length + decomposition.sets.length
  return {
    isValid: totalSets === 4 && decomposition.pairId !== "",
    kongs,
    sets: decomposition.sets,
    pairId: decomposition.pairId,
  }
}

// ===========================================================================
// [FASE 4 — BARU] Pre-check struktur atipikal (Seven Pairs & Thirteen Orphans)
// ===========================================================================

/**
 * Seven Unique Pairs — tepat 14 ubin standar terkelompok menjadi 7 pasang
 * yang seluruhnya berbeda jenis (setiap jenis tepat 2 ubin).
 */
function isSevenPairs(standardTiles: Tile[], stdCounts: Map<string, number>): boolean {
  if (standardTiles.length !== 14) return false
  const distinct = new Set(standardTiles.map((t) => t.id))
  if (distinct.size !== 7) return false
  for (const id of distinct) {
    if (stdCounts.get(id) !== 2) return false
  }
  return true
}

/** Seven Unique Pairs serba satu suit (tanpa honor) — Limit Hand 10 Fan. */
function isFlushSevenPairs(standardTiles: Tile[]): boolean {
  let suit: SuitType | null = null
  for (const tile of standardTiles) {
    if (tile.category !== "suit") return false
    if (suit === null) suit = tile.suit
    else if (tile.suit !== suit) return false
  }
  return suit !== null
}

/**
 * Thirteen Orphans — satu dari tiap Honor (4 Angin + 3 Naga) dan angka 1 & 9
 * tiap suit (13 jenis), plus tepat satu duplikat salah satunya sebagai pasangan.
 */
function isThirteenOrphans(
  standardTiles: Tile[],
  stdCounts: Map<string, number>,
): boolean {
  if (standardTiles.length !== 14) return false
  // Tidak boleh ada ubin di luar ke-13 jenis orphan.
  for (const tile of standardTiles) {
    if (!THIRTEEN_ORPHAN_IDS.includes(tile.id)) return false
  }
  let duplicates = 0
  for (const id of THIRTEEN_ORPHAN_IDS) {
    const c = stdCounts.get(id) ?? 0
    if (c < 1) return false // wajib satu dari tiap jenis
    if (c === 2) duplicates++
    else if (c !== 1) return false // c > 2 tidak sah
  }
  return duplicates === 1
}

// ===========================================================================
// [FASE 4] Nine Gates — lihat lib/mahjong/nine-gates.ts
// ===========================================================================

/**
 * Menghitung skor sebuah tangan Mahjong untuk konteks permainan tertentu.
 *
 * @param mainHand   - Ubin suit/honor untuk struktur (maks. 18, termasuk Kong).
 * @param flowerHand - Ubin Bunga/Musim (maks. 8), dinilai terpisah.
 * @param context    - Konteks Angin (kursi & ronde).
 * @param options    - Opsi tambahan (varian aturan).
 */
export function calculateHandScore(
  mainHand: Tile[],
  flowerHand: Tile[],
  context: GameContext,
  options: ScoreOptions = {},
): ScoreResult {
  const variant: RuleVariant = rulesetFromDb(options.variant ?? "jade-hk")
  /** Chicken Hand: min 0 Faan; hanya bonus rumah (Kong, Double Chi) + Bunga — tanpa pola HK. */
  const useHkosFaan = variant !== "chicken"
  const messages: string[] = []

  // Pola dipisah dua kelompok agar "Limit Hand" bisa meniadakan komponen kecil,
  // sementara pola Bunga/Musim (independen) tetap dijumlahkan di atasnya.
  const flowerPatterns: ScorePattern[] = []
  const handPatterns: ScorePattern[] = []

  const seat = WIND_TO_SEAT[context.seatWind]
  const roundSeat = WIND_TO_SEAT[context.roundWind]

  // -------------------------------------------------------------------------
  // Langkah 1: Bunga/Musim SUDAH terpisah pada `flowerHand`; `mainHand` hanya
  // berisi ubin suit/honor. (Filter defensif tetap dipasang bila ada salah zona.)
  // -------------------------------------------------------------------------
  const bonusTiles = flowerHand.filter((t) => t.category === "bonus")
  const standardTiles = mainHand.filter((t) => t.category !== "bonus")
  const stdCounts = countById(standardTiles)

  // -------------------------------------------------------------------------
  // Ubin Bunga & Musim — Jade HK §5 (Bunga Sendiri / Bunga Meja / No Flower)
  // -------------------------------------------------------------------------
  if (useHkosFaan && bonusTiles.length === 0 && standardTiles.length > 0) {
    flowerPatterns.push({
      key: "no-flower",
      name: "No Flower",
      fan: 1,
      description: "Tidak ada ubin Bunga/Musim sama sekali (+1 Faan).",
    })
  }
  for (const tile of bonusTiles) {
    if (tile.category !== "bonus") continue
    if (tile.seat === seat) {
      flowerPatterns.push({
        key: `own-bonus-${tile.id}`,
        name: `${tile.label} (Bunga Sendiri)`,
        fan: 1,
        description: `Bunga/Musim cocok Angin Kursi (${WIND_LABEL_ID[context.seatWind]}).`,
      })
    }
    if (tile.seat === roundSeat) {
      flowerPatterns.push({
        key: `round-bonus-${tile.id}`,
        name: `${tile.label} (Bunga Meja)`,
        fan: 1,
        description: `Bunga/Musim cocok Angin Meja (${WIND_LABEL_ID[context.roundWind]}).`,
      })
    }
  }

  if (useHkosFaan) {
    // -------------------------------------------------------------------------
    // Pung / Kong Naga — +1 Fan per jenis Naga (3 atau 4 ubin identik).
    // -------------------------------------------------------------------------
    for (const dragon of DRAGON_IDS) {
      const count = stdCounts.get(dragon.id) ?? 0
      if (count >= 3) {
        handPatterns.push({
          key: `pung-${dragon.id}`,
          name: `Pung ${dragon.name}`,
          fan: 1,
          description:
            count >= 4
              ? "Kong Naga (4 ubin identik)."
              : "Pung Naga (3 ubin identik).",
        })
      }
    }

    // -------------------------------------------------------------------------
    // Pung / Kong Angin — +1 Fan untuk Angin kursi, +1 Fan untuk Angin ronde.
    // -------------------------------------------------------------------------
    const seatWindId = `wind-${context.seatWind.toLowerCase()}`
    const roundWindId = `wind-${context.roundWind.toLowerCase()}`

    if ((stdCounts.get(seatWindId) ?? 0) >= 3) {
      handPatterns.push({
        key: "pung-seat-wind",
        name: `Pung Angin Kursi (${WIND_LABEL_ID[context.seatWind]})`,
        fan: 1,
        description: "Pung/Kong Angin yang sama dengan kursi pemain.",
      })
    }
    if ((stdCounts.get(roundWindId) ?? 0) >= 3) {
      handPatterns.push({
        key: "pung-round-wind",
        name: `Pung Angin Ronde (${WIND_LABEL_ID[context.roundWind]})`,
        fan: 1,
        description: "Pung/Kong Angin yang sama dengan Angin ronde.",
      })
    }
  }

  // ===========================================================================
  // [FASE 4 — BARU] Pre-check struktur atipikal + penguraian standar
  // ===========================================================================
  // Nine Gates & Thirteen Orphans dideteksi lebih dulu karena ekstraksi Kong
  // otomatis pada validator standar bisa "merusak" struktur uniknya.
  const nineGatesSuit = detectNineGatesSuit(standardTiles)
  const thirteenOrphans = isThirteenOrphans(standardTiles, stdCounts)
  const sevenPairs = isSevenPairs(standardTiles, stdCounts)
  const structure = parseHandStructure(standardTiles)
  const hasValidStructure =
    thirteenOrphans || sevenPairs || !!nineGatesSuit || structure.isValid

  if (thirteenOrphans) {
    // Thirteen Orphans adalah Limit Hand tersendiri.
    messages.push("Struktur atipikal: Thirteen Orphans (13 Yao).")
    if (useHkosFaan) {
      handPatterns.push({
        key: "thirteen-orphans",
        name: "Thirteen Orphans",
        fan: 10,
        description: "Satu tiap terminal & honor + satu pasangan. (Limit Hand)",
      })
    }
  } else if (nineGatesSuit) {
    // Nine Gates adalah Limit Hand satu-suit tersendiri.
    messages.push("Struktur atipikal: Nine Gates (Sembilan Gerbang).")
    if (useHkosFaan) {
      handPatterns.push({
        key: "nine-gates",
        name: "Nine Gates",
        fan: 10,
        description: `Pola 111-2345678-999 + ekstra (${SUIT_LABEL_ID[nineGatesSuit]}). Menunggu semua 1–9. (Limit Hand)`,
      })
    }
  } else if (sevenPairs) {
    // Seven Pairs — struktur atipikal (bukan 4 set + 1 pasang).
    messages.push("Struktur atipikal: Seven Pairs (Tujuh Pasang).")
    if (useHkosFaan) {
      if (isFlushSevenPairs(standardTiles)) {
        handPatterns.push({
          key: "flush-seven-pairs",
          name: "Flush in Seven Unique Pairs",
          fan: 10,
          description:
            "Tujuh pasang unik serba satu suit tanpa honor. (Limit Hand)",
        })
      } else {
        handPatterns.push({
          key: "seven-pairs",
          name: "Seven Pairs",
          fan: 4,
          description: "Tepat 14 ubin membentuk 7 pasang berbeda.",
        })
      }
    }
  } else if (hasValidStructure && structure.isValid) {
    // -----------------------------------------------------------------------
    // Rincian struktur untuk transparansi (ditampilkan di sidebar)
    // -----------------------------------------------------------------------
    const repById = new Map<string, Tile>()
    for (const tile of standardTiles) {
      if (!repById.has(tile.id)) repById.set(tile.id, tile)
    }
    const describeSet = (type: "kong" | "pung" | "chow", id: string): string => {
      const rep = repById.get(id) as Tile
      if (type === "chow" && rep.category === "suit") {
        const v = rep.value
        return `Chow ${SUIT_LABEL_ID[rep.suit]} ${v}-${v + 1}-${v + 2}`
      }
      const kind = type === "kong" ? "Kong" : "Pung"
      return `${kind} ${rep.label}`
    }
    messages.push("Struktur valid: 4 set + 1 pasang.")
    for (const id of structure.kongs) messages.push(describeSet("kong", id))
    for (const set of structure.sets) messages.push(describeSet(set.type, set.id))
    const pairRep = repById.get(structure.pairId)
    if (pairRep) messages.push(`Pasang ${pairRep.label}`)

    // -----------------------------------------------------------------------
    // Klasifikasi set (Kong dihitung sebagai jenis Pung/triplet)
    // -----------------------------------------------------------------------
    const tripletIds = [
      ...structure.kongs,
      ...structure.sets.filter((s) => s.type === "pung").map((s) => s.id),
    ]
    const chowCount = structure.sets.filter((s) => s.type === "chow").length
    const hasChow = chowCount > 0
    const hasPungLike = tripletIds.length > 0
    const pairId = structure.pairId

    const dragonTriplets = tripletIds.filter((id) => id.startsWith("dragon-"))
    const windTriplets = tripletIds.filter((id) => id.startsWith("wind-"))
    const pairIsDragon = pairId.startsWith("dragon-")
    const pairIsWind = pairId.startsWith("wind-")

    if (useHkosFaan) {
    // --- All Chows (Ping Hu) & All Pungs (Toitoi) ---
    if (hasChow && !hasPungLike) {
      handPatterns.push({
        key: "all-chows",
        name: "All Chows (Ping Hu)",
        fan: 1,
        description: "Seluruh set berupa urutan (Chow) + satu pasang.",
      })
    }
    if (!hasChow) {
      handPatterns.push({
        key: "all-pungs",
        name: "All Pungs (Toitoi)",
        fan: 3,
        description: "Seluruh set berupa Pung/Kong + satu pasang.",
      })
    }

    // --- Flush ---
    const suitsPresent = new Set<SuitType>()
    let hasHonors = false
    for (const tile of standardTiles) {
      if (tile.category === "suit") suitsPresent.add(tile.suit)
      else if (tile.category === "honor") hasHonors = true
    }
    if (suitsPresent.size === 1 && !hasHonors) {
      handPatterns.push({
        key: "full-flush",
        name: "Full Flush (Ching Yi Sher)",
        fan: 6,
        description: "Tangan 100% satu suit tanpa ubin kehormatan.",
      })
    } else if (suitsPresent.size === 1 && hasHonors) {
      handPatterns.push({
        key: "half-flush",
        name: "Half Flush (Huen Yi Sher)",
        fan: 3,
        description: "Satu suit dicampur ubin Angin/Naga.",
      })
    }

    // -----------------------------------------------------------------------
    // Special / Limit Hands berbasis struktur
    // -----------------------------------------------------------------------

    // --- Special Naga ---
    if (dragonTriplets.length === 3) {
      handPatterns.push({
        key: "big-three-dragons",
        name: "Three Great Scholars (Big Three Dragons)",
        fan: 10,
        description: "Tiga Pung/Kong seluruh Naga. (Limit Hand)",
      })
    } else if (dragonTriplets.length === 2 && pairIsDragon) {
      handPatterns.push({
        key: "little-three-dragons",
        name: "Little Three Dragons",
        fan: 4,
        description: "Dua Pung/Kong Naga + pasangan Naga ketiga.",
      })
    }

    // --- Special Angin ---
    if (windTriplets.length === 4) {
      handPatterns.push({
        key: "big-four-winds",
        name: "Big Four Winds",
        fan: 10,
        description: "Empat Pung/Kong seluruh Angin. (Limit Hand)",
      })
    } else if (windTriplets.length === 3 && pairIsWind) {
      handPatterns.push({
        key: "little-four-winds",
        name: "Little Four Winds",
        fan: 10,
        description: "Tiga Pung/Kong Angin + pasangan Angin keempat. (Limit Hand)",
      })
    }

    // --- Jade / Ruby / Pearl Dragon — Pung/Kong Naga + sisanya serba suit (boleh Chi/Pung), tanpa honor lain ---
    if (
      isDragonSuitWin(
        standardTiles,
        "dragon-green",
        "bamboo",
        structure.pairId,
        tripletIds,
      )
    ) {
      handPatterns.push({
        key: "jade-dragon",
        name: "Jade Dragon",
        fan: 10,
        description:
          "Pung/Kong Naga Hijau + sisanya serba Bambu (boleh Chi/Pung). Tanpa Angin/Naga lain. (Limit Hand)",
      })
    }
    if (
      isDragonSuitWin(
        standardTiles,
        "dragon-red",
        "characters",
        structure.pairId,
        tripletIds,
      )
    ) {
      handPatterns.push({
        key: "ruby-dragon",
        name: "Ruby Dragon",
        fan: 10,
        description:
          "Pung/Kong Naga Merah + sisanya serba Karakter (boleh Chi/Pung). Tanpa Angin/Naga lain. (Limit Hand)",
      })
    }
    if (
      isDragonSuitWin(
        standardTiles,
        "dragon-white",
        "dots",
        structure.pairId,
        tripletIds,
      )
    ) {
      handPatterns.push({
        key: "pearl-dragon",
        name: "Pearl Dragon",
        fan: 10,
        description:
          "Pung/Kong Naga Putih + sisanya serba Bulatan (boleh Chi/Pung). Tanpa Angin/Naga lain. (Limit Hand)",
      })
    }

    // --- All Honors ---
    const allHonors = standardTiles.every((t) => t.category === "honor")
    if (allHonors) {
      handPatterns.push({
        key: "all-honors",
        name: "All Honors",
        fan: 10,
        description: "Seluruh ubin adalah Angin/Naga (4 Pung + 1 pasang). (Limit Hand)",
      })
    }

    // --- All Terminals ---
    const allTerminals = standardTiles.every(
      (t) => t.category === "suit" && (t.value === 1 || t.value === 9),
    )
    if (allTerminals) {
      handPatterns.push({
        key: "all-terminals",
        name: "All Terminals",
        fan: 10,
        description: "Seluruh ubin adalah angka 1 & 9 (4 Pung + 1 pasang). (Limit Hand)",
      })
    }

    // --- All Kongs ---
    if (structure.kongs.length === 4) {
      handPatterns.push({
        key: "all-kongs",
        name: "All Kongs",
        fan: 10,
        description: "Empat Kong + satu pasangan. (Limit Hand)",
      })
    }
    }

    // --- Kong bonus: +1 Faan per Kong (empat sejenis) — Chicken & Jade HK ---
    const repByIdFlush = new Map<string, Tile>()
    for (const tile of standardTiles) {
      if (!repByIdFlush.has(tile.id)) repByIdFlush.set(tile.id, tile)
    }
    for (const kongId of structure.kongs) {
      const rep = repByIdFlush.get(kongId)
      handPatterns.push({
        key: `kong-bonus-${kongId}`,
        name: rep ? `Kong ${rep.label}` : "Kong",
        fan: 1,
        description:
          "+1 Faan tambahan per Kong (di atas Pong/Kong Naga/Angin jika ada).",
      })
    }

    // --- Double Chi — Chicken & Jade HK ---
    const chowStarts = structure.sets
      .filter((s) => s.type === "chow")
      .map((s) => s.id)
    const chowDup = new Map<string, number>()
    for (const startId of chowStarts) {
      chowDup.set(startId, (chowDup.get(startId) ?? 0) + 1)
    }
    for (const [startId, copies] of chowDup) {
      const pairs = Math.floor(copies / 2)
      if (pairs < 1) continue
      const rep = repById.get(startId)
      let chowLabel = startId
      if (rep?.category === "suit" && rep.value != null) {
        const suit = SUIT_LABEL_ID[rep.suit]
        chowLabel = `${suit} ${rep.value}-${rep.value + 1}-${rep.value + 2}`
      }
      for (let i = 0; i < pairs; i++) {
        handPatterns.push({
          key: `double-chow-${startId}-${i}`,
          name: "Double Chi (Pasangan Chow sama)",
          fan: 1,
          description: `Dua set Chi identik (${chowLabel}). +1 Faan.`,
        })
      }
    }
  } else if (standardTiles.length > 0) {
    messages.push(
      "Struktur belum lengkap (butuh 4 set + 1 pasang, atau tangan spesial).",
    )
  }

  // ===========================================================================
  // [FASE 4 — BARU] Hindari hitung ganda & terapkan aturan Limit Hand
  // ===========================================================================
  let effectiveHand = handPatterns

  // Little Three Dragons sudah mewakili kedua Pung Naga → buang Pung Naga individual.
  if (effectiveHand.some((p) => p.key === "little-three-dragons")) {
    effectiveHand = effectiveHand.filter((p) => !p.key.startsWith("pung-dragon-"))
  }

  // Limit Hand: bila ada pola >= 10 Fan, tangan diperlakukan sebagai Tangan Batas —
  // seluruh komponen kecil diabaikan, hanya pola Limit yang dihitung.
  const isLimitHand = effectiveHand.some((p) => p.fan >= LIMIT_FAN)
  if (isLimitHand) {
    effectiveHand = effectiveHand.filter((p) => p.fan >= LIMIT_FAN)
    messages.push("Tangan Batas (Limit Hand) tercapai — skor komponen diabaikan.")
  }

  if (
    variant === "chicken" &&
    hasValidStructure &&
    effectiveHand.length === 0 &&
    flowerPatterns.length === 0
  ) {
    effectiveHand = [
      {
        key: "chicken-hand",
        name: "Chicken Hand",
        fan: 0,
        description:
          "Tangan sah tanpa Faan HK — base 1.000 Jade Miles pada hitungan Chicken.",
      },
    ]
  }

  // -------------------------------------------------------------------------
  // Gabungan pola & total
  // -------------------------------------------------------------------------
  const patterns = [...flowerPatterns, ...effectiveHand]
  const rawFan = patterns.reduce((sum, p) => sum + p.fan, 0)
  // EDIT HERE — payout/display cap at Limit 10 Faan
  const totalFan = Math.min(LIMIT_FAN, rawFan)

  const minFan = minFanForRuleset(variant)
  let valid = hasValidStructure
  if (valid && totalFan < minFan) {
    valid = false
    messages.push(
      variant === "jade-hk"
        ? "Jade HK butuh minimal 1 Faan — chicken hand tidak dihitung di meja ini."
        : `Minimal ${minFan} Faan diperlukan untuk menang.`,
    )
  }

  if (mainHand.length === 0 && flowerHand.length === 0) {
    messages.unshift("Tangan masih kosong. Seret ubin ke area tangan pemain.")
  } else if (patterns.length === 0) {
    messages.push("Belum ada pola bernilai Faan yang terdeteksi.")
  }
  if (rawFan > LIMIT_FAN) {
    messages.push(
      `Total ${rawFan} Faan dibatasi Limit ${LIMIT_FAN} Faan untuk bayaran.`,
    )
  }

  return {
    totalFan,
    patterns,
    variant,
    hasValidStructure,
    isValidHand: valid,
    isLimitHand,
    messages,
  }
}
