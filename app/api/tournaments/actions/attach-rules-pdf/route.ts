import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { canAdministerTournament } from "@/lib/tournaments/staff"
import {
  saveTournamentPdfFile,
  TOURNAMENT_PDF_MAX_BYTES,
} from "@/lib/tournaments/pdf-storage"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const form = await request.formData()
  const tournamentId = String(form.get("tournamentId") ?? "").trim()
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 })
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }
  if (!canAdministerTournament(user.id, user.role, tournament.createdById)) {
    return NextResponse.json({ error: "Admin or creator only" }, { status: 403 })
  }

  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 })
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be PDF" }, { status: 400 })
  }
  if (file.size > TOURNAMENT_PDF_MAX_BYTES) {
    return NextResponse.json({ error: "PDF too large" }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const saved = await saveTournamentPdfFile(bytes, file.name)
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { rulesPdfUrl: saved.url, rulesPdfName: saved.name },
  })

  return NextResponse.json({
    rulesPdfUrl: saved.url,
    rulesPdfName: saved.name,
  })
}