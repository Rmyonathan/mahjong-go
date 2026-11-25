import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { id: tournamentId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    playerName?: string
    userId?: string
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { entries: true } } },
  })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  const isAdmin = user.role === "ADMIN"
  const registeringUserId =
    isAdmin && body.userId?.trim() ? body.userId.trim() : user.id

  if (!isAdmin && tournament.status !== "REGISTRATION") {
    // EDIT HERE — members may only self-register while status is REGISTRATION.
    return NextResponse.json(
      { error: "Registration is closed for this event" },
      { status: 403 },
    )
  }

  if (tournament._count.entries >= tournament.maxPlayers) {
    return NextResponse.json(
      { error: "Tournament is full" },
      { status: 409 },
    )
  }

  const guestOnly =
    isAdmin && body.playerName?.trim() && !body.userId?.trim()
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
  if (isAdmin && body.playerName?.trim()) {
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