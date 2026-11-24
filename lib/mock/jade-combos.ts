export type ComboPointBucket = "1" | "3" | "4" | "6" | "10"

export interface HouseComboPattern {
  id: string
  name: string
  points: number
  bucket: ComboPointBucket
  description: string
  /** Visual example — Kongs use 4 tiles; full hands use 14. */
  exampleTileIds: string[]
  tag?: "House"
}

export const COMBO_POINT_FILTERS: { id: ComboPointBucket | "all"; label: string }[] =
  [
    { id: "all", label: "Semua" },
    { id: "1", label: "1 Faan" },
    { id: "3", label: "3 Faan" },
    { id: "4", label: "4 Faan" },
    { id: "6", label: "6 Faan" },
    { id: "10", label: "10 Faan" },
  ]

function bucketFor(points: number): ComboPointBucket {
  if (points <= 1) return "1"
  if (points === 3) return "3"
  if (points === 4) return "4"
  if (points <= 6) return "6"
  return "10"
}

function pattern(
  partial: Omit<HouseComboPattern, "bucket" | "points" | "tag"> & {
    points: number
  },
): HouseComboPattern {
  return {
    ...partial,
    tag: "House",
    bucket: bucketFor(partial.points),
  }
}

const pung = (id: string) => [id, id, id] as const
const pair = (id: string) => [id, id] as const
/** Chi 1-2-3 from lowest tile id */
function chiFromStart(startId: string) {
  const m = /^(\w+)-(\d+)$/.exec(startId)
  if (!m) return [startId, startId, startId]
  const suit = m[1]
  const v = Number(m[2])
  return [`${suit}-${v}`, `${suit}-${v + 1}`, `${suit}-${v + 2}`]
}

