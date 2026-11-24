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

/**
 * EDIT HERE — house XP band titles (shown as LV · Title on dashboard).
 * Indonesian / Jade house names — not generic English game ranks.
 */
export const EXPERIENCE_BANDS: ExperienceBand[] = [
  {
    id: "pemula",
    levelRange: "LV 1–10",
    title: "Pemula",
    minLevel: 1,
    maxLevel: 10,
    summary: "Baru duduk. Empat angin masih dihafal.",
  },
  {
    id: "tangan-baru",
    levelRange: "LV 11–20",
    title: "Tangan Baru",
    minLevel: 11,
    maxLevel: 20,
    summary: "Sudah ikut sesi penuh tanpa hilang arah.",
  },
  {
    id: "new-ink",
    levelRange: "LV 21–30",
    title: "New Ink",
    minLevel: 21,
    maxLevel: 30,
    summary: "Tinta baru di buku skor — mulai baca meja, bukan hanya tangan.",
  },
  {
    id: "menengah",
    levelRange: "LV 31–40",
    title: "Menengah",
    minLevel: 31,
    maxLevel: 40,
    summary: "Pung dan chow tenang. Jarang panik di discard.",
  },
  {
    id: "mahir",
    levelRange: "LV 41–50",
    title: "Mahir",
    minLevel: 41,
    maxLevel: 50,
    summary: "Dua ratusan meja. Membaca angin sebelum ubin jatuh.",
  },
  {
    id: "ahli",
    levelRange: "LV 51–60",
    title: "Ahli",
    minLevel: 51,
    maxLevel: 60,
    summary: "Poin musim digeser dengan tangan yang sama tenang.",
  },
  {
    id: "master-meja",
    levelRange: "LV 61–70",
    title: "Master Meja",
    minLevel: 61,
    maxLevel: 70,
    summary: "Nama yang disebut sebelum kursi diisi.",
  },
  {
    id: "naga-emas",
    levelRange: "LV 71–80",
    title: "Naga Emas",
    minLevel: 71,
    maxLevel: 80,
    summary: "Naga emas meja Lampung. Jarang kalah tanpa alasan.",
  },
  {
    id: "atap-kedai",
    levelRange: "LV 81–90",
    title: "Atap Kedai",
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

/** I = top third of the band, III = bottom third. */
export const SKILL_SUBRANKS = ["I", "II", "III"] as const
export type SkillSubrank = (typeof SKILL_SUBRANKS)[number]

export type SkillRatingProgress = {
  rating: number
  tier: SkillTierBand
  subrank: SkillSubrank
  /** e.g. "Silver II" */
  label: string
}

/** Resolve Elo band + I/II/III from a skill rating. */
export function skillBandFromRating(rating: number): SkillRatingProgress {
  const safe = Math.max(0, Math.floor(rating))
  const tier =
    SKILL_RATING_TIERS.find((band) => {
      if (safe < band.minRating) return false
      if (band.maxRating == null) return true
      return safe <= band.maxRating
    }) ?? SKILL_RATING_TIERS[SKILL_RATING_TIERS.length - 1]!

  // Closed bands: top third → I. Open Imperial: 2300–2399 III, 2400–2499 II, 2500+ I.
  const ceiling =
    tier.maxRating == null ? tier.minRating + 299 : tier.maxRating
  const span = Math.max(1, ceiling - tier.minRating + 1)
  const offset = Math.max(0, safe - tier.minRating)
  const third = span / 3
  let subrank: SkillSubrank = "III"
  if (tier.maxRating == null && safe >= tier.minRating + 200) subrank = "I"
  else if (tier.maxRating == null && safe >= tier.minRating + 100) subrank = "II"
  else if (offset >= span - third) subrank = "I"
  else if (offset >= span - 2 * third) subrank = "II"

  return {
    rating: safe,
    tier,
    subrank,
    label: `${tier.name} ${subrank}`,
  }
}

/** Board / profile stamp from Elo (not season Raja Meja points). */
export function eloStampFromRating(rating: number): {
  id: string
  name: string
  summary: string
} {
  const elo = skillBandFromRating(rating)
  return {
    id: elo.tier.id,
    name: elo.label,
    summary: elo.tier.summary,
  }
}
