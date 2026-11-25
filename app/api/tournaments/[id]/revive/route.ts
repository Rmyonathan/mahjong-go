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
    entryId?: string
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  if (!tournament.revivalEnabled) {
    return NextResponse.json(
      { error: "Revivals are disabled for this tournament" },
      { status: 403 },
    )
  }

  const isAdmin = user.role === "ADMIN"
  let entry = body.entryId
    ? await prisma.tournamentEntry.findFirst({
        where: { id: body.entryId, tournamentId },
      })
    : await prisma.tournamentEntry.findFirst({
        where: { tournamentId, userId: user.id },
      })

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  if (!isAdmin && entry.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (entry.status !== "ELIMINATED") {
    return NextResponse.json(
      { error: "Only eliminated players can buy a revival slot" },
      { status: 400 },
    )
  }

  if (entry.revivalsUsed >= tournament.maxRevivalsPerPlayer) {
    return NextResponse.json(
      { error: "Maximum revivals already used" },
      { status: 400 },
    )
  }

  const updated = await prisma.tournamentEntry.update({
    where: { id: entry.id },
    data: {
      status: "REVIVED",
      revivalsUsed: entry.revivalsUsed + 1,
      eliminatedRound: null,
    },
  })

  // EDIT HERE — revival revenue = sum(revivalsUsed) × revivalFeeIdr (payment capture TBD).
  const revivalSlots = await prisma.tournamentEntry.aggregate({
    where: { tournamentId },
    _sum: { revivalsUsed: true },
  })
  const totalRevivalSlotsUsed = revivalSlots._sum.revivalsUsed ?? 0
  const revivalBuyInPoolIdr = totalRevivalSlotsUsed * tournament.revivalFeeIdr

  return NextResponse.json({
    entry: updated,
    revivalBuyInRecordedIdr: tournament.revivalFeeIdr,
    totalRevivalSlotsUsed,
    revivalBuyInPoolIdr,
  })
}