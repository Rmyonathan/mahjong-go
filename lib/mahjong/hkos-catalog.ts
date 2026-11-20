/**
 * Katalog tampilan pola Hong Kong Old Style.
 * Sumber nilai Fan = mesin skor di `engine.ts` (bukan logika skor baru).
 */

export type HkosPatternGroup =
  | "bonus"
  | "basic"
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

/** Pola bonus Bunga/Musim — dijumlahkan di atas komponen tangan. */
export const HKOS_BONUS_PATTERNS: HkosCatalogPattern[] = [
  {
    key: "no-flowers",
    name: "Tanpa Bunga",
    fan: 1,
    group: "bonus",
    description: "Tangan tidak memiliki ubin Bunga maupun Musim.",
  },
  {
    key: "own-bonus",
    name: "Bunga / Musim Sendiri",
    fan: 1,
    group: "bonus",
    description: "Setiap ubin bonus yang cocok dengan kursi pemain (+1 Fan).",
  },
  {
    key: "set-of-seasons",
    name: "Satu Set Musim",
    fan: 2,
    group: "bonus",
    description: "Memiliki keempat ubin Musim.",
  },
  {
    key: "set-of-flowers",
    name: "Satu Set Bunga",
    fan: 2,
    group: "bonus",
    description: "Memiliki keempat ubin Bunga.",
  },
]

/** Pola dasar honor & angin. */
export const HKOS_BASIC_PATTERNS: HkosCatalogPattern[] = [
  {
    key: "pung-dragon",
    name: "Pung / Kong Naga",
    fan: 1,
    group: "basic",
    description: "+1 Fan per jenis Naga (Merah, Hijau, atau Putih).",
  },
  {
    key: "pung-seat-wind",
    name: "Pung Angin Kursi",
    fan: 1,
    group: "basic",
    description: "Pung/Kong Angin yang sama dengan kursi pemain.",
  },
  {
    key: "pung-round-wind",
    name: "Pung Angin Ronde",
    fan: 1,
    group: "basic",
    description: "Pung/Kong Angin yang sama dengan Angin ronde.",
  },
]

/** Pola struktur tangan standar (4 set + 1 pasang). */
export const HKOS_STRUCTURE_PATTERNS: HkosCatalogPattern[] = [
  {
    key: "all-chows",
    name: "All Chows (Ping Hu)",
    fan: 1,
    group: "structure",
    description: "Seluruh set berupa urutan (Chow) + satu pasang.",
  },
  {
    key: "all-pungs",
    name: "All Pungs (Toitoi)",
    fan: 3,
    group: "structure",
    description: "Seluruh set berupa Pung/Kong + satu pasang.",
  },
  {
    key: "half-flush",
    name: "Half Flush (Huen Yi Sher)",
    fan: 3,
    group: "structure",
    description: "Satu suit dicampur ubin Angin/Naga.",
  },
  {
    key: "full-flush",
    name: "Full Flush (Ching Yi Sher)",
    fan: 6,
    group: "structure",
    description: "Tangan 100% satu suit tanpa ubin kehormatan.",
  },
  {
    key: "seven-pairs",
    name: "Seven Pairs",
    fan: 4,
    group: "structure",
    description: "Tepat 14 ubin membentuk 7 pasang berbeda.",
  },
  {
    key: "little-three-dragons",
    name: "Little Three Dragons",
    fan: 4,
    group: "special",
    description: "Dua Pung/Kong Naga + pasangan Naga ketiga.",
  },
]

/** Limit Hand — ≥10 Fan; komponen kecil diabaikan. */
export const HKOS_LIMIT_PATTERNS: HkosCatalogPattern[] = [
  {
    key: "thirteen-orphans",
    name: "Thirteen Orphans",
    fan: 10,
    group: "limit",
    description: "Satu tiap terminal & honor + satu pasangan.",
  },
  {
    key: "nine-gates",
    name: "Nine Gates",
    fan: 10,
    group: "limit",
    description: "Pola 111-2345678-999 + ekstra satu suit. Menunggu semua 1–9.",
  },
  {
    key: "flush-seven-pairs",
    name: "Flush in Seven Unique Pairs",
    fan: 10,
    group: "limit",
    description: "Tujuh pasang unik serba satu suit tanpa honor.",
  },
  {
    key: "big-three-dragons",
    name: "Three Great Scholars (Big Three Dragons)",
    fan: 10,
    group: "limit",
    description: "Tiga Pung/Kong seluruh Naga.",
  },
  {
    key: "big-four-winds",
    name: "Big Four Winds",
    fan: 10,
    group: "limit",
    description: "Empat Pung/Kong seluruh Angin.",
  },
  {
    key: "little-four-winds",
    name: "Little Four Winds",
    fan: 10,
    group: "limit",
    description: "Tiga Pung/Kong Angin + pasangan Angin keempat.",
  },
  {
    key: "jade-dragon",
    name: "Jade Dragon",
    fan: 10,
    group: "limit",
    description: "Naga Hijau (pasang/Pung) + sisanya serba Bambu.",
  },
  {
    key: "ruby-dragon",
    name: "Ruby Dragon",
    fan: 10,
    group: "limit",
    description: "Naga Merah (pasang/Pung) + sisanya serba Karakter.",
  },
  {
    key: "pearl-dragon",
    name: "Pearl Dragon",
    fan: 10,
    group: "limit",
    description: "Naga Putih (pasang/Pung) + sisanya serba Bulatan.",
  },
  {
    key: "all-honors",
    name: "All Honors",
    fan: 10,
    group: "limit",
    description: "Seluruh ubin adalah Angin/Naga (4 Pung + 1 pasang).",
  },
  {
    key: "all-terminals",
    name: "All Terminals",
    fan: 10,
    group: "limit",
    description: "Seluruh ubin adalah angka 1 & 9 (4 Pung + 1 pasang).",
  },
  {
    key: "all-kongs",
    name: "All Kongs",
    fan: 10,
    group: "limit",
    description: "Empat Kong + satu pasangan.",
  },
]

export const HKOS_PAYOUT_ROWS = [
  { fan: 1, ron: 2, tsumo: 1 },
  { fan: 2, ron: 4, tsumo: 2 },
  { fan: 3, ron: 8, tsumo: 4 },
  { fan: 4, ron: 16, tsumo: 8 },
  { fan: 5, ron: 24, tsumo: 12 },
  { fan: 6, ron: 32, tsumo: 16 },
  { fan: 7, ron: 48, tsumo: 24 },
  { fan: 8, ron: 64, tsumo: 32 },
  { fan: 9, ron: 96, tsumo: 48 },
  { fan: 10, ron: 128, tsumo: 64, note: "Limit" },
] as const

export const HKOS_SECTIONS = [
  {
    id: "bonus",
    title: "Bunga & Musim",
    blurb: "Dihitung terpisah. Tetap dijumlahkan meski tangan Limit.",
    patterns: HKOS_BONUS_PATTERNS,
  },
  {
    id: "basic",
    title: "Honor Dasar",
    blurb: "Pung/Kong Naga dan Angin kursi atau ronde.",
    patterns: HKOS_BASIC_PATTERNS,
  },
  {
    id: "structure",
    title: "Struktur Tangan",
    blurb: "Empat set + satu pasang, atau Seven Pairs.",
    patterns: HKOS_STRUCTURE_PATTERNS,
  },
  {
    id: "limit",
    title: "Limit Hand",
    blurb: "≥10 Fan. Komponen kecil diabaikan; skor batas 128/lawan (ron).",
    patterns: HKOS_LIMIT_PATTERNS,
  },
] as const
