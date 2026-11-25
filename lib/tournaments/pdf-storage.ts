import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

/** EDIT HERE — max PDF upload size (bytes). */
export const TOURNAMENT_PDF_MAX_BYTES = 10 * 1024 * 1024

/** EDIT HERE — local disk folder used when Supabase is not configured. */
export const TOURNAMENT_PDF_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "tournaments",
)

/** EDIT HERE — Supabase Storage bucket for durable PDF hosting on serverless. */
export const TOURNAMENT_PDF_BUCKET =
  process.env.SUPABASE_TOURNAMENT_PDF_BUCKET?.trim() || "tournament-rules"

export function publicTournamentPdfUrl(filename: string) {
  return `/uploads/tournaments/${filename}`
}

function supabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  )
}

async function saveTournamentPdfToSupabase(
  bytes: Buffer,
  originalName: string,
): Promise<{ url: string; name: string }> {
  const supabaseUrl = process.env.SUPABASE_URL!.replace(/\/$/, "")
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const safeBase =
    originalName
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "rules"
  const filename = `${randomUUID()}-${safeBase.endsWith(".pdf") ? safeBase : `${safeBase}.pdf`}`
  const objectPath = `tournaments/${filename}`
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${TOURNAMENT_PDF_BUCKET}/${objectPath}`

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: new Uint8Array(bytes),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(
      `Supabase PDF upload failed (${response.status}): ${detail.slice(0, 200)}`,
    )
  }

  // Prefer public URL; buckets should be public-read for rules PDFs.
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${TOURNAMENT_PDF_BUCKET}/${objectPath}`
  return {
    url: publicUrl,
    name: originalName || filename,
  }
}

async function saveTournamentPdfLocal(
  bytes: Buffer,
  originalName: string,
): Promise<{ url: string; name: string }> {
  await mkdir(TOURNAMENT_PDF_DIR, { recursive: true })
  const safeBase =
    originalName
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "rules"
  const filename = `${randomUUID()}-${safeBase.endsWith(".pdf") ? safeBase : `${safeBase}.pdf`}`
  const diskPath = path.join(TOURNAMENT_PDF_DIR, filename)
  await writeFile(diskPath, bytes)
  return {
    url: publicTournamentPdfUrl(filename),
    name: originalName || filename,
  }
}

/**
 * Persist tournament rules PDF.
 * EDIT HERE — prefer Supabase on Vercel/Helipod (ephemeral FS); local disk for Docker volume / laptop.
 */
export async function saveTournamentPdfFile(
  bytes: Buffer,
  originalName: string,
): Promise<{ url: string; name: string }> {
  if (supabaseConfigured()) {
    return saveTournamentPdfToSupabase(bytes, originalName)
  }
  return saveTournamentPdfLocal(bytes, originalName)
}
