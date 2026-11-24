/**
 * Katalog deterministik seluruh 144 ubin Mahjong beserta glyph Unicode
 * dan label Bahasa Indonesia. Dipakai untuk membangun "Bank Ubin" di UI.
 */

import type {
  DragonType,
  FlowerType,
  SeasonType,
  SuitType,
  SuitValue,
  Tile,
  TileCategory,
  WindType,
} from "./types";

// ---------------------------------------------------------------------------
// Glyph Unicode (blok Mahjong Tiles: U+1F000–U+1F02B)
// ---------------------------------------------------------------------------

const CHARACTER_GLYPHS = ["🀇", "🀈", "🀉", "🀊", "🀋", "🀌", "🀍", "🀎", "🀏"];
const BAMBOO_GLYPHS = ["🀐", "🀑", "🀒", "🀓", "🀔", "🀕", "🀖", "🀗", "🀘"];
const DOTS_GLYPHS = ["🀙", "🀚", "🀛", "🀜", "🀝", "🀞", "🀟", "🀠", "🀡"];

const SUIT_GLYPHS: Record<SuitType, string[]> = {
  characters: CHARACTER_GLYPHS,
  bamboo: BAMBOO_GLYPHS,
  dots: DOTS_GLYPHS,
};

const SUIT_LABELS: Record<SuitType, string> = {
  dots: "Bulatan",
  bamboo: "Bambu",
  characters: "Karakter",
};

const WIND_LABELS: Record<WindType, string> = {
  east: "Angin Timur",
  south: "Angin Selatan",
  west: "Angin Barat",
  north: "Angin Utara",
};

const WIND_GLYPHS: Record<WindType, string> = {
  east: "🀀",
  south: "🀁",
  west: "🀂",
  north: "🀃",
};

const DRAGON_LABELS: Record<DragonType, string> = {
  red: "Naga Merah",
  green: "Naga Hijau",
  white: "Naga Putih",
};

const DRAGON_GLYPHS: Record<DragonType, string> = {
  red: "🀄",
  green: "🀅",
  white: "🀆",
};

const FLOWER_LABELS: Record<FlowerType, string> = {
  plum: "Bunga Plum",
  orchid: "Bunga Anggrek",
  chrysanthemum: "Bunga Krisan",
  bamboo: "Bunga Bambu",
};

const FLOWER_GLYPHS: Record<FlowerType, string> = {
  plum: "🀢",
  orchid: "🀣",
  chrysanthemum: "🀤",
  bamboo: "🀥",
};

const SEASON_LABELS: Record<SeasonType, string> = {
  spring: "Musim Semi",
  summer: "Musim Panas",
  autumn: "Musim Gugur",
  winter: "Musim Dingin",
};

const SEASON_GLYPHS: Record<SeasonType, string> = {
  spring: "🀦",
  summer: "🀧",
  autumn: "🀨",
  winter: "🀩",
};

const WIND_ORDER: WindType[] = ["east", "south", "west", "north"];
const DRAGON_ORDER: DragonType[] = ["red", "green", "white"];
const FLOWER_ORDER: FlowerType[] = ["plum", "orchid", "chrysanthemum", "bamboo"];
const SEASON_ORDER: SeasonType[] = ["spring", "summer", "autumn", "winter"];
const SUIT_ORDER: SuitType[] = ["dots", "bamboo", "characters"];

// ---------------------------------------------------------------------------
// Pemetaan nama berkas foto ubin (public/tiles). Sumber: public/new tiles,
// diproses 3:4 + brightness via `node scripts/process-tiles.mjs`.
// Nama berkas case-sensitive di hosting produksi. Semua .jpeg.
// ---------------------------------------------------------------------------

/** Kata suit pada nama berkas, mis. `5 ${SUIT_FILE.dots}.jpeg` → `5 Bulat.jpeg`. */
const SUIT_FILE: Record<SuitType, string> = {
  dots: "Bulat",
  bamboo: "Bambu",
  characters: "Man",
};

const WIND_FILE: Record<WindType, string> = {
  east: "Tong",
  south: "Nan",
  west: "Xi",
  north: "Pei",
};

const DRAGON_FILE: Record<DragonType, string> = {
  green: "Fa Cai",
  red: "Chong",
  white: "Pak Phan",
};

const FLOWER_FILE: Record<FlowerType, string> = {
  plum: "Bunga 1 Plum",
  orchid: "Bunga 2 Anggrek",
  chrysanthemum: "Bunga 3 Krisan",
  bamboo: "Bunga 4 Bambu",
};

const SEASON_FILE: Record<SeasonType, string> = {
  spring: "Musim 1 Semi",
  summer: "Musim 2 Panas",
  autumn: "Musim 3 Gugur",
  winter: "Musim 4 Dingin",
};

// ---------------------------------------------------------------------------
// Pembuat ubin
// ---------------------------------------------------------------------------

function createSuitTile(suit: SuitType, value: SuitValue): Tile {
  return {
    category: "suit",
    suit,
    value,
    id: `${suit}-${value}`,
    glyph: SUIT_GLYPHS[suit][value - 1],
    label: `${value} ${SUIT_LABELS[suit]}`,
    copies: 4,
    imagePath: `${value} ${SUIT_FILE[suit]}.jpeg`,
  };
}

function createWindTile(wind: WindType): Tile {
  return {
    category: "honor",
    honor: "wind",
    wind,
    id: `wind-${wind}`,
    glyph: WIND_GLYPHS[wind],
    label: WIND_LABELS[wind],
    copies: 4,
    imagePath: `${WIND_FILE[wind]}.jpeg`,
  };
}

