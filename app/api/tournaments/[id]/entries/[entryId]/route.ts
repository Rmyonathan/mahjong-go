import { NextResponse } from "next/server"
import type { TournamentEntryStatus } from "@prisma/client"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface Params {
  params: Promise<{ id: string; entryId: string }>
}

const ADMIN_STATUSES: TournamentEntryStatus[] = [
  "ACTIVE",
  "ELIMINATED",
  "REVIVED",
  "CHAMPION",
]

export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const { id: tournamentId, entryId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    status?: TournamentEntryStatus
    score?: number
    eliminatedRound?: number | null
  }

  const entry = await prisma.tournamentEntry.findFirst({
    where: { id: entryId, tournamentId },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  const data: {
    status?: TournamentEntryStatus
    score?: number
    eliminatedRound?: number | null
  } = {}

  if (body.status !== undefined) {
    if (!ADMIN_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    data.status = body.status
    if (body.status === "ELIMINATED" && body.eliminatedRound != null) {
      data.eliminatedRound = Math.max(1, Math.floor(body.eliminatedRound))
    }
    if (body.status === "ELIMINATED" && body.eliminatedRound == null) {
      data.eliminatedRound = entry.eliminatedRound ?? 1
    }
    if (body.status !== "ELIMINATED") {
      data.eliminatedRound = null
    }
    if (body.status === "REVIVED" && entry.status === "ELIMINATED") {
      // Admin manual revive does not auto-increment revivalsUsed unless explicitly tracked later.
    }
  }

  if (typeof body.score === "number" && Number.isFinite(body.score)) {
    data.score = Math.floor(body.score)
  }

  if (body.eliminatedRound !== undefined && body.status === undefined) {
    data.eliminatedRound =
      body.eliminatedRound === null
        ? null
        : Math.max(1, Math.floor(body.eliminatedRound))
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 })
  }

  const updated = await prisma.tournamentEntry.update({
    where: { id: entryId },
    data,
  })

  return NextResponse.json({ entry: updated })
}