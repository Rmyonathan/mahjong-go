import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getPendingSessionInviteSummary } from "@/lib/session/invites"
import { getSessionManageState } from "@/lib/session/manage"
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
  const isSeated = session.seats.some((s) => s.userId === user.id)

  if (
    session.status === "LIVE" &&
    !isCaptain &&
    !tournamentWasit &&
    !isSeated
  ) {
    return NextResponse.json(
      {
        error:
          "Only seated players can view this live table — wait to be promoted from the waitlist",
      },
      { status: 403 },
    )
  }

  const [inviteSummary, manageState, waitlistRows] = await Promise.all([
    getPendingSessionInviteSummary(id),
    getSessionManageState(id),
    isCaptain && session.meetId
      ? prisma.booking.findMany({
          where: {
            meetId: session.meetId,
            status: { in: ["PENDING", "WAITLIST"] },
          },
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
          include: {
            user: {
              select: {
                id: true,
                name: true,
                player: { select: { nickname: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ])
  const isDesignatedScanner = manageState.scannerUserIds.includes(user.id)
  const waitlistQueue = waitlistRows.map((b) => ({
    bookingId: b.id,
    userId: b.userId,
    name: b.user.player?.nickname ?? b.user.name.split(" ")[0] ?? b.user.name,
    status: b.status,
  }))

  return NextResponse.json({
    session: {
      ...serializeSession(session, manageState),
      waitlistQueue,
    },
    pendingInvitesCount: inviteSummary.pendingCount,
    pendingInviteNames: inviteSummary.pendingNames,
    viewer: {
      id: user.id,
      name: user.name,
      role: user.role,
      isCaptain,
      canLogHands: isCaptain || tournamentWasit || isDesignatedScanner,
    },
  })
}
