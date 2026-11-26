import { randomUUID } from "crypto"

import { prisma } from "@/lib/db"

export type NotificationItem = {
  id: string
  kind: string
  title: string
  body: string
  href: string | null
  readAt: string | null
  createdAt: string
}

let ensurePromise: Promise<void> | null = null

export function ensureNotificationTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PlayerNotification" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "kind" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "body" TEXT NOT NULL,
          "href" TEXT,
          "readAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PlayerNotification_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "PlayerNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "PlayerNotification_userId_readAt_createdAt_idx"
        ON "PlayerNotification"("userId", "readAt", "createdAt");
      `)
    })().catch((err) => {
      ensurePromise = null
      throw err
    })
  }
  return ensurePromise
}

export async function createPlayerNotification(input: {
  userId: string
  kind: "STREAK" | "BIG_HAND" | "RANK_UP" | "MENTOR"
  title: string
  body: string
  href?: string | null
}) {
  await ensureNotificationTable()
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "PlayerNotification" (
      "id",
      "userId",
      "kind",
      "title",
      "body",
      "href",
      "createdAt"
    )
    VALUES (
      ${id},
      ${input.userId},
      ${input.kind},
      ${input.title},
      ${input.body},
      ${input.href ?? null},
      NOW()
    )
  `
  return id
}

export async function hasNotificationTitle(userId: string, title: string) {
  await ensureNotificationTable()
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "PlayerNotification"
    WHERE "userId" = ${userId} AND "title" = ${title}
    LIMIT 1
  `
  return rows.length > 0
}

export async function listNotificationsForUser(userId: string): Promise<{
  notifications: NotificationItem[]
  unreadCount: number
}> {
  await ensureNotificationTable()

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      kind: string
      title: string
      body: string
      href: string | null
      readAt: Date | null
      createdAt: Date
    }>
  >`
    SELECT "id", "kind", "title", "body", "href", "readAt", "createdAt"
    FROM "PlayerNotification"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
    LIMIT 15
  `

  const notifications = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    href: r.href,
    readAt: r.readAt ? new Date(r.readAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
  }))

  const unreadCount = notifications.filter((n) => !n.readAt).length
  return { notifications, unreadCount }
}

export async function markNotificationsRead(userId: string, id?: string) {
  await ensureNotificationTable()
  if (id) {
    await prisma.$executeRaw`
      UPDATE "PlayerNotification"
      SET "readAt" = NOW()
      WHERE "id" = ${id} AND "userId" = ${userId} AND "readAt" IS NULL
    `
  } else {
    await prisma.$executeRaw`
      UPDATE "PlayerNotification"
      SET "readAt" = NOW()
      WHERE "userId" = ${userId} AND "readAt" IS NULL
    `
  }
}
