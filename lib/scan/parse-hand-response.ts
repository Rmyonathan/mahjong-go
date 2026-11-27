import { TILE_BY_ID } from "@/lib/mahjong/tiles"

export interface ScanDetectedTile {
  /** Short visual count/description from the model (e.g. "9 bamboo sticks"). */
  count: string
  id: string
  /** Optional face value for suit tiles (sticks/circles/characters). */
  n?: number | null
  /** Bamboo only: sticks per horizontal row top→bottom (e.g. [3,3,3]). */
  rows?: number[]
}

export interface ScanTiming {
  phoneMs?: number
  hostNetworkMs?: number
  aiMs?: number
  serverMs?: number
  totalMs?: number
  payloadKb?: number
}

export interface ScanHandResult {
  /** Validated tile IDs in reading order (from `detected[].id`). */
  tiles: string[]
  /** Raw validated detections (count + id) for debugging / UI. */
  detected: ScanDetectedTile[]
  /** Kept for client compatibility; unused with count-first format. */
  uncertainIndices: number[]
  timing?: ScanTiming
}

const SUIT_PREFIXES = ["dots", "bamboo", "characters"] as const

function parseFaceValue(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 9) {
    return raw
  }
  if (typeof raw === "string") {
    const n = Number(raw.trim())
    if (Number.isInteger(n) && n >= 1 && n <= 9) return n
  }
  return null
}

/** Parse rows like [3,3,3] or "3,3,3" / "3x3" into per-row stick counts. */
export function parseBambooRows(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    const rows = raw
      .map((v) => (typeof v === "number" ? v : Number(String(v).trim())))
      .filter((v) => Number.isInteger(v) && v >= 1 && v <= 9)
    return rows.length > 0 ? rows : null
  }
  if (typeof raw === "string") {
    const text = raw.trim().toLowerCase()
    const grid = text.match(/^([1-9])\s*[x×]\s*([1-9])$/)
    if (grid) {
      // "2x4" → 2 rows of 4; "3x3" → 3 rows of 3
      const rowCount = Number(grid[1])
      const cols = Number(grid[2])
      if (rowCount * cols <= 9) {
        return Array.from({ length: rowCount }, () => cols)
      }
    }
    const parts = text
      .split(/[,+\s]+/)
      .map((p) => Number(p.trim()))
      .filter((v) => Number.isInteger(v) && v >= 1 && v <= 9)
    return parts.length > 0 ? parts : null
  }
  return null
}

function sumRows(rows: number[]): number | null {
  const sum = rows.reduce((a, b) => a + b, 0)
  return sum >= 1 && sum <= 9 ? sum : null
}

/**
 * Standard bamboo red/green paint:
 * 5 = 1r+4g, 7 = 1r+6g, 9 = 3r+6g. Any red → never 6.
 */
function bambooFromRedGreen(count: string): number | null {
  const text = count.toLowerCase()
  // "3r6g" / "3r 6g" / "3 red 6 green" / "3 red + 6 green"
  const compact = text.match(/\b([1-9])\s*r(?:ed)?\s*[+]?\s*([1-9])\s*g(?:reen)?\b/)
  if (compact) {
    const red = Number(compact[1])
    const green = Number(compact[2])
    const total = red + green
    if (red === 3 && green === 6) return 9
    if (red === 1 && green === 4) return 5
    if (red === 1 && green === 6) return 7
    if (total >= 1 && total <= 9) return total
  }
  const redOnly = text.match(/\b([1-9])\s*red\b/)
  const greenOnly = text.match(/\b([1-9])\s*green\b/)
  if (redOnly && greenOnly) {
    const red = Number(redOnly[1])
    const green = Number(greenOnly[1])
    if (red === 3 && green === 6) return 9
    if (red === 1 && green === 4) return 5
    if (red === 1 && green === 6) return 7
    const total = red + green
    if (total >= 1 && total <= 9) return total
  }
  // Mention of red sticks with a wrong bamboo-6 id → prefer 9 if 3×3/9 hints, else leave null
  if (/\bred\b|\b\dr\d?g\b/.test(text) && /\b9\b|3\s*[x×]\s*3|three/.test(text)) {
    return 9
  }
  return null
}

