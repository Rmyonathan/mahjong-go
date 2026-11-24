/**
 * Definisi tipe (TypeScript) untuk seluruh 144 ubin Mahjong.
 *
 * Total ubin standar = 144:
 *  - 108 ubin sederhana (3 jenis suit x 9 nilai x 4 salinan)
 *  - 28 ubin kehormatan (4 Angin x 4 + 3 Naga x 4)
 *  - 8 ubin bonus (4 Bunga + 4 Musim, masing-masing 1 salinan)
 */

/** Kategori tertinggi sebuah ubin. */
export type TileCategory = "suit" | "honor" | "bonus";

// ---------------------------------------------------------------------------
// SUIT (ubin sederhana bernomor 1–9)
// ---------------------------------------------------------------------------

/**
 * Tiga jenis suit dasar.
 * - `dots`      : Bulatan / Lingkaran (Tong / Pin)
 * - `bamboo`    : Bambu (Sok / Sou)
 * - `characters`: Karakter / Angka (Wan / Man)
 */
export type SuitType = "dots" | "bamboo" | "characters";

/** Nilai valid untuk ubin suit (1 sampai 9). */
export type SuitValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Ubin suit sederhana yang bernomor. */
export interface SuitTile {
  category: "suit";
  suit: SuitType;
  value: SuitValue;
}

// ---------------------------------------------------------------------------
// HONOR (Angin & Naga — tidak bernomor)
// ---------------------------------------------------------------------------

/** Jenis ubin kehormatan. */
export type HonorType = "wind" | "dragon";

/** Empat arah Angin. */
export type WindType = "east" | "south" | "west" | "north";

/**
 * Tiga jenis Naga.
 * - `red`   : Naga Merah (Zhong)
 * - `green` : Naga Hijau (Fa)
 * - `white` : Naga Putih (Bai)
 */
export type DragonType = "red" | "green" | "white";

/** Ubin Angin (Timur, Selatan, Barat, Utara). */
export interface WindTile {
  category: "honor";
  honor: "wind";
  wind: WindType;
}

/** Ubin Naga (Merah, Hijau, Putih). */
export interface DragonTile {
  category: "honor";
  honor: "dragon";
  dragon: DragonType;
}

/** Gabungan seluruh ubin kehormatan. */
export type HonorTile = WindTile | DragonTile;

// ---------------------------------------------------------------------------
// BONUS (Bunga & Musim — hanya 1 salinan tiap ubin)
// ---------------------------------------------------------------------------

/** Jenis ubin bonus. */
export type BonusType = "flower" | "season";

/**
 * Empat Bunga, biasanya dipasangkan dengan kursi pemain 1–4.
 * (Plum, Anggrek, Krisan, Bambu)
 */
export type FlowerType = "plum" | "orchid" | "chrysanthemum" | "bamboo";

/**
 * Empat Musim, biasanya dipasangkan dengan kursi pemain 1–4.
 * (Semi, Panas, Gugur, Dingin)
 */
export type SeasonType = "spring" | "summer" | "autumn" | "winter";

/** Ubin Bunga. */
export interface FlowerTile {
  category: "bonus";
  bonus: "flower";
  flower: FlowerType;
  /** Nomor kursi terkait (1 = Timur ... 4 = Utara). */
  seat: 1 | 2 | 3 | 4;
}

/** Ubin Musim. */
export interface SeasonTile {
  category: "bonus";
  bonus: "season";
  season: SeasonType;
  /** Nomor kursi terkait (1 = Timur ... 4 = Utara). */
  seat: 1 | 2 | 3 | 4;
}

/** Gabungan seluruh ubin bonus. */
export type BonusTile = FlowerTile | SeasonTile;

// ---------------------------------------------------------------------------
// TILE — union diskriminasi dari semua ubin
// ---------------------------------------------------------------------------

/**
 * Identitas "jenis" sebuah ubin (tanpa memperhatikan salinan/instans).
 * Contoh: `dots-5`, `wind-east`, `dragon-red`, `flower-plum`.
 */
export type TileKind = SuitTile | HonorTile | BonusTile;

/**
 * Sebuah ubin konkret dengan metadata tampilan.
 *
 * `id` adalah kunci deterministik & unik untuk sebuah *jenis* ubin
 * (mis. `dots-5`). Untuk instans unik di dalam tangan pemain gunakan
 * `instanceId` agar drag-and-drop dan React key tetap stabil.
 */
export type Tile = TileKind & {
  /** Kunci jenis ubin yang unik & deterministik, mis. `"dots-5"`. */
  id: string;
  /** Karakter Unicode Mahjong untuk render, mis. `"🀝"`. */
  glyph: string;
  /** Label ramah-pengguna dalam Bahasa Indonesia, mis. `"5 Bulatan"`. */
  label: string;
  /** Jumlah salinan ubin ini dalam satu set standar (4 untuk suit/honor, 1 untuk bonus). */
  copies: 1 | 4;
  // Nama berkas foto ubin di `public/tiles`, mis. `"5 Bulat.jpeg"`.
  imagePath: string;
};

/** Ubin yang berada di dalam tangan pemain — punya id instans unik. */
export type HandTile = Tile & {
  /** Id unik per instans (berbeda walau `id` jenisnya sama). */
  instanceId: string;
};

// ---------------------------------------------------------------------------
// VARIAN ATURAN & KELOMPOK (untuk mesin skor)
// ---------------------------------------------------------------------------

/**
 * Varian hitungan meja Jade (Phase 1 — dua preset saja).
 * - `chicken`  : Chicken Hand — menang 0 Faan diizinkan
 * - `jade-hk`  : Jade HK Modified — min 1 Faan, catalog resmi §5
 */
export type RuleVariant = "chicken" | "jade-hk";

/** @deprecated Legacy ids — map with rulesetFromDb() */
export type LegacyRuleVariant = "hong-kong-old-style" | "hokkien";

// ---------------------------------------------------------------------------
// KONTEKS PERMAINAN (Angin — environment state)
// ---------------------------------------------------------------------------

/** Empat arah Angin (versi label bahasa Inggris untuk konteks permainan). */
export type Wind = "East" | "South" | "West" | "North";

/** Konteks permainan yang mempengaruhi perhitungan skor. */
export interface GameContext {
  /** Angin kursi pemain. */
  seatWind: Wind;
  /** Angin ronde yang sedang berjalan. */
  roundWind: Wind;
}

/**
 * Pemetaan Angin ke nomor kursi (1 = Timur ... 4 = Utara),
 * dipakai untuk mencocokkan ubin Bunga/Musim milik pemain.
 */
export const WIND_TO_SEAT: Record<Wind, 1 | 2 | 3 | 4> = {
  East: 1,
  South: 2,
  West: 3,
  North: 4,
};

/** Jenis kombinasi (meld) dalam sebuah tangan. */
export type MeldType =
  | "chow" // urutan 3 ubin berurutan (mis. 3-4-5 bulatan)
  | "pung" // 3 ubin identik
  | "kong" // 4 ubin identik
  | "pair" // 2 ubin identik (mata)
  | "eyes"; // sinonim untuk pair (mata)

/** Sebuah kombinasi ubin di dalam tangan. */
export interface Meld {
  type: MeldType;
  tiles: Tile[];
  /** `true` jika kombinasi diambil/dibuka dari buangan pemain lain. */
  open: boolean;
  /** `true` jika kong disembunyikan (concealed kong). */
  concealed?: boolean;
}
