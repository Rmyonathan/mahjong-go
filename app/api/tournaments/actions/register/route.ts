import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import { canAdministerTournament } from "@/lib/tournaments/staff"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    tournamentId?: string
    playerName?: string
    userId?: string
  }
  const tournamentId = body.tournamentId?.trim()
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 })
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      _count: { select: { entries: true } },
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
  const director = canAdministerTournament(
    user.id,
    user.role,
    tournament.createdById,
    staff.panitiaUserIds,
  )
  const registeringUserId =
    director && body.userId?.trim() ? body.userId.trim() : user.id

  // EDIT HERE — public registration via QR + WA confirmation (like schedule booking).
  if (!director && tournament.status !== "REGISTRATION") {
    return NextResponse.json(
      { error: "Registration is closed for this event" },
      { status: 403 },
    )
  }

  if (tournament._count.entries >= tournament.maxPlayers) {
    return NextResponse.json({ error: "Tournament is full" }, { status: 409 })
  }

  const guestOnly =
    director && body.playerName?.trim() && !body.userId?.trim()
  if (guestOnly) {
    const entry = await prisma.tournamentEntry.create({
      data: {
        tournamentId,
        userId: null,
        playerName: body.playerName!.trim(),
        status: "REGISTERED",
      },
    })
    return NextResponse.json({ entry })
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: registeringUserId },
    select: { id: true, name: true },
  })
  if (!dbUser) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 })
  }

  const existing = await prisma.tournamentEntry.findFirst({
    where: { tournamentId, userId: registeringUserId },
  })
  if (existing) {
    return NextResponse.json(
      { error: "Already registered for this tournament" },
      { status: 409 },
    )
  }

  let playerName = dbUser.name?.trim() || "Player"
  if (director && body.playerName?.trim()) {
    playerName = body.playerName.trim()
  }

  const entry = await prisma.tournamentEntry.create({
    data: {
      tournamentId,
      userId: registeringUserId,
      playerName,
      status: "REGISTERED",
    },
  })

  return NextResponse.json({ entry })
}