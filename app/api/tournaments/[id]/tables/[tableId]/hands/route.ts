import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  logTournamentHand,
  type TournamentLogHandInput,
} from "@/lib/tournaments/tournament-hand-service"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import { canLogTournamentHands } from "@/lib/tournaments/staff"

interface Params {
  params: Promise<{ id: string; tableId: string }>
}

export async function POST(request: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }
  const { id: tournamentId, tableId } = await params

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { staff: { select: { userId: true, role: true } } },
  })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
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
  const body = (await request.json()) as Partial<TournamentLogHandInput> & {
    method?: TournamentLogHandInput["method"]
  }

  const method = body.method ?? "discard"
  const isDraw = method === "draw" || body.winnerSeatIndex === -1

  try {
    const hand = await logTournamentHand(tournamentId, tableId, {
      winnerSeatIndex: isDraw ? -1 : Number(body.winnerSeatIndex),
      method: isDraw ? "draw" : method,
      dealtBySeatIndex:
        body.dealtBySeatIndex == null ? null : Number(body.dealtBySeatIndex),
      points: Number(body.points) || 0,
      totalFan:
        body.totalFan == null ? undefined : Number(body.totalFan),
      combos: Array.isArray(body.combos) ? body.combos : [],
      tileIds: Array.isArray(body.tileIds) ? body.tileIds : [],
      winningTileId: body.winningTileId ?? "",
      deltas: Array.isArray(body.deltas) ? body.deltas : undefined,
    })
    return NextResponse.json({ hand })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not log hand"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}