import { NextResponse } from "next/server"

import {
  parseScanModelContent,
  sanitizeScanHandResult,
  stripBase64Prefix,
} from "@/lib/scan/parse-hand-response"

// EDIT HERE: accuracy pick — 3.8 Flash is the one that counted dots correctly.
// Faster but less accurate: "google/gemini-3.5-flash-lite" or "google/gemini-3.6-flash"
const OPENROUTER_MODEL = "google/gemini-3.8-flash"

// EDIT HERE: timeout in ms — 3.8 needs more headroom than Flash-Lite
const SCAN_TIMEOUT_MS = 45_000

// EDIT HERE: update to your production domain
const OPENROUTER_REFERER = "https://jademahjong.app"

// EDIT HERE: must be high — finish=length truncates mid-JSON under ~2k with bonus+14 tiles
const SCAN_MAX_TOKENS = 8192

/** Must wrap in {"detected":[...]} — bare arrays are also accepted by the parser. */
const SCAN_SYSTEM_PROMPT = `Mahjong OCR. Return ONLY {"detected":[...]} — never a bare array. Complete every tile.
Example item: {"count":"3r6g","rows":[3,3,3],"n":9,"id":"bamboo-9"}
Omit rows/n when unused. ids: dots-1..9|bamboo-1..9|characters-1..9|wind-east|south|west|north|dragon-red|green|white|flower-plum|orchid|chrysanthemum|bamboo|season-spring|summer|autumn|winter. No Fan.`

const SCAN_USER_PROMPT = `List EVERY tile L→R (bonus above + 14 hand). Do not stop early.
Per tile: short count, id. Suit: n=1–9. Bamboo sticks: rows=[shafts per row top→bottom], n=sum(rows). Bird→bamboo-1. Honors: id only. Bonus: count MUST be ink+num like "red-2" or "black-4", plus id.

Dots: count every circle (6-dot=2+4=6 circles, NOT 4-dot/7-dot; 4-dot=2×2; 7-dot=3 slanted+4; 1-dot=one big circle).
Winds (ignore 90°/180° tile rotation): 東=east(box+center spine), 南=south(open-bottom arch+cross inside—even upside-down, NOT west), 西=west(closed box+2 inner legs), 北=north(back-to-back).

Bamboo COLOR: any RED stick → not bamboo-6. 1r4g→5, 1r6g→7, 3r6g→9 (center column often red). Write count as 3r6g etc. All-green 2×3→bamboo-6.
Bamboo 2 vs 8: 2=ONLY two parallel sticks || (rows=[1,1]/[2]); 8=eight sticks in W/M zigzag (rows=[3,2,3]/[2,2,2,2]). Also [3,3,3]→9, [2,1,2]→5.

BONUS (do NOT use HK color defaults):
- RED ink numeral → flower-*; BLACK/BLUE ink → season-*.
- 1:1 map: red-1→flower-plum, red-2→flower-orchid, red-3→flower-chrysanthemum, red-4→flower-bamboo (bamboo plant). black/blue-1→season-spring, -2→summer, -3→autumn, -4→winter.`

function isTimeoutError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const err = error as { name?: string; message?: string; code?: string }
  return (
    err.name === "TimeoutError" ||
    err.name === "AbortError" ||
    err.code === "ABORT_ERR" ||
    (typeof err.message === "string" &&
      (err.message.includes("aborted") ||
        err.message.includes("timeout") ||
        err.message.includes("Timeout")))
  )
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 500 },
    )
  }

  let body: { imageBase64?: string; mimeType?: string }
  try {
    body = (await request.json()) as { imageBase64?: string; mimeType?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const imageBase64 = body.imageBase64
    ? stripBase64Prefix(body.imageBase64)
    : ""
  const mimeType =
    body.mimeType?.trim() ||
    // EDIT HERE — default mime when client omits it
    "image/jpeg"

  if (!imageBase64) {
    return NextResponse.json(
      { error: "imageBase64 is required" },
      { status: 400 },
    )
  }

  const started = Date.now()

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-Title": "Jade Mahjong",
        },
        signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          temperature: 0,
          max_tokens: SCAN_MAX_TOKENS,
          response_format: { type: "json_object" },
          provider: { sort: "latency" },
          // EDIT HERE: "low" helps completeness; omit for speed (risk early cutoffs)
          reasoning: { effort: "low" },
          messages: [
            { role: "system", content: SCAN_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: SCAN_USER_PROMPT },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                    // EDIT HERE: "high" for stick/dot accuracy; "low" for speed
                    detail: "high",
                  },
                },
              ],
            },
          ],
        }),
      },
    )

    const data = (await response.json()) as {
      error?: { message?: string } | string
      choices?: Array<{
        message?: {
          content?: string | Array<{ type?: string; text?: string }> | null
        }
        finish_reason?: string | null
      }>
    }

    if (!response.ok) {
      const upstream =
        typeof data.error === "string"
          ? data.error
          : data.error?.message || `OpenRouter error (${response.status})`
      const message =
        response.status === 401
          ? `OpenRouter unauthorized — check OPENROUTER_API_KEY (${upstream})`
          : upstream
      console.log("[SCAN ERR]", response.status, message, `${Date.now() - started}ms`)
      return NextResponse.json(
        { error: message },
        {
          status:
            response.status === 401
              ? 502
              : response.status >= 500
                ? 502
                : response.status,
        },
      )
    }

    const content = data.choices?.[0]?.message?.content
    const rawText = Array.isArray(content)
      ? content
          .map((part) => (typeof part?.text === "string" ? part.text : ""))
          .join("\n")
          .trim()
      : (content?.trim() ?? "")
    const finishReason = data.choices?.[0]?.finish_reason ?? null
    console.log("[SCAN RAW]", rawText)
    console.log(
      "[SCAN TIME]",
      `${Date.now() - started}ms`,
      OPENROUTER_MODEL,
      finishReason ? `finish=${finishReason}` : "",
    )

    if (!rawText) {
      return NextResponse.json(
        { error: "Empty model response" },
        { status: 502 },
      )
    }

    const parsed = parseScanModelContent(rawText)
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            finishReason === "length"
              ? "Model response was cut off (raise SCAN_MAX_TOKENS) — try again"
              : "Model returned non-JSON",
          raw: rawText.slice(0, 400),
        },
        { status: 502 },
      )
    }

    const result = sanitizeScanHandResult(parsed)
    // detected.map(d => d.id) validated against lib/mahjong/tiles.ts
    if (result.tiles.length === 0) {
      return NextResponse.json(
        {
          error: "No valid tile IDs detected",
          tiles: [],
          detected: [],
          uncertainIndices: [],
        },
        { status: 422 },
      )
    }

    // AI detects tiles only — scoring stays in lib/mahjong/engine.ts on the client
    return NextResponse.json({
      ...result,
      model: OPENROUTER_MODEL,
      ms: Date.now() - started,
    })
  } catch (error) {
    if (isTimeoutError(error)) {
      console.log("[SCAN TIMEOUT]", `${Date.now() - started}ms`, OPENROUTER_MODEL)
      return NextResponse.json(
        {
          error: `Scan timed out after ${Math.round(SCAN_TIMEOUT_MS / 1000)}s — try a clearer closer photo, or swap OPENROUTER_MODEL`,
        },
        { status: 504 },
      )
    }
    const message =
      error instanceof Error ? error.message : "OpenRouter scan failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
