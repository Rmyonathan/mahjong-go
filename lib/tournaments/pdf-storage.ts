import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

/** EDIT HERE — max PDF upload size (bytes). */
export const TOURNAMENT_PDF_MAX_BYTES = 10 * 1024 * 1024

/** EDIT HERE — local disk folder; swap to R2/S3 upload helper later. */
export const TOURNAMENT_PDF_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "tournaments",
)

export function publicTournamentPdfUrl(filename: string) {
  return `/uploads/tournaments/${filename}`
}

export async function saveTournamentPdfFile(
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