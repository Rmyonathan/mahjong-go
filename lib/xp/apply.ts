import type { PrismaClient, Player } from "@prisma/client"

import { prisma } from "@/lib/db"
import {
  experienceLevelIdFromLevel,
  getXpProgress,
  levelFromXp,
} from "@/lib/xp/progression"

type DbClient = PrismaClient | Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>

/**
 * Increment XP and sync experienceLevelId to the XP→LV band curve.
 */
export async function applyPlayerXpGain(
  playerId: string,
  amount: number,
  db: DbClient = prisma,
): Promise<Player | null> {
  const current = await db.player.findUnique({ where: { id: playerId } })
  if (!current) return null

  if (amount <= 0) {
    const nextId = experienceLevelIdFromLevel(levelFromXp(current.experienceXp))
    if (nextId === current.experienceLevelId) return current
    return db.player.update({
      where: { id: playerId },
      data: { experienceLevelId: nextId },
    })
  }

  const nextXp = current.experienceXp + amount
  const nextLevelId = experienceLevelIdFromLevel(levelFromXp(nextXp))

  return db.player.update({
    where: { id: playerId },
    data: {
      experienceXp: nextXp,
      experienceLevelId: nextLevelId,
    },
  })
}

/** Recompute experienceLevelId from current XP (backfill / repair). */
export async function syncPlayerExperienceFromXp(playerId: string) {
  const player = await prisma.player.findUnique({ where: { id: playerId } })
  if (!player) return null
  const progress = getXpProgress(player.experienceXp)
  if (player.experienceLevelId === progress.experienceLevelId) {
    return { player, progress, changed: false as const }
  }
  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { experienceLevelId: progress.experienceLevelId },
  })
  return { player: updated, progress, changed: true as const }
}

export async function syncAllPlayersExperienceFromXp() {
  const players = await prisma.player.findMany({
    select: { id: true, experienceXp: true, experienceLevelId: true },
  })
  let updated = 0
  for (const player of players) {
    const nextId = experienceLevelIdFromLevel(levelFromXp(player.experienceXp))
    if (nextId !== player.experienceLevelId) {
      await prisma.player.update({
        where: { id: player.id },
        data: { experienceLevelId: nextId },
      })
      updated += 1
    }
  }
  return { scanned: players.length, updated }
}
