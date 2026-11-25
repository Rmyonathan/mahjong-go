import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { buildDemoTournamentHands } from "@/lib/tournaments/demo-table-hands"
import { logTournamentHandViaSession } from "@/lib/tournaments/log-hand-via-session"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import { canAdministerTournament } from "@/lib/tournaments/staff"

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Simulate hands is disabled in production" },
      { status: 403 },
    )
  }

  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    tournamentId?: string
    tableId?: string
    count?: number
  }
  const tournamentId = body.tournamentId?.trim()
  const tableId = body.tableId?.trim()
  const count = body.count === 1 ? 1 : 4

  if (!tournamentId || !tableId) {
    return NextResponse.json(
      { error: "tournamentId and tableId required" },
      { status: 400 },
    )
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { staff: { select: { userId: true, role: true } } },
  })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }
  if (tournament.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Tournament completed" },
      { status: 400 },
    )
  }

  const staff = resolveTournamentStaff({
    panitiaUserId: tournament.panitiaUserId,
    wasitUserId: tournament.wasitUserId,
    staff: tournament.staff,
  })
  if (
    !canAdministerTournament(
      user.id,
      user.role,
      tournament.createdById,
      staff.panitiaUserIds,
    )
  ) {
    return NextResponse.json({ error: "Director only" }, { status: 403 })
  }

  const table = await prisma.tournamentTable.findFirst({
    where: { id: tableId, tournamentId },
  })
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 })
  }
  if (table.status === "FINISHED") {
    return NextResponse.json(
      { error: "Table finished — pick a live table in this round" },
      { status: 400 },
    )
  }

  const hands = buildDemoTournamentHands(count)
  let sessionId: string | null = null
  const logged: number[] = []

  try {
    for (let index = 0; index < hands.length; index++) {
      const result = await logTournamentHandViaSession({
        tournamentId,
        tableId,
        captainUserId: user.id,
        hand: hands[index]!,
      })
      sessionId = result.sessionId
      logged.push(index + 1)
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Simulate failed"
    return NextResponse.json(
      { error: message, logged, sessionId },
      { status: 400 },
    )
  }

  return NextResponse.json({
    sessionId,
    handsLogged: logged.length,
    tableRound: table.roundNumber,
  })
}