import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import { getPendingSessionInviteSummary } from "@/lib/session/invites"
import { getGameSession, serializeSession } from "@/lib/session/service"
import { userCanLogLinkedTournamentSession } from "@/lib/tournaments/session-access"

export async function GET(
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
  const session = await getGameSession(id)
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const tournamentWasit = await userCanLogLinkedTournamentSession(
    user.id,
    user.role,
    session.tournamentTableId,
  )
  const isCaptain =
    user.id === session.captainUserId || user.role === "ADMIN"
  const inviteSummary = await getPendingSessionInviteSummary(id)

  return NextResponse.json({
    session: serializeSession(session),
    pendingInvitesCount: inviteSummary.pendingCount,
    pendingInviteNames: inviteSummary.pendingNames,
    viewer: {
      id: user.id,
      name: user.name,
      role: user.role,
      isCaptain,
      canLogHands: isCaptain || tournamentWasit,
    },
  })
}