/** Katalog pola Jade Mahjong HK — sinkron §5 spesifikasi resmi. */
export const HOUSE_COMBO_PATTERNS: HouseComboPattern[] = [
  pattern({
    id: "pung-dragon",
    name: "Pong / Kong Naga",
    points: 1,
    description:
      "Pong atau Kong Naga Merah, Hijau, atau Putih. +1 Faan per jenis. Contoh: Pong (3 tile).",
    exampleTileIds: [...pung("dragon-red")],
  }),
  pattern({
    id: "pung-seat-wind",
    name: "Pong / Kong Angin Kursi",
    points: 1,
    description: "Pong/Kong Angin yang cocok dengan kursi pemain.",
    exampleTileIds: [...pung("wind-east")],
  }),
  pattern({
    id: "pung-round-wind",
    name: "Pong / Kong Angin Meja",
    points: 1,
    description: "Pong/Kong Angin yang cocok dengan Angin Meja putaran.",
    exampleTileIds: [...pung("wind-south")],
  }),
  pattern({
    id: "kong-bonus",
    name: "Kong",
    points: 1,
    description:
      "+1 Faan tambahan per Kong (empat sejenis), di atas bonus Pong/Kong lain.",
    exampleTileIds: [
      "dots-5",
      "dots-5",
      "dots-5",
      "dots-5",
    ],
  }),
  pattern({
    id: "double-chow",
    name: "Double Chi (Pasangan Chow sama)",
    points: 1,
    description:
      "Dua set Chi identik — contoh: dua kali 1-2-3 Bulatan. +1 Faan.",
    exampleTileIds: [
      ...chiFromStart("dots-1"),
      ...chiFromStart("dots-1"),
    ],
  }),
  pattern({
    id: "own-bonus",
    name: "Bunga Sendiri",
    points: 1,
    description:
      "Bunga/Musim angkanya sama dengan Angin Kursi. +1 Faan per tile cocok.",
    exampleTileIds: ["flower-plum", "season-spring"],
  }),
  pattern({
    id: "round-bonus",
    name: "Bunga Meja",
    points: 1,
    description:
      "Bunga/Musim angkanya sama dengan Angin Meja. +1 Faan per tile cocok.",
    exampleTileIds: ["flower-orchid", "season-summer"],
  }),
  pattern({
    id: "all-chows",
    name: "All Chi (Ping Hu)",
    points: 1,
    description: "4 set Chi + 1 pair bebas — tangan penuh 14 tile.",
    exampleTileIds: [
      ...chiFromStart("dots-1"),
      ...chiFromStart("dots-1"),
      ...chiFromStart("bamboo-4"),
      ...chiFromStart("characters-5"),
      ...pair("dots-2"),
    ],
  }),
  pattern({
    id: "all-pungs",
    name: "All Pong (Toi Toi Hu)",
    points: 3,
    description: "4 set Pong/Kong + 1 pair bebas — 14 tile.",
    exampleTileIds: [
      ...pung("bamboo-3"),
      ...pung("dots-8"),
      ...pung("wind-north"),
      ...pung("characters-5"),
      ...pair("dragon-green"),
    ],
  }),
  pattern({
    id: "half-flush",
    name: "Half Flush (Hun Yi Se)",
    points: 3,
    description: "1 suit angka + Honor (Angin/Naga) — 14 tile.",
    exampleTileIds: [
      "characters-2",
      "characters-3",
      "characters-4",
      ...pung("characters-5"),
      "characters-7",
      "characters-8",
      "characters-9",
      ...pung("dragon-white"),
      ...pair("wind-east"),
    ],
  }),
  pattern({
    id: "full-flush",
    name: "Flush (Qing Yi Se)",
    points: 6,
    description: "Seluruh 14 tile dari 1 suit angka, tanpa Honor.",
    exampleTileIds: [
      "bamboo-1",
      "bamboo-2",
      "bamboo-3",
      ...pung("bamboo-5"),
      "bamboo-7",
      "bamboo-8",
      "bamboo-9",
      ...pung("bamboo-4"),
      ...pair("bamboo-6"),
    ],
  }),
  pattern({
    id: "seven-pairs",
    name: "Seven Pair (Qi Dui)",
    points: 4,
    description: "7 pair bebas (14 tile). Last draw boleh buka.",
    exampleTileIds: [
      ...pair("characters-1"),
      ...pair("bamboo-4"),
      ...pair("dots-9"),
      ...pair("dragon-red"),
      ...pair("wind-east"),
      ...pair("characters-5"),
      ...pair("bamboo-8"),
    ],
  }),
  pattern({
    id: "little-three-dragons",
    name: "Little Dragon (Xiao San Yuan)",
    points: 4,
    description:
      "2 Pong/Kong Naga + 1 pair Naga + 1 set bebas + 1 set bebas. Boleh dibuka.",
    exampleTileIds: [
      ...pung("dragon-red"),
      ...pung("dragon-green"),
      ...pair("dragon-white"),
      "dots-2",
      "dots-3",
      "dots-4",
      ...pung("bamboo-8"),
    ],
  }),
  pattern({
    id: "big-three-dragons",
    name: "Three Great Scholars (Da San Yuan)",
    points: 10,
    description: "3 Pong/Kong seluruh Naga + 1 set + 1 pair bebas — 14 tile.",
    exampleTileIds: [
      ...pung("dragon-red"),
      ...pung("dragon-green"),
      ...pung("dragon-white"),
      "characters-4",
      "characters-5",
      "characters-6",
      ...pair("dots-3"),
    ],
  }),
  pattern({
    id: "jade-dragon",
    name: "Jade Dragon",
    points: 10,
    description:
      "Pung/Kong Fa Cai (發) + sisanya serba Bambu Pong/Kong + pair (tanpa Chi).",
    exampleTileIds: [
      ...pung("dragon-green"),
      ...pung("bamboo-2"),
      ...pung("bamboo-5"),
      ...pung("bamboo-8"),
      ...pair("bamboo-9"),
    ],
  }),
  pattern({
    id: "ruby-dragon",
    name: "Ruby Dragon",
    points: 10,
    description:
      "Pung/Kong Chong (中) + sisanya serba Karakter Pong/Kong + pair (tanpa Chi).",
    exampleTileIds: [
      ...pung("dragon-red"),
      ...pung("characters-2"),
      ...pung("characters-5"),
      ...pung("characters-8"),
      ...pair("characters-9"),
    ],
  }),
  pattern({
    id: "pearl-dragon",
    name: "Pearl Dragon",
    points: 10,
    description:
      "Pung/Kong Pak Phan (白) + sisanya serba Bulat Pong/Kong + pair (tanpa Chi).",
    exampleTileIds: [
      ...pung("dragon-white"),
      ...pung("dots-2"),
      ...pung("dots-5"),
      ...pung("dots-8"),
      ...pair("dots-9"),
    ],
  }),
  pattern({
    id: "all-honors",
    name: "All Honors",
    points: 10,
    description: "4 Pong/Kong Honor + 1 pair Honor — 14 tile.",
    exampleTileIds: [
      ...pung("wind-east"),
      ...pung("wind-south"),
      ...pung("dragon-red"),
      ...pung("dragon-green"),
      ...pair("wind-north"),
    ],
  }),
  pattern({
    id: "little-four-winds",
    name: "Little Three Winds",
    points: 10,
    description: "3 Pong/Kong Angin + 1 pair Angin + 1 set bebas — 14 tile.",
    exampleTileIds: [
      ...pung("wind-east"),
      ...pung("wind-south"),
      ...pung("wind-west"),
      ...pair("wind-north"),
      "dots-5",
      "dots-6",
      "dots-7",
    ],
  }),
  pattern({
    id: "big-four-winds",
    name: "Big Four Winds",
    points: 10,
    description: "4 Pong/Kong seluruh Angin + 1 pair bebas — 14 tile.",
    exampleTileIds: [
      ...pung("wind-east"),
      ...pung("wind-south"),
      ...pung("wind-west"),
      ...pung("wind-north"),
      ...pair("dragon-red"),
    ],
  }),
  pattern({
    id: "nine-gates",
    name: "Nine Gates",
    points: 10,
    description:
      "111-2345678-999 + 1 tile ekstra satu suit (14 tile). Last draw boleh buka.",
    exampleTileIds: [
      "characters-1",
      "characters-1",
      "characters-1",
      "characters-2",
      "characters-3",
      "characters-4",
      "characters-5",
      "characters-6",
      "characters-7",
      "characters-8",
      "characters-9",
      "characters-9",
      "characters-9",
      "characters-5",
    ],
  }),
  pattern({
    id: "all-terminals",
    name: "All Terminals",
    points: 10,
    description: "Hanya angka 1 dan 9 — 4 Pong/Kong + 1 pair (14 tile).",
    exampleTileIds: [
      ...pung("dots-1"),
      ...pung("dots-9"),
      ...pung("bamboo-1"),
      ...pung("characters-9"),
      ...pair("bamboo-9"),
    ],
  }),
  pattern({
    id: "thirteen-orphans",
    name: "Thirteen Orphans",
    points: 10,
    description:
      "Satu tiap terminal & honor + satu pair (14 tile). Last draw boleh buka.",
    exampleTileIds: [
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
      "dragon-white",
    ],
  }),
]

export function combosByBucket(bucket: ComboPointBucket | "all") {
  if (bucket === "all") return HOUSE_COMBO_PATTERNS
  return HOUSE_COMBO_PATTERNS.filter((entry) => entry.bucket === bucket)
}

export const HONOR_OF_THE_DAY_ID = "wind-east"
export const NUMBER_OF_THE_DAY_IDS = [
  "characters-1",
  "dots-1",
  "bamboo-1",
] as const