function createDragonTile(dragon: DragonType): Tile {
  return {
    category: "honor",
    honor: "dragon",
    dragon,
    id: `dragon-${dragon}`,
    glyph: DRAGON_GLYPHS[dragon],
    label: DRAGON_LABELS[dragon],
    copies: 4,
    imagePath: `${DRAGON_FILE[dragon]}.jpeg`,
  };
}

function createFlowerTile(flower: FlowerType, seat: 1 | 2 | 3 | 4): Tile {
  return {
    category: "bonus",
    bonus: "flower",
    flower,
    seat,
    id: `flower-${flower}`,
    glyph: FLOWER_GLYPHS[flower],
    label: FLOWER_LABELS[flower],
    copies: 1,
    imagePath: `${FLOWER_FILE[flower]}.jpeg`,
  };
}

function createSeasonTile(season: SeasonType, seat: 1 | 2 | 3 | 4): Tile {
  return {
    category: "bonus",
    bonus: "season",
    season,
    seat,
    id: `season-${season}`,
    glyph: SEASON_GLYPHS[season],
    label: SEASON_LABELS[season],
    copies: 1,
    imagePath: `${SEASON_FILE[season]}.jpeg`,
  };
}

// ---------------------------------------------------------------------------
// Kumpulan ubin unik (satu entri per jenis)
// ---------------------------------------------------------------------------

/** Semua ubin suit unik (27 jenis: 3 suit x 9 nilai). */
export const SUIT_TILES: Tile[] = SUIT_ORDER.flatMap((suit) =>
  ([1, 2, 3, 4, 5, 6, 7, 8, 9] as SuitValue[]).map((value) =>
    createSuitTile(suit, value),
  ),
);

/** Semua ubin Angin unik (4 jenis). */
export const WIND_TILES: Tile[] = WIND_ORDER.map(createWindTile);

/** Semua ubin Naga unik (3 jenis). */
export const DRAGON_TILES: Tile[] = DRAGON_ORDER.map(createDragonTile);

/** Semua ubin kehormatan unik (7 jenis: 4 Angin + 3 Naga). */
export const HONOR_TILES: Tile[] = [...WIND_TILES, ...DRAGON_TILES];

/** Semua ubin Bunga unik (4 jenis). */
export const FLOWER_TILES: Tile[] = FLOWER_ORDER.map((flower, i) =>
  createFlowerTile(flower, (i + 1) as 1 | 2 | 3 | 4),
);

/** Semua ubin Musim unik (4 jenis). */
export const SEASON_TILES: Tile[] = SEASON_ORDER.map((season, i) =>
  createSeasonTile(season, (i + 1) as 1 | 2 | 3 | 4),
);

/** Semua ubin bonus unik (8 jenis: 4 Bunga + 4 Musim). */
export const BONUS_TILES: Tile[] = [...FLOWER_TILES, ...SEASON_TILES];

/** Seluruh 34 jenis ubin unik dalam permainan. */
export const ALL_TILE_KINDS: Tile[] = [
  ...SUIT_TILES,
  ...HONOR_TILES,
  ...BONUS_TILES,
];

/** Pemetaan cepat dari `id` jenis ke definisi ubin. */
export const TILE_BY_ID: Record<string, Tile> = Object.fromEntries(
  ALL_TILE_KINDS.map((tile) => [tile.id, tile]),
);

// ---------------------------------------------------------------------------
// Pengelompokan untuk UI "Bank Ubin"
// ---------------------------------------------------------------------------

export interface TileGroup {
  /** Kunci stabil untuk grup. */
  key: string;
  /** Kategori ubin. */
  category: TileCategory;
  /** Judul grup dalam Bahasa Indonesia. */
  title: string;
  /** Deskripsi singkat grup. */
  description: string;
  /** Ubin di dalam grup. */
  tiles: Tile[];
}

/** Grup-grup ubin yang ditampilkan pada Bank Ubin. */
export const TILE_BANK_GROUPS: TileGroup[] = [
  {
    key: "dots",
    category: "suit",
    title: "Bulatan",
    description: "Suit lingkaran, bernilai 1–9",
    tiles: SUIT_TILES.filter((t) => t.category === "suit" && t.suit === "dots"),
  },
  {
    key: "bamboo",
    category: "suit",
    title: "Bambu",
    description: "Suit bambu, bernilai 1–9",
    tiles: SUIT_TILES.filter(
      (t) => t.category === "suit" && t.suit === "bamboo",
    ),
  },
  {
    key: "characters",
    category: "suit",
    title: "Karakter",
    description: "Suit angka/karakter, bernilai 1–9",
    tiles: SUIT_TILES.filter(
      (t) => t.category === "suit" && t.suit === "characters",
    ),
  },
  {
    key: "honors",
    category: "honor",
    title: "Kehormatan",
    description: "Angin (Timur, Selatan, Barat, Utara) & Naga",
    tiles: HONOR_TILES,
  },
  {
    key: "bonus",
    category: "bonus",
    title: "Bonus",
    description: "Bunga & Musim",
    tiles: BONUS_TILES,
  },
];

/** Jumlah total ubin dalam satu set standar (harus 144). */
export const TOTAL_TILE_COUNT: number = ALL_TILE_KINDS.reduce(
  (sum, tile) => sum + tile.copies,
  0,
);
