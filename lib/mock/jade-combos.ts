export type ComboPointBucket = "1" | "2" | "4" | "6" | "8+"

export interface HouseComboPattern {
  id: string
  name: string
  points: number
  bucket: ComboPointBucket
  description: string
  exampleTileIds: string[]
  tag?: "MCR" | "House"
}

export const COMBO_POINT_FILTERS: { id: ComboPointBucket | "all"; label: string }[] =
  [
    { id: "all", label: "All" },
    { id: "1", label: "1 pt" },
    { id: "2", label: "2 pts" },
    { id: "4", label: "4 pts" },
    { id: "6", label: "6 pts" },
    { id: "8+", label: "8+ pts" },
  ]

function bucketFor(points: number): ComboPointBucket {
  if (points <= 1) return "1"
  if (points === 2) return "2"
  if (points <= 4) return "4"
  if (points <= 6) return "6"
  return "8+"
}

function pattern(
  partial: Omit<HouseComboPattern, "bucket" | "points"> & { points: number },
): HouseComboPattern {
  return {
    ...partial,
    bucket: bucketFor(partial.points),
  }
}

/** Editorial house / MCR-flavoured patterns for the Combos page. */
export const HOUSE_COMBO_PATTERNS: HouseComboPattern[] = [
  pattern({
    id: "pure-double-chow",
    name: "Pure Double Chow",
    points: 1,
    tag: "MCR",
    description: "Dua chow identik dalam satu suit.",
    exampleTileIds: [
      "characters-2",
      "characters-3",
      "characters-4",
      "characters-2",
      "characters-3",
      "characters-4",
    ],
  }),
  pattern({
    id: "mixed-double-chow",
    name: "Mixed Double Chow",
    points: 1,
    tag: "MCR",
    description: "Dua chow nilai sama di suit berbeda.",
    exampleTileIds: [
      "characters-5",
      "characters-6",
      "characters-7",
      "dots-5",
      "dots-6",
      "dots-7",
    ],
  }),
  pattern({
    id: "short-straight",
    name: "Short Straight",
    points: 1,
    tag: "MCR",
    description: "Dua chow berurutan membentuk 1–6 atau 4–9.",
    exampleTileIds: [
      "bamboo-1",
      "bamboo-2",
      "bamboo-3",
      "bamboo-4",
      "bamboo-5",
      "bamboo-6",
    ],
  }),
  pattern({
    id: "pung-of-terminals",
    name: "Pung of Terminals",
    points: 1,
    tag: "House",
    description: "Pung 1 atau 9 di suit apa pun.",
    exampleTileIds: ["dots-1", "dots-1", "dots-1"],
  }),
  pattern({
    id: "dragon-pung",
    name: "Dragon Pung",
    points: 2,
    tag: "House",
    description: "Pung naga merah, hijau, atau putih.",
    exampleTileIds: ["dragon-red", "dragon-red", "dragon-red"],
  }),
  pattern({
    id: "seat-wind",
    name: "Seat Wind",
    points: 2,
    tag: "House",
    description: "Pung angin kursi pemain.",
    exampleTileIds: ["wind-west", "wind-west", "wind-west"],
  }),
  pattern({
    id: "all-chows",
    name: "All Chows",
    points: 2,
    tag: "MCR",
    description: "Empat set chow plus pasangan. Tanpa pung.",
    exampleTileIds: [
      "characters-1",
      "characters-2",
      "characters-3",
      "bamboo-4",
      "bamboo-5",
      "bamboo-6",
      "dots-7",
      "dots-8",
      "dots-9",
    ],
  }),
  pattern({
    id: "tile-hog",
    name: "Tile Hog",
    points: 2,
    tag: "MCR",
    description: "Memegang empat salinan ubin yang sama tanpa kong.",
    exampleTileIds: ["bamboo-5", "bamboo-5", "bamboo-5", "bamboo-5"],
  }),
  pattern({
    id: "outside-hand",
    name: "Outside Hand",
    points: 4,
    tag: "MCR",
    description: "Setiap set menyentuh terminal atau honor.",
    exampleTileIds: [
      "characters-1",
      "characters-2",
      "characters-3",
      "dots-9",
      "dots-9",
      "dots-9",
      "wind-east",
      "wind-east",
      "wind-east",
    ],
  }),
  pattern({
    id: "fully-concealed",
    name: "Fully Concealed",
    points: 4,
    tag: "House",
    description: "Menang self-draw tanpa set terbuka.",
    exampleTileIds: ["dragon-green", "dragon-green", "dragon-green"],
  }),
  pattern({
    id: "mixed-shifted",
    name: "Mixed Shifted Chows",
    points: 4,
    tag: "MCR",
    description: "Tiga chow bergeser satu nilai di tiga suit.",
    exampleTileIds: [
      "characters-2",
      "characters-3",
      "characters-4",
      "bamboo-3",
      "bamboo-4",
      "bamboo-5",
      "dots-4",
      "dots-5",
      "dots-6",
    ],
  }),
  pattern({
    id: "half-flush",
    name: "Half Flush",
    points: 6,
    tag: "MCR",
    description: "Satu suit plus honor. Klasik meja Jade.",
    exampleTileIds: [
      "characters-2",
      "characters-3",
      "characters-4",
      "characters-5",
      "characters-5",
      "characters-5",
      "dragon-white",
      "dragon-white",
      "dragon-white",
    ],
  }),
  pattern({
    id: "all-pungs",
    name: "All Pungs",
    points: 6,
    tag: "MCR",
    description: "Empat pung atau kong plus pasangan.",
    exampleTileIds: [
      "bamboo-3",
      "bamboo-3",
      "bamboo-3",
      "dots-8",
      "dots-8",
      "dots-8",
      "wind-north",
      "wind-north",
      "wind-north",
    ],
  }),
  pattern({
    id: "seven-pairs",
    name: "Seven Pairs",
    points: 8,
    tag: "House",
    description: "Tujuh pasangan. Tidak ada pung atau chow.",
    exampleTileIds: [
      "characters-1",
      "characters-1",
      "bamboo-4",
      "bamboo-4",
      "dots-9",
      "dots-9",
      "dragon-red",
      "dragon-red",
    ],
  }),
  pattern({
    id: "full-flush",
    name: "Full Flush",
    points: 8,
    tag: "MCR",
    description: "Satu suit saja. Tanpa honor.",
    exampleTileIds: [
      "bamboo-1",
      "bamboo-2",
      "bamboo-3",
      "bamboo-5",
      "bamboo-5",
      "bamboo-5",
      "bamboo-7",
      "bamboo-8",
      "bamboo-9",
    ],
  }),
  pattern({
    id: "greater-honors",
    name: "Three Great Scholars",
    points: 8,
    tag: "House",
    description: "Pung ketiga naga. Stempel berat di buku skor.",
    exampleTileIds: [
      "dragon-red",
      "dragon-red",
      "dragon-red",
      "dragon-green",
      "dragon-green",
      "dragon-green",
      "dragon-white",
      "dragon-white",
      "dragon-white",
    ],
  }),
  pattern({
    id: "jade-house-hand",
    name: "Jade House Hand",
    points: 8,
    tag: "House",
    description: "Pola rumah: flush hijau dengan pung Fa Cai.",
    exampleTileIds: [
      "bamboo-2",
      "bamboo-3",
      "bamboo-4",
      "bamboo-6",
      "bamboo-6",
      "bamboo-6",
      "dragon-green",
      "dragon-green",
      "dragon-green",
    ],
  }),
]

export function combosByBucket(bucket: ComboPointBucket | "all") {
  if (bucket === "all") return HOUSE_COMBO_PATTERNS
  return HOUSE_COMBO_PATTERNS.filter((entry) => entry.bucket === bucket)
}

export const HONOR_OF_THE_DAY_ID = "wind-west"
export const NUMBER_OF_THE_DAY_IDS = [
  "characters-4",
  "dots-4",
  "bamboo-4",
] as const
