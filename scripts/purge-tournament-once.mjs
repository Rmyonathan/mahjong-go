import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const title = process.argv[2] ?? "test"
const prisma = new PrismaClient()

const rows = await prisma.tournament.findMany({
  where: { title },
  select: {
    id: true,
    title: true,
    subtitle: true,
    currentRound: true,
    status: true,
    _count: { select: { entries: true, tables: true, hands: true } },
  },
})

if (rows.length === 0) {
  console.log(`No tournament with title "${title}"`)
  await prisma.$disconnect()
  process.exit(0)
}

console.log("Will delete:", rows)

for (const row of rows) {
  const sessionIds = await prisma.gameSession.findMany({
    where: { tournamentTable: { tournamentId: row.id } },
    select: { id: true },
  })
  if (sessionIds.length > 0) {
    await prisma.gameSession.updateMany({
      where: { id: { in: sessionIds.map((s) => s.id) } },
      data: { tournamentTableId: null },
    })
    console.log(`Unlinked ${sessionIds.length} live session(s)`)
  }

  await prisma.tournament.delete({ where: { id: row.id } })
  console.log(`Deleted tournament ${row.id} (${row.title})`)
}

await prisma.$disconnect()