import { randomUUID } from "crypto"
import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/db"

export type EloSnapshotPoint = {
  id: string
  sessionId: string
  sessionTitle: string
  ratingBefore: number
  ratingAfter: number
  delta: number
  createdAt: string
}

let ensurePromise: Promise<void> | null = null

/**
 * Ensures `"PlayerEloSnapshot"` exists in Postgres matching `prisma/schema.prisma`.
 */
export function ensureEloSnapshotTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PlayerEloSnapshot" (
          "id" TEXT NOT NULL,
          "playerId" TEXT NOT NULL,
          "sessionId" TEXT NOT NULL,
          "sessionTitle" TEXT NOT NULL,
          "ratingBefore" INTEGER NOT NULL,
          "ratingAfter" INTEGER NOT NULL,
          "delta" INTEGER NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PlayerEloSnapshot_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "PlayerEloSnapshot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `)
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "PlayerEloSnapshot_playerId_sessionId_key"
        ON "PlayerEloSnapshot"("playerId", "sessionId");
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "PlayerEloSnapshot_playerId_createdAt_idx"
        ON "PlayerEloSnapshot"("playerId", "createdAt");
      `)
    })().catch((err) => {
      ensurePromise = null
      throw err
    })
  }
  return ensurePromise
}

export async function recordPlayerEloSnapshot(
  tx: Prisma.TransactionClient,
  input: {
    playerId: string
    sessionId: string
    sessionTitle: string
    ratingBefore: number
    ratingAfter: number
  },
) {
  const id = randomUUID()
  const delta = input.ratingAfter - input.ratingBefore
  await tx.$executeRaw`
    INSERT INTO "PlayerEloSnapshot" (
      "id",
      "playerId",
      "sessionId",
      "sessionTitle",
      "ratingBefore",
      "ratingAfter",
      "delta",
      "createdAt"
    )
    VALUES (
      ${id},
      ${input.playerId},
      ${input.sessionId},
      ${input.sessionTitle},
      ${input.ratingBefore},
      ${input.ratingAfter},
      ${delta},
      NOW()
    )
    ON CONFLICT ("playerId", "sessionId") DO NOTHING
  `
}

export async function getPlayerEloHistory(
  playerId: string,
): Promise<EloSnapshotPoint[]> {
  await ensureEloSnapshotTable()

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      sessionId: string
      sessionTitle: string
      ratingBefore: number
      ratingAfter: number
      delta: number
      createdAt: Date
    }>
  >`
    SELECT
      "id",
      "sessionId",
      "sessionTitle",
      "ratingBefore",
      "ratingAfter",
      "delta",
      "createdAt"
    FROM "PlayerEloSnapshot"
    WHERE "playerId" = ${playerId}
    ORDER BY "createdAt" ASC
    LIMIT 40
  `

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    sessionTitle: row.sessionTitle,
    ratingBefore: Number(row.ratingBefore),
    ratingAfter: Number(row.ratingAfter),
    delta: Number(row.delta),
    createdAt: new Date(row.createdAt).toISOString(),
  }))
}
