export interface ExperienceBand {
  id: string
  levelRange: string
  title: string
  minLevel: number
  maxLevel: number
  summary: string
}

export interface SkillTierBand {
  id: string
  name: string
  minRating: number
  maxRating: number | null
  rangeLabel: string
  icon: "diamond" | "chevron" | "bar" | "star" | "square" | "ring" | "leaf"
  summary: string
}

/** Lifetime progression bands shown on /levels. */
export const EXPERIENCE_BANDS: ExperienceBand[] = [
  {
    id: "novice",
    levelRange: "LV 1–10",
    title: "Novice",
    minLevel: 1,
    maxLevel: 10,
    summary: "Baru duduk. Empat angin masih dihafal.",
  },
  {
    id: "apprentice",
    levelRange: "LV 11–20",
    title: "Apprentice",
    minLevel: 11,
    maxLevel: 20,
    summary: "Sudah ikut sesi penuh tanpa hilang arah.",
  },
  {
    id: "challenger",
    levelRange: "LV 21–30",
    title: "Challenger",
    minLevel: 21,
    maxLevel: 30,
    summary: "Mulai membaca meja, bukan hanya tangan sendiri.",
  },
  {
    id: "veteran",
    levelRange: "LV 31–40",
    title: "Veteran",
    minLevel: 31,
    maxLevel: 40,
    summary: "Pung dan chow tenang. Jarang panik di discard.",
  },
  {
    id: "master",
    levelRange: "LV 41–50",
    title: "Master",
    minLevel: 41,
    maxLevel: 50,
    summary: "Dua ratusan meja. Membaca angin sebelum ubin jatuh.",
  },
  {
    id: "grandmaster",
    levelRange: "LV 51–60",
    title: "Grandmaster",
    minLevel: 51,
    maxLevel: 60,
    summary: "Poin musim digeser dengan tangan yang sama tenang.",
  },
  {
    id: "legend",
    levelRange: "LV 61–70",
    title: "Legend",
    minLevel: 61,
    maxLevel: 70,
    summary: "Nama yang disebut sebelum kursi diisi.",
  },
  {
    id: "golden-dragon",
    levelRange: "LV 71–80",
    title: "Golden Dragon",
    minLevel: 71,
    maxLevel: 80,
    summary: "Naga emas meja Lampung. Jarang kalah tanpa alasan.",
  },
  {
    id: "celestial",
    levelRange: "LV 81–90",
    title: "Celestial",
    minLevel: 81,
    maxLevel: 90,
    summary: "Hampir di atas atap kedai. Masih ikut skor mingguan.",
  },
  {
    id: "jade-immortal",
    levelRange: "LV 91–100",
    title: "Jade Immortal",
    minLevel: 91,
    maxLevel: 100,
    summary: "Stempel tertinggi rumah. Immortal di buku Jade.",
  },
]

/** Elo-style skill rating. New players start at 1400. */
export const SKILL_RATING_TIERS: SkillTierBand[] = [
  {
    id: "imperial",
    name: "Imperial",
    minRating: 2300,
    maxRating: null,
    rangeLabel: "2300+",
    icon: "star",
    summary: "Puncak papan. Hampir tidak ada ruang salah buang.",
  },
  {
    id: "jade",
    name: "Jade",
    minRating: 1950,
    maxRating: 2299,
    rangeLabel: "1950–2299",
    icon: "diamond",
    summary: "Inti hijau rumah. Meja sulit dibuka tanpa mereka.",
  },
  {
    id: "platinum",
    name: "Platinum",
    minRating: 1700,
    maxRating: 1949,
    rangeLabel: "1700–1949",
    icon: "chevron",
    summary: "Stabil di atas rata-rata. Sering jadi ancaman di akhir sesi.",
  },
  {
    id: "gold",
    name: "Gold",
    minRating: 1500,
    maxRating: 1699,
    rangeLabel: "1500–1699",
    icon: "ring",
    summary: "Di atas titik awal. Mulai menggeser rating tiap minggu.",
  },
  {
    id: "silver",
    name: "Silver",
    minRating: 1350,
    maxRating: 1499,
    rangeLabel: "1350–1499",
    icon: "bar",
    summary: "Zona awal. Termasuk pemain baru di 1400.",
  },
  {
    id: "bronze",
    name: "Bronze",
    minRating: 1200,
    maxRating: 1349,
    rangeLabel: "1200–1349",
    icon: "square",
    summary: "Masih belajar membaca discard lawan.",
  },
  {
    id: "wood",
    name: "Wood",
    minRating: 0,
    maxRating: 1199,
    rangeLabel: "0–1199",
    icon: "leaf",
    summary: "Fondasi meja. Rating bisa naik cepat dengan sesi rutin.",
  },
]

export const SKILL_START_RATING = 1400

export const SKILL_SUBRANKS = ["I", "II", "III"] as const
