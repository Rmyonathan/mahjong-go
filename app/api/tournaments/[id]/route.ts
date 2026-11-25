import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { buildTournamentDetailPayload } from "@/lib/tournaments/tournament-detail"
import { parseTournamentSessionLogIds } from "@/lib/tournaments/session-log-ids"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const session = await getSessionUser()

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      panitiaUser: { select: { name: true } },
      wasitUser: { select: { name: true } },
      staff: { include: { user: { select: { name: true } } } },
      entries: { orderBy: [{ score: "desc" }, { playerName: "asc" }] },
      tables: {
        orderBy: [{ roundNumber: "asc" }, { tableNumber: "asc" }],
        include: {
          liveSession: { select: { id: true, status: true } },
        },
      },
      hands: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  const entryLookup = new Map(
    tournament.entries.map((entry) => [entry.id, entry]),
  )
  const myEntry = session
    ? tournament.entries.find((entry) => entry.userId === session.id)
    : undefined

  const tableNumberById = new Map(
    tournament.tables.map((table) => [table.id, table.tableNumber]),
  )

  const sessionIdSet = new Set<string>()
  for (const table of tournament.tables) {
    for (const sessionId of parseTournamentSessionLogIds(table.sessionLogIds)) {
      sessionIdSet.add(sessionId)
    }
  }
  const sessionRows =
    sessionIdSet.size > 0
      ? await prisma.gameSession.findMany({
          where: { id: { in: [...sessionIdSet] } },
          select: {
            id: true,
            title: true,
            status: true,
            startedAt: true,
            endedAt: true,
            _count: { select: { hands: true } },
          },
        })
      : []
  const sessionLogsById = new Map(sessionRows.map((row) => [row.id, row]))

  const detail = buildTournamentDetailPayload({
    tournament,
    entryLookup,
    tableNumberById,
    myEntryId: myEntry?.id ?? null,
    sessionLogsById,
  })

  return NextResponse.json({ tournament: detail })
}

/** Tournaments are permanent house records — no delete (use COMPLETED status later). */
export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "Tournaments cannot be deleted. Finish the event on the hub or leave it archived in the list.",
    },
    { status: 403 },
  )
}
