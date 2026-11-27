import { compressScanImage } from "@/lib/scan/compress-image"
import type { ScanHandResult } from "@/lib/scan/parse-hand-response"

export async function scanHandFromFile(file: Blob): Promise<ScanHandResult> {
  const totalStart = performance.now()
  const compressStart = performance.now()
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
  const phoneMs = Math.round(performance.now() - compressStart)

  const netStart = performance.now()
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

  const netMs = Math.round(performance.now() - netStart)
  const totalMs = Math.round(performance.now() - totalStart)
  const serverMs = data.timing?.serverMs ?? netMs
  const aiMs = data.timing?.aiMs ?? serverMs
  const hostNetworkMs = Math.max(0, netMs - serverMs)
  const timing = {
    phoneMs,
    hostNetworkMs,
    aiMs,
    serverMs,
    totalMs,
    payloadKb: data.timing?.payloadKb,
  }
  console.log("[SCAN TIMING]", timing)

  return {
    tiles: data.tiles ?? [],
    detected: data.detected ?? [],
    uncertainIndices: data.uncertainIndices ?? [],
    timing,
  }
}
