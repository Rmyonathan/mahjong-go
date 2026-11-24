/**
 * Katalog tampilan pola Jade Mahjong HK (§5 spesifikasi resmi).
 * Nilai Faan mengikuti mesin skor di `engine.ts` — file ini hanya untuk UI.
 */

import {
  FAAN_LIMIT,
  FAAN_TO_BASE_POINTS,
  getJadePayout,
} from "@/lib/mahjong/payout"

export type HkosPatternGroup =
  | "bonus"
  | "structure"
  | "special"
  | "limit"

export interface HkosCatalogPattern {
  key: string
  name: string
  fan: number
  group: HkosPatternGroup
  description: string
}

/** +1 Faan: Naga, Angin, Bunga/Musim — bisa bertumpuk di atas pola tangan. */
export const HKOS_BONUS_PATTERNS: HkosCatalogPattern[] = [
  {
    key: "pung-dragon",
    name: "Pong / Kong Naga",
    fan: 1,
    group: "bonus",
    description:
      "Pong atau Kong dari salah satu Naga: Merah (中 Chong), Hijau (發 Fa Cai), atau Putih (白 Pak Phan). +1 Faan per jenis.",
  },
  {
    key: "pung-seat-wind",
    name: "Pong / Kong Angin Kursi",
    fan: 1,
    group: "bonus",
    description:
      "Pong/Kong Angin yang sesuai dengan kursi pemain sendiri (Seat Wind). +1 Faan.",
  },
  {
    key: "pung-round-wind",
    name: "Pong / Kong Angin Meja",
    fan: 1,
    group: "bonus",
    description:
      "Pong/Kong Angin yang sesuai dengan Angin Meja putaran saat ini (Round Wind). +1 Faan.",
  },
  {
    key: "own-bonus",
    name: "Bunga Sendiri (Dapat Bunga Sendiri)",
    fan: 1,
    group: "bonus",
    description:
      "Bunga/Musim yang angkanya sama dengan Angin Kursi. Bisa +2 jika punya Bunga dan Musim yang cocok.",
  },
  {
    key: "round-bonus",
    name: "Bunga Meja (Dapat Bunga Meja)",
    fan: 1,
    group: "bonus",
    description:
      "Bunga/Musim yang angkanya sama dengan Angin Meja. +1 Faan per tile yang cocok.",
  },
  {
    key: "kong-bonus",
    name: "Kong",
    fan: 1,
    group: "bonus",
    description:
      "+1 Faan tambahan untuk setiap Kong (empat ubin sejenis). Bisa bertumpuk dengan Pong/Kong Naga atau Angin.",
  },
  {
    key: "double-chow",
    name: "Double Chi (Pasangan Chow sama)",
    fan: 1,
    group: "bonus",
    description:
      "Dua urutan Chi identik dalam satu tangan (contoh: dua kali 1-2-3 Bulatan). +1 Faan per pasang Chow sama.",
  },
]

/** Dasar struktur tangan — 4 set + 1 pasang (atau pola khusus). */
export const HKOS_STRUCTURE_PATTERNS: HkosCatalogPattern[] = [
  {
    key: "all-chows",
    name: "All Chi (Ping Hu)",
    fan: 1,
    group: "structure",
    description:
      "Semua 4 set berupa urutan (Chi) + 1 pair bebas. Tanpa Pong/Kong di set utama.",
  },
  {
    key: "all-pungs",
    name: "All Pong (Toi Toi Hu)",
    fan: 3,
    group: "structure",
    description:
      "Semua 4 set berupa kembar 3/4 (Pong/Kong) + 1 pair bebas.",
  },
  {
    key: "half-flush",
    name: "Half Flush (Hun Yi Se)",
    fan: 3,
    group: "structure",
    description:
      "Semua tile dari 1 suit angka (Man / Bulat / Bambu) dicampur Honor (Angin / Naga).",
  },
  {
    key: "full-flush",
    name: "Flush (Qing Yi Se)",
    fan: 6,
    group: "structure",
    description:
      "Seluruh 14 tile dari 1 suit angka saja — tanpa Honor sama sekali.",
  },
]

/** Special hands — 4 Faan (catatan boleh dibuka / last draw). */
export const HKOS_SPECIAL_PATTERNS: HkosCatalogPattern[] = [
  {
    key: "seven-pairs",
    name: "Seven Pair (Qi Dui)",
    fan: 4,
    group: "special",
    description:
      "7 pasang tile (pair), gambar bebas. Last draw boleh buka.",
  },
  {
    key: "little-three-dragons",
    name: "Little Dragon (Xiao San Yuan)",
    fan: 4,
    group: "special",
    description:
      "2 Pong/Kong Naga + 1 pair Naga + sisa set Pong/Kong/Chi bebas. Boleh dibuka.",
  },
]

