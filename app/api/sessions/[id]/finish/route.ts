import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import {
  finishGameSession,
  getGameSession,
  serializeSession,
} from "@/lib/session/service"
import { userCanLogLinkedTournamentSession } from "@/lib/tournaments/session-access"

export async function POST(
  _request: Request,
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
      {
        error:
          existing.tournamentTableId
            ? "Only wasit or table captain can end this tournament table log"
            : "Only the table captain can finish the session",
      },
      { status: 403 },
    )
  }

  try {
    const tournamentId =
      existing.tournamentTable?.tournamentId ?? null
    const session = await finishGameSession(id)
    return NextResponse.json({
      session: serializeSession(session),
      tournamentId,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not finish session"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
