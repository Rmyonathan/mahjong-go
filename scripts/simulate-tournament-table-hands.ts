/**
 * Dev-only: log 4 hands on ONE tournament table (current round), not a full bracket.
 *
 * npx tsx scripts/simulate-tournament-table-hands.ts
 * npx tsx scripts/simulate-tournament-table-hands.ts <tournamentId> <tableId>
 * npx tsx scripts/simulate-tournament-table-hands.ts --finish   (end session after 4 hands)
 */
import "dotenv/config"

import { PrismaClient } from "@prisma/client"

import { buildDemoTournamentHands } from "../lib/tournaments/demo-table-hands"
import { logTournamentHandViaSession } from "../lib/tournaments/log-hand-via-session"
import { finishGameSession } from "../lib/session/service"

const prisma = new PrismaClient()

async function ensureQuickTable(adminId: string) {
  const tournament = await prisma.tournament.create({
    data: {
      title: "KO table sim",
      subtitle: "4 hands · one table",
      format: "KNOCKOUT",
      status: "LIVE",
      entryFeeIdr: 50_000,
      prizePoolText: "Test only",
      maxPlayers: 4,
      koAdvancePerTable: 2,
      currentRound: 1,
      createdById: adminId,
    },
  })

  const names = ["Sim East", "Sim South", "Sim West", "Sim North"]
  const entries = []
  for (const playerName of names) {
    entries.push(
      await prisma.tournamentEntry.create({
        data: {
          tournamentId: tournament.id,
          playerName,
          status: "ACTIVE",
        },
      }),
    )
  }

  const table = await prisma.tournamentTable.create({
    data: {
      tournamentId: tournament.id,
      roundNumber: 1,
      tableNumber: 1,
      isKnockoutMatch: true,
      status: "LIVE",
      seat1EntryId: entries[0]!.id,
      seat2EntryId: entries[1]!.id,
      seat3EntryId: entries[2]!.id,
      seat4EntryId: entries[3]!.id,
    },
  })

  return { tournament, table }
}

async function main() {
  const args = process.argv.slice(2)
  const finishAfter = args.includes("--finish")
  const filtered = args.filter((a) => a !== "--finish")

  const admin = await prisma.user.findFirst({
    where: { email: "admin@jade.local" },
    select: { id: true },
  })
  if (!admin) throw new Error("Run npm run db:seed first (admin@jade.local)")

  let tournamentId = filtered[0]
  let tableId = filtered[1]

  if (!tournamentId || !tableId) {
    const quick = await ensureQuickTable(admin.id)
    tournamentId = quick.tournament.id
    tableId = quick.table.id
    console.log("Created quick KO (1 table, 4 players):", tournamentId)
  } else {
    const table = await prisma.tournamentTable.findFirst({
      where: { id: tableId, tournamentId },
    })
    if (!table) throw new Error("Table not found for that tournament")
    if (table.status === "FINISHED") {
      throw new Error(
        "Table is FINISHED — use a LIVE table in the current round",
      )
    }
  }

  let sessionId: string | null = null

  const demoHands = buildDemoTournamentHands(4)
  for (let index = 0; index < demoHands.length; index++) {
    const hand = demoHands[index]!
    const result = await logTournamentHandViaSession({
      tournamentId,
      tableId,
      captainUserId: admin.id,
      hand,
    })
    sessionId = result.sessionId
    console.log(
      `Hand ${index + 1}/4 · winner seat ${hand.winnerSeatIndex + 1} · session ${sessionId}`,
    )
  }

  if (finishAfter && sessionId) {
    await finishGameSession(sessionId)
    console.log("Session finished — view at /session/" + sessionId)
  } else if (sessionId) {
    console.log("Session still live — /session/live?id=" + sessionId)
  }

  const hub = `http://localhost:3000/tournaments/${tournamentId}?tab=tables`
  console.log("\nOpen hub:", hub)
  console.log("Sessions & hands tab shows full /session/ ledger for this table.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => void prisma.$disconnect())