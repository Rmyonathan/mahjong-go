import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
try {
  await prisma.tournament.findMany({
    take: 1,
    include: { hands: true, entries: true, tables: true },
  })
  console.log("ok")
} catch (e) {
  console.error("ERR", e.message)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}