/** Pull a stick/circle count from free-text count like "9 bamboo sticks". */
function faceValueFromCountText(count: string, prefix: string): number | null {
  const text = count.toLowerCase()
  if (prefix === "bamboo" && /\bbird\b|\bsparrow\b|\bpeacock\b/.test(text)) {
    return 1
  }
  if (prefix === "bamboo") {
    const fromColor = bambooFromRedGreen(count)
    if (fromColor != null) return fromColor
    // W/M / zigzag layout = bamboo-8 (not two parallel sticks)
    if (/\b[wm][\s-]?shape\b|\bzigzag\b|\b[wm]\b/.test(text) && !/\b\|\|\b|\bparallel\b|\bstraight\b/.test(text)) {
      return 8
    }
  }

  const match =
    text.match(/\b([1-9])\s*(?:bamboo\s*)?sticks?\b/) ||
    text.match(/\bsticks?\s*[=:]?\s*([1-9])\b/) ||
    text.match(/\b([1-9])\s*(?:dark\s*|colored\s*)?(?:dots?|circles?)\b/) ||
    text.match(/\b([1-9])\s*characters?\b/) ||
    text.match(/\bn\s*[=:]\s*([1-9])\b/)
  if (!match?.[1]) return null
  const n = Number(match[1])
  return n >= 1 && n <= 9 ? n : null
}

/**
 * Prefer bamboo red/green + `rows` sum, then `n` / count text,
 * over a mismatched suit id.
 */
function resolveSuitId(
  id: string,
  count: string,
  nRaw: unknown,
  rowsRaw: unknown,
): string {
  const prefix = SUIT_PREFIXES.find((p) => id === p || id.startsWith(`${p}-`))
  if (!prefix) return id

  const rows = prefix === "bamboo" ? parseBambooRows(rowsRaw) : null
  const fromRows = rows ? sumRows(rows) : null
  const fromField = parseFaceValue(nRaw)
  const fromText = faceValueFromCountText(count, prefix)
  const fromColor =
    prefix === "bamboo" ? bambooFromRedGreen(count) : null

  // Bird text always wins for bamboo
  if (prefix === "bamboo" && fromText === 1) {
    return "bamboo-1"
  }

  // Color paint beats group-undercount (6 vs 9 / 5 / 7)
  let n = fromColor ?? fromRows ?? fromField ?? fromText

  // Any red mentioned + model said 6 → bump using rows or default to 9
  if (
    prefix === "bamboo" &&
    n === 6 &&
    /\bred\b|\b[1-9]r/.test(count.toLowerCase())
  ) {
    n = fromRows === 5 || fromRows === 7 || fromRows === 9 ? fromRows : 9
  }

  if (n == null) return TILE_BY_ID[id] ? id : id

  const resolved = `${prefix}-${n}`
  return TILE_BY_ID[resolved] ? resolved : id
}

const FLOWER_BY_NUM = [
  "",
  "flower-plum",
  "flower-orchid",
  "flower-chrysanthemum",
  "flower-bamboo",
] as const

const SEASON_BY_NUM = [
  "",
  "season-spring",
  "season-summer",
  "season-autumn",
  "season-winter",
] as const

/**
 * This set: RED ink = flowers, BLACK/BLUE ink = seasons.
 * Parses count like "red-2" / "black-4" and corrects swapped ids.
 */
function resolveBonusId(id: string, count: string): string {
  const text = count.toLowerCase()
  const inkNum =
    text.match(/\b(black|blue|blu|hitam|merah|red)\s*[-:]?\s*([1-4])\b/) ||
    text.match(/\b([1-4])\s*[-:]?\s*(black|blue|blu|hitam|merah|red)\b/)
  if (inkNum) {
    const a = inkNum[1]
    const b = inkNum[2]
    const ink = /\d/.test(a) ? b : a
    const num = Number(/\d/.test(a) ? a : b)
    const isFlower = ink === "red" || ink === "merah"
    const resolved = isFlower ? FLOWER_BY_NUM[num] : SEASON_BY_NUM[num]
    if (resolved && TILE_BY_ID[resolved]) return resolved
  }

  const numOnly = text.match(/\b([1-4])\b/)
  if (numOnly && (id.startsWith("flower-") || id.startsWith("season-"))) {
    const num = Number(numOnly[1])
    const resolved = id.startsWith("flower-")
      ? FLOWER_BY_NUM[num]
      : SEASON_BY_NUM[num]
    if (resolved && TILE_BY_ID[resolved]) return resolved
  }

  return id
}

