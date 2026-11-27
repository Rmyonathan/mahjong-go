import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT, ADD COLUMN IF NOT EXISTS "frameId" TEXT NOT NULL DEFAULT 'classic';`,
  )
  console.log("[startup] Player avatar/frame columns verified")
} catch (error) {
  console.error("[startup] Could not verify Player columns:", error)
} finally {
  await prisma.$disconnect()
}
