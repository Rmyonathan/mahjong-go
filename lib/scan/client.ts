import { compressScanImage } from "@/lib/scan/compress-image"
import type { ScanHandResult } from "@/lib/scan/parse-hand-response"

export async function scanHandFromFile(file: Blob): Promise<ScanHandResult> {
  let compressed
  try {
    compressed = await compressScanImage(file)
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Could not read photo — try Upload / JPEG",
    )
  }

  let response: Response
  try {
    response = await fetch("/api/scan/hand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: compressed.imageBase64,
        mimeType: compressed.mimeType,
      }),
    })
  } catch {
    throw new Error(
      "Network error reaching /api/scan/hand — check ngrok + phone Wi‑Fi",
    )
  }

  const text = await response.text()
  let data: ScanHandResult & { error?: string }
  try {
    data = JSON.parse(text) as ScanHandResult & { error?: string }
  } catch {
    // ngrok free interstitial often returns HTML instead of JSON
    if (text.includes("ngrok") || text.trimStart().startsWith("<!")) {
      throw new Error(
        "ngrok blocked the API — open the ngrok URL once, tap Visit Site, then retry",
      )
    }
    throw new Error("Scan API returned non-JSON")
  }

  if (!response.ok) {
    throw new Error(data.error ?? `Scan failed (${response.status})`)
  }

  return {
    tiles: data.tiles ?? [],
    detected: data.detected ?? [],
    uncertainIndices: data.uncertainIndices ?? [],
  }
}
