import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { LogHandInput } from "@/lib/session/service"
import { logTournamentHandViaSession } from "@/lib/tournaments/log-hand-via-session"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import { canLogTournamentHands } from "@/lib/tournaments/staff"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json()) as Partial<LogHandInput> & {
    tournamentId?: string
    tableId?: string
    method?: LogHandInput["method"]
    totalFan?: number
  }
  const tournamentId = body.tournamentId?.trim()
  const tableId = body.tableId?.trim()
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
      { error: "Tournament completed — view session ledger only" },
      { status: 400 },
    )
  }

  const staff = resolveTournamentStaff({
    panitiaUserId: tournament.panitiaUserId,
    wasitUserId: tournament.wasitUserId,
    staff: tournament.staff,
  })
  if (
    !canLogTournamentHands(user.id, user.role, {
      createdById: tournament.createdById,
      panitiaUserIds: staff.panitiaUserIds,
      wasitUserIds: staff.wasitUserIds,
    })
  ) {
    return NextResponse.json({ error: "Wasit or admin only" }, { status: 403 })
  }

  const method = body.method ?? "discard"
  const isDraw = method === "draw" || body.winnerSeatIndex === -1

  const handInput: LogHandInput = {
    winnerSeatIndex: isDraw ? -1 : Number(body.winnerSeatIndex),
    method: isDraw ? "draw" : method,
    dealtBySeatIndex:
      body.dealtBySeatIndex == null ? null : Number(body.dealtBySeatIndex),
    points: Number(body.points) || 0,
    combos: Array.isArray(body.combos) ? body.combos : [],
    tileIds: Array.isArray(body.tileIds) ? body.tileIds : [],
    winningTileId: body.winningTileId ?? "",
    deltas: Array.isArray(body.deltas) ? body.deltas : undefined,
  }

  try {
    const result = await logTournamentHandViaSession({
      tournamentId,
      tableId,
      captainUserId: user.id,
      hand: handInput,
    })
    return NextResponse.json({
      hand: result.tournamentHand,
      sessionId: result.sessionId,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not log hand"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}