function pushDetectedEntry(
  entry: unknown,
  detected: ScanDetectedTile[],
  tiles: string[],
) {
  if (!entry || typeof entry !== "object") return
  const row = entry as Record<string, unknown>
  const rawId = typeof row.id === "string" ? row.id.trim() : ""
  if (!rawId) return
  const count =
    typeof row.count === "string" && row.count.trim()
      ? row.count.trim()
      : rawId
  const rows = parseBambooRows(row.rows)
  const nFromRows = rows ? sumRows(rows) : null
  const n = nFromRows ?? parseFaceValue(row.n)
  let id = resolveSuitId(rawId, count, row.n, row.rows)
  if (
    id.startsWith("flower-") ||
    id.startsWith("season-") ||
    /\b(black|blue|red|hitam|merah)\b/i.test(count)
  ) {
    id = resolveBonusId(id, count)
  }
  if (!TILE_BY_ID[id]) return
  detected.push({
    count,
    id,
    n,
    ...(rows ? { rows } : {}),
  })
  tiles.push(id)
}

/** Map model `detected` (or bare array / legacy `tiles`) → validated IDs. */
export function sanitizeScanHandResult(raw: unknown): ScanHandResult {
  const detected: ScanDetectedTile[] = []
  const tiles: string[] = []

  // Model sometimes returns a bare array instead of {"detected":[...]}
  if (Array.isArray(raw)) {
    for (const entry of raw) pushDetectedEntry(entry, detected, tiles)
    return { tiles, detected, uncertainIndices: [] }
  }

  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}

  if (Array.isArray(obj.detected)) {
    for (const entry of obj.detected) pushDetectedEntry(entry, detected, tiles)
  } else if (Array.isArray(obj.tiles)) {
    for (const entry of obj.tiles) {
      if (typeof entry === "string") {
        const id = entry.trim()
        if (!TILE_BY_ID[id]) continue
        detected.push({ count: id, id })
        tiles.push(id)
      } else {
        pushDetectedEntry(entry, detected, tiles)
      }
    }
  }

  return {
    tiles,
    detected,
    uncertainIndices: [],
  }
}

export function stripBase64Prefix(raw: string) {
  const trimmed = raw.trim()
  const comma = trimmed.indexOf(",")
  if (trimmed.startsWith("data:") && comma >= 0) {
    return trimmed.slice(comma + 1)
  }
  return trimmed
}

function stripMarkdownFences(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
}

/** Close truncated `{"detected":[...` payloads from max_tokens cutoffs. */
function repairTruncatedJson(fragment: string) {
  let text = fragment.trim()
  text = text.replace(/,\s*\{[\s\S]*$/, "")
  text = text.replace(/,\s*"[^"]*$/, "")
  text = text.replace(/,\s*$/, "")

  const openBraces = (text.match(/\{/g) ?? []).length
  const closeBraces = (text.match(/\}/g) ?? []).length
  const openBrackets = (text.match(/\[/g) ?? []).length
  const closeBrackets = (text.match(/\]/g) ?? []).length
  text += "]".repeat(Math.max(0, openBrackets - closeBrackets))
  text += "}".repeat(Math.max(0, openBraces - closeBraces))
  return text
}

/**
 * Parse model content that may include markdown fences, prose, truncation,
 * or a bare `[...]` array (no `{"detected":...}` wrapper).
 */
export function parseScanModelContent(raw: string): unknown | null {
  const cleaned = stripMarkdownFences(raw)
  if (!cleaned) return null

  try {
    return JSON.parse(cleaned) as unknown
  } catch {
    // continue
  }

  const objStart = cleaned.indexOf("{")
  const arrStart = cleaned.indexOf("[")
  const start =
    objStart < 0
      ? arrStart
      : arrStart < 0
        ? objStart
        : Math.min(objStart, arrStart)
  if (start < 0) return null

  const from = cleaned.slice(start)
  const endChar = from[0] === "[" ? "]" : "}"
  const end = from.lastIndexOf(endChar)
  if (end > 0) {
    try {
      return JSON.parse(from.slice(0, end + 1)) as unknown
    } catch {
      // continue
    }
  }

  try {
    return JSON.parse(repairTruncatedJson(from)) as unknown
  } catch {
    return null
  }
}
