import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import {
  TOURNAMENT_PDF_MAX_BYTES,
  saveTournamentPdfFile,
} from "@/lib/tournaments/pdf-storage"

/** Admin-only PDF upload for tournament rules (Zung Jung or custom). */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing PDF file" }, { status: 400 })
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "File must be application/pdf" },
      { status: 400 },
    )
  }
  if (file.size > TOURNAMENT_PDF_MAX_BYTES) {
    return NextResponse.json({ error: "PDF too large" }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const saved = await saveTournamentPdfFile(bytes, file.name)
  return NextResponse.json({
    rulesPdfUrl: saved.url,
    rulesPdfName: saved.name,
  })
}