/** Limit Hand — 10 Faan (maksimum meja). */
export const HKOS_LIMIT_PATTERNS: HkosCatalogPattern[] = [
  {
    key: "big-three-dragons",
    name: "Three Great Scholars (Da San Yuan)",
    fan: 10,
    group: "limit",
    description:
      "3 Pong/Kong Naga lengkap (中, 發, 白) + 1 set bebas + 1 pair bebas. Boleh dibuka.",
  },
  {
    key: "jade-dragon",
    name: "Jade Dragon (Lu Yi Se)",
    fan: 10,
    group: "limit",
    description:
      "Pong/Kong Naga Hijau (發) + sisa set Pong/Kong dan pair hanya suit Bambu (tanpa Chi). Boleh dibuka.",
  },
  {
    key: "ruby-dragon",
    name: "Ruby Dragon (Red Dragon)",
    fan: 10,
    group: "limit",
    description:
      "Pong/Kong Naga Merah (中) + sisa set Pong/Kong dan pair hanya Karakter/Man (tanpa Chi). Boleh dibuka.",
  },
  {
    key: "pearl-dragon",
    name: "Pearl Dragon (White Dragon)",
    fan: 10,
    group: "limit",
    description:
      "Pong/Kong Naga Putih (白) + sisa set Pong/Kong dan pair hanya Bulat/Dots (tanpa Chi). Boleh dibuka.",
  },
  {
    key: "all-honors",
    name: "All Honors (Zi Yi Se)",
    fan: 10,
    group: "limit",
    description:
      "4 Pong/Kong Honor bebas (Angin / Naga) + 1 pair Honor bebas. Boleh dibuka.",
  },
  {
    key: "little-four-winds",
    name: "Little Three Winds (Xiao Si Xi)",
    fan: 10,
    group: "limit",
    description:
      "3 Pong/Kong Angin + 1 pair Angin + 1 set Pong/Kong/Chi bebas. Boleh dibuka.",
  },
  {
    key: "big-four-winds",
    name: "Big Four Winds (Da Si Xi)",
    fan: 10,
    group: "limit",
    description:
      "4 Pong/Kong Angin lengkap (東南西北) + 1 pair bebas. Boleh dibuka.",
  },
  {
    key: "nine-gates",
    name: "Nine Gates (Jiu Lian Bao Deng)",
    fan: 10,
    group: "limit",
    description:
      "1 suit: 1-1-1, 2–8, 9-9-9 + 1 tile kembar sebagai pair. Last draw boleh buka.",
  },
  {
    key: "all-terminals",
    name: "All Terminals (Qing Yao Jiu)",
    fan: 10,
    group: "limit",
    description:
      "4 Pong/Kong dan 1 pair hanya dari angka 1 dan 9. Boleh dibuka.",
  },
  {
    key: "thirteen-orphans",
    name: "Thirteen Orphans (Shi San Yao)",
    fan: 10,
    group: "limit",
    description:
      "1 & 9 tiap suit + ke-7 Honor + 1 pair dari salah satu tile tersebut. Last draw boleh buka.",
  },
]

/** @deprecated Gunakan HKOS_BONUS_PATTERNS — alias lama untuk impor kompatibel. */
export const HKOS_BASIC_PATTERNS = HKOS_BONUS_PATTERNS

export function formatJadeMiles(value: number): string {
  return value.toLocaleString("id-ID")
}

export interface HkosPayoutRow {
  fan: number
  basePoints: number
  winnerDiscard: number
  winnerSelfDraw: number
  note?: string
}

/** Baris tabel Faan → Jade Miles (Social Points per 1.000). */
export const HKOS_PAYOUT_ROWS: HkosPayoutRow[] = Array.from(
  { length: FAAN_LIMIT + 1 },
  (_, fan) => {
    const payout = getJadePayout(fan)
    const row: HkosPayoutRow = {
      fan,
      basePoints: FAAN_TO_BASE_POINTS[fan] ?? payout.basePoints,
      winnerDiscard: payout.winnerDiscard,
      winnerSelfDraw: payout.winnerSelfDraw,
    }
    if (fan === 0) row.note = "Chicken Hand"
    if (fan === FAAN_LIMIT) row.note = "Limit"
    return row
  },
)

export const HKOS_SECTIONS = [
  {
    id: "bonus",
    title: "Bonus & Dasar",
    blurb:
      "+1 Faan per komponen — dijumlahkan di atas pola tangan utama.",
    patterns: HKOS_BONUS_PATTERNS,
  },
  {
    id: "structure",
    title: "Struktur Tangan",
    blurb: "Ping Hu, Toi Toi, Half Flush, dan Flush.",
    patterns: HKOS_STRUCTURE_PATTERNS,
  },
  {
    id: "special",
    title: "Special Hand (4 Faan)",
    blurb: 'Syarat "boleh dibuka" / last draw tetap sah.',
    patterns: HKOS_SPECIAL_PATTERNS,
  },
  {
    id: "limit",
    title: "Limit Hand (10 Faan)",
    blurb:
      "Maksimum 10 Faan = 64.000 base (Jade Miles). Komponen kecil diabaikan.",
    patterns: HKOS_LIMIT_PATTERNS,
  },
] as const