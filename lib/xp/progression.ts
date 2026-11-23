import {
  EXPERIENCE_LEVELS,
  type ExperienceLevel,
  type ExperienceLevelId,
} from "@/lib/mock/jade-data"
import {
  EXPERIENCE_BANDS,
  type ExperienceBand,
} from "@/lib/mock/jade-levels"

/** EDIT HERE — XP needed to advance one LV (1→100). */
export const XP_PER_LEVEL = 25

export type XpProgress = {
  xp: number
  level: number
  band: ExperienceBand
  /** Legacy 5-tier id stored on Player.experienceLevelId */
  experienceLevelId: ExperienceLevelId
  experienceLevel: ExperienceLevel
  xpIntoLevel: number
  xpForNextLevel: number
  /** 0–100 within current LV; 100 at LV 100. */
  pctToNext: number
  nextBand: ExperienceBand | null
  xpToNextBand: number | null
}

export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp))
  return Math.min(100, Math.floor(safe / XP_PER_LEVEL) + 1)
}

export function xpFloorForLevel(level: number): number {
  const lv = Math.min(100, Math.max(1, level))
  return (lv - 1) * XP_PER_LEVEL
}

export function bandFromLevel(level: number): ExperienceBand {
  const lv = Math.min(100, Math.max(1, level))
  return (
    EXPERIENCE_BANDS.find(
      (band) => lv >= band.minLevel && lv <= band.maxLevel,
    ) ?? EXPERIENCE_BANDS[0]!
  )
}

/** Map LV → existing seed/UI tier ids (pemula → master). */
export function experienceLevelIdFromLevel(level: number): ExperienceLevelId {
  const lv = Math.min(100, Math.max(1, level))
  if (lv >= 81) return "master"
  if (lv >= 61) return "ahli"
  if (lv >= 41) return "mahir"
  if (lv >= 21) return "menengah"
  return "pemula"
}

export function experienceLevelFromId(id: string): ExperienceLevel {
  return (
    EXPERIENCE_LEVELS.find((level) => level.id === id) ??
    EXPERIENCE_LEVELS[EXPERIENCE_LEVELS.length - 1]!
  )
}

export function getXpProgress(xp: number): XpProgress {
  const level = levelFromXp(xp)
  const band = bandFromLevel(level)
  const experienceLevelId = experienceLevelIdFromLevel(level)
  const floor = xpFloorForLevel(level)
  const nextFloor = level >= 100 ? floor : xpFloorForLevel(level + 1)
  const xpIntoLevel = Math.max(0, Math.floor(xp) - floor)
  const xpForNextLevel = Math.max(1, nextFloor - floor)
  const pctToNext =
    level >= 100
      ? 100
      : Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))

  const nextBand =
    EXPERIENCE_BANDS.find((b) => b.minLevel === band.maxLevel + 1) ?? null
  const xpToNextBand = nextBand
    ? Math.max(0, xpFloorForLevel(nextBand.minLevel) - Math.floor(xp))
    : null

  return {
    xp: Math.max(0, Math.floor(xp)),
    level,
    band,
    experienceLevelId,
    experienceLevel: experienceLevelFromId(experienceLevelId),
    xpIntoLevel,
    xpForNextLevel,
    pctToNext,
    nextBand,
    xpToNextBand,
  }
}

/** Derive house experience badge from XP (not games / seed). */
export function experienceFromXp(xp: number): ExperienceLevel {
  return getXpProgress(xp).experienceLevel
}
