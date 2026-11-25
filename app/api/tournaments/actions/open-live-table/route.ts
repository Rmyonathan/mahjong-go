import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { openTournamentTableLive } from "@/lib/tournaments/open-live-table"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import { canLogTournamentHands } from "@/lib/tournaments/staff"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    tournamentId?: string
    tableId?: string
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
    include: {
      staff: { select: { userId: true, role: true } },
    },
  })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  const staff = resolveTournamentStaff({
    panitiaUserId: tournament.panitiaUserId,
    wasitUserId: tournament.wasitUserId,
    staff: tournament.staff,
  })

  const allowed = canLogTournamentHands(user.id, user.role, {
    createdById: tournament.createdById,
    panitiaUserIds: staff.panitiaUserIds,
    wasitUserIds: staff.wasitUserIds,
  })
  if (!allowed) {
    return NextResponse.json(
      { error: "Panitia, wasit, or admin only" },
      { status: 403 },
    )
  }

  const captainUserId =
    staff.wasitUserIds[0] ?? tournament.createdById ?? user.id

  try {
    const result = await openTournamentTableLive({
      tournamentId,
      tableId,
      captainUserId,
    })
    return NextResponse.json(result)
  } catch (error) {
    const prismaCode =
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    const message = prismaCode
      ? "This table already has a live log open — use Resume live table, or end the previous log first"
      : error instanceof Error
        ? error.message
        : "Could not open live table"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}