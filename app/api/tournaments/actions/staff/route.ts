import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { replaceTournamentStaff } from "@/lib/tournaments/persist-staff"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import { canAdministerTournament } from "@/lib/tournaments/staff"

function uniqueStrings(values: unknown): string[] | undefined {
  if (!Array.isArray(values)) return undefined
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))]
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    tournamentId?: string
    panitiaUserIds?: string[]
    wasitUserIds?: string[]
    /** @deprecated use panitiaUserIds */
    panitiaUserId?: string | null
    /** @deprecated use wasitUserIds */
    wasitUserId?: string | null
  }
  const tournamentId = body.tournamentId?.trim()
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 })
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      staff: { include: { user: { select: { name: true } } } },
    },
  })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  const existing = resolveTournamentStaff({
    panitiaUserId: tournament.panitiaUserId,
    wasitUserId: tournament.wasitUserId,
    staff: tournament.staff,
  })
  if (
    !canAdministerTournament(
      user.id,
      user.role,
      tournament.createdById,
      existing.panitiaUserIds,
    )
  ) {
    return NextResponse.json({ error: "Admin or creator only" }, { status: 403 })
  }

  let panitiaUserIds = uniqueStrings(body.panitiaUserIds)
  let wasitUserIds = uniqueStrings(body.wasitUserIds)
  if (panitiaUserIds === undefined && body.panitiaUserId !== undefined) {
    panitiaUserIds = body.panitiaUserId ? [body.panitiaUserId.trim()] : []
  }
  if (wasitUserIds === undefined && body.wasitUserId !== undefined) {
    wasitUserIds = body.wasitUserId ? [body.wasitUserId.trim()] : []
  }
  if (panitiaUserIds === undefined && wasitUserIds === undefined) {
    return NextResponse.json({ error: "No staff changes" }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      await replaceTournamentStaff(
        tx,
        tournamentId,
        panitiaUserIds ?? existing.panitiaUserIds,
        wasitUserIds ?? existing.wasitUserIds,
      )
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save staff"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const refreshed = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      staff: { include: { user: { select: { name: true } } } },
    },
  })
  if (!refreshed) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }
  const staff = resolveTournamentStaff({
    panitiaUserId: refreshed.panitiaUserId,
    wasitUserId: refreshed.wasitUserId,
    staff: refreshed.staff,
  })

  return NextResponse.json({
    panitiaUserIds: staff.panitiaUserIds,
    wasitUserIds: staff.wasitUserIds,
    panitiaNames: staff.panitiaNames,
    wasitNames: staff.wasitNames,
    panitiaUserId: refreshed.panitiaUserId,
    panitiaName: staff.panitiaNames[0] ?? null,
    wasitUserId: refreshed.wasitUserId,
    wasitName: staff.wasitNames[0] ?? null,
  })
}