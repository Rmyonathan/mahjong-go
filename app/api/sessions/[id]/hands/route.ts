import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import {
  getGameSession,
  logHand,
  serializeSession,
  type LogHandInput,
} from "@/lib/session/service"
import { userCanLogLinkedTournamentSession } from "@/lib/tournaments/session-access"
import { syncTournamentHandFromSession } from "@/lib/tournaments/sync-session-hand"

type HandBody = Partial<LogHandInput> & {
  method?: LogHandInput["method"]
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await getGameSession(id)
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const isCaptain = user.id === existing.captainUserId
  const isAdmin = user.role === "ADMIN"
  const tournamentWasit = await userCanLogLinkedTournamentSession(
    user.id,
    user.role,
    existing.tournamentTableId,
  )
  if (!isCaptain && !isAdmin && !tournamentWasit) {
    return NextResponse.json(
      { error: "Only the table captain or tournament wasit can log hands" },
      { status: 403 },
    )
  }

  const body = (await request.json()) as HandBody
  const method = body.method ?? "discard"
  const isDraw = method === "draw" || body.winnerSeatIndex === -1

  try {
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
      demoHandId: body.demoHandId,
    }
    await logHand(id, handInput)
    if (existing.tournamentTableId) {
      await syncTournamentHandFromSession(
        existing.tournamentTableId,
        handInput,
      )
    }
    const session = await getGameSession(id)
    return NextResponse.json({
      session: session ? serializeSession(session) : null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not log hand"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
