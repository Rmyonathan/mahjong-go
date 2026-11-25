import { NextResponse } from "next/server"
import type { TournamentFormat } from "@prisma/client"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  saveTournamentPdfFile,
  TOURNAMENT_PDF_MAX_BYTES,
} from "@/lib/tournaments/pdf-storage"
import type { ApiTournamentListItem } from "@/lib/tournaments/types"
import {
  extractGoogleDriveFileId,
  resolveRulesPdfLink,
} from "@/lib/tournaments/rules-pdf-url"

function parseFormat(value: unknown): TournamentFormat | null {
  if (value === "POINTS_RACE" || value === "KNOCKOUT" || value === "HYBRID_KO") {
    return value
  }
  return null
}

export async function GET() {
  const rows = await prisma.tournament.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { entries: true, tables: true } },
    },
  })

  const tournaments: ApiTournamentListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    format: row.format,
    status: row.status,
    entryFeeIdr: row.entryFeeIdr,
    prizePoolText: row.prizePoolText,
    maxPlayers: row.maxPlayers,
    revivalEnabled: row.revivalEnabled,
    revivalFeeIdr: row.revivalFeeIdr,
    maxRevivalsPerPlayer: row.maxRevivalsPerPlayer,
    currentRound: row.currentRound,
    rulesPdfUrl: row.rulesPdfUrl,
    rulesPdfName: row.rulesPdfName,
    entryCount: row._count.entries,
    tableCount: row._count.tables,
    createdAt: row.createdAt.toISOString(),
  }))

  return NextResponse.json({ tournaments })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""

  let title = ""
  let subtitle = ""
  let format: TournamentFormat = "POINTS_RACE"
  let entryFeeIdr = 0
  let prizePoolText = ""
  // EDIT HERE — default max players for new tournaments
  let maxPlayers = 16
  let revivalEnabled = true
  let revivalFeeIdr = 0
  // EDIT HERE — default revivals per player
  let maxRevivalsPerPlayer = 1
  let koAdvancePerTable = 1
  let rulesPdfUrl: string | null = null
  let rulesPdfName: string | null = null
  let panitiaUserId: string | null = null
  let wasitUserId: string | null = null

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData()
    title = String(form.get("title") ?? "").trim()
    subtitle = String(form.get("subtitle") ?? "").trim()
    const formatRaw = parseFormat(form.get("format"))
    if (formatRaw) format = formatRaw
    entryFeeIdr = Math.max(0, Number(form.get("entryFeeIdr") ?? 0) || 0)
    prizePoolText = String(form.get("prizePoolText") ?? "").trim()
    maxPlayers = Math.max(
      4,
      Math.min(64, Number(form.get("maxPlayers") ?? 16) || 16),
    )
    revivalEnabled = form.get("revivalEnabled") !== "false"
    revivalFeeIdr = Math.max(0, Number(form.get("revivalFeeIdr") ?? 0) || 0)
    maxRevivalsPerPlayer = Math.max(
      0,
      Number(form.get("maxRevivalsPerPlayer") ?? 1) || 1,
    )
    koAdvancePerTable = Math.min(
      2,
      Math.max(1, Number(form.get("koAdvancePerTable") ?? 1) || 1),
    )
    const externalUrl = String(form.get("rulesPdfUrl") ?? "").trim()
    if (externalUrl) {
      const resolved = resolveRulesPdfLink(externalUrl)
      rulesPdfUrl = resolved.href
      rulesPdfName =
        String(form.get("rulesPdfName") ?? "").trim() ||
        (extractGoogleDriveFileId(externalUrl)
          ? "tournament-rules-drive.pdf"
          : "tournament-rules.pdf")
    }
    const panitiaRaw = String(form.get("panitiaUserId") ?? "").trim()
    const wasitRaw = String(form.get("wasitUserId") ?? "").trim()
    if (panitiaRaw) panitiaUserId = panitiaRaw
    if (wasitRaw) wasitUserId = wasitRaw
    const file = form.get("rulesPdfFile")
    if (file instanceof File && file.size > 0) {
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Rules file must be PDF" },
          { status: 400 },
        )
      }
      if (file.size > TOURNAMENT_PDF_MAX_BYTES) {
        return NextResponse.json({ error: "PDF too large" }, { status: 400 })
      }
      const bytes = Buffer.from(await file.arrayBuffer())
      const saved = await saveTournamentPdfFile(bytes, file.name)
      rulesPdfUrl = saved.url
      rulesPdfName = saved.name
    }
  } else {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    title = String(body.title ?? "").trim()
    subtitle = String(body.subtitle ?? "").trim()
    const formatRaw = parseFormat(body.format)
    if (formatRaw) format = formatRaw
    entryFeeIdr = Math.max(0, Number(body.entryFeeIdr ?? 0) || 0)
    prizePoolText = String(body.prizePoolText ?? "").trim()
    maxPlayers = Math.max(
      4,
      Math.min(64, Number(body.maxPlayers ?? 16) || 16),
    )
    revivalEnabled = body.revivalEnabled !== false
    revivalFeeIdr = Math.max(0, Number(body.revivalFeeIdr ?? 0) || 0)
    maxRevivalsPerPlayer = Math.max(
      0,
      Number(body.maxRevivalsPerPlayer ?? 1) || 1,
    )
    koAdvancePerTable = Math.min(
      2,
      Math.max(1, Number(body.koAdvancePerTable ?? 1) || 1),
    )
    const externalUrl = String(body.rulesPdfUrl ?? "").trim()
    if (externalUrl) {
      const resolved = resolveRulesPdfLink(externalUrl)
      rulesPdfUrl = resolved.href
      rulesPdfName =
        String(body.rulesPdfName ?? "").trim() ||
        (extractGoogleDriveFileId(externalUrl)
          ? "tournament-rules-drive.pdf"
          : "tournament-rules.pdf")
    }
    const panitiaRaw = String(body.panitiaUserId ?? "").trim()
    const wasitRaw = String(body.wasitUserId ?? "").trim()
    if (panitiaRaw) panitiaUserId = panitiaRaw
    if (wasitRaw) wasitUserId = wasitRaw
  }

  if (panitiaUserId || wasitUserId) {
    const ids = [panitiaUserId, wasitUserId].filter(Boolean) as string[]
    const found = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })
    if (found.length !== ids.length) {
      return NextResponse.json({ error: "Invalid staff user" }, { status: 400 })
    }
  }

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const tournament = await prisma.$transaction(async (tx) => {
    const created = await tx.tournament.create({
      data: {
        title,
        subtitle,
        format,
        entryFeeIdr,
        prizePoolText,
        maxPlayers,
        revivalEnabled,
        revivalFeeIdr,
        maxRevivalsPerPlayer,
        koAdvancePerTable,
        rulesPdfUrl,
        rulesPdfName,
        panitiaUserId,
        wasitUserId,
        createdById: user.id,
      },
    })
    if (panitiaUserId || wasitUserId) {
      const { replaceTournamentStaff } = await import(
        "@/lib/tournaments/persist-staff"
      )
      await replaceTournamentStaff(
        tx,
        created.id,
        panitiaUserId ? [panitiaUserId] : [],
        wasitUserId ? [wasitUserId] : [],
      )
    }
    return created
  })

  return NextResponse.json({ tournament })
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Tournaments cannot be deleted." },
    { status: 403 },
  )
}