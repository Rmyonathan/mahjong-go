import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import type { Tile } from "@/lib/mahjong/types"
import { analyzeHand } from "@/lib/mahjong/shanten"

export type DailyPuzzle = {
  id: string
  title: string
  tileIds: string[]
  /** Coach's preferred discard (Pro reveal). */
  idealDiscardId: string
  coachNote: string
  coachName: string
}

/** EDIT HERE — rotating WWYD bank. Day-of-year picks an entry. */
export const PUZZLE_BANK: Omit<DailyPuzzle, "id">[] = [
  {
    title: "Half Flush temptation",
    tileIds: [
      "characters-2",
      "characters-3",
      "characters-4",
      "characters-5",
      "characters-5",
      "characters-5",
      "characters-7",
      "characters-8",
      "characters-9",
      "bamboo-3",
      "wind-east",
      "wind-east",
      "dragon-green",
      "dragon-green",
    ],
    idealDiscardId: "bamboo-3",
    coachNote:
      "You're one bamboo off a clean characters half-flush shape. Dump the 3s bamboo — keep the pair of greens as a flexible eye while the characters run stays intact.",
    coachName: "Coach Raka",
  },
  {
    title: "Honor clutter",
    tileIds: [
      "dots-2",
      "dots-3",
      "dots-4",
      "dots-6",
      "dots-7",
      "dots-8",
      "bamboo-5",
      "bamboo-5",
      "bamboo-5",
      "characters-1",
      "wind-south",
      "wind-west",
      "dragon-white",
      "dragon-red",
    ],
    idealDiscardId: "characters-1",
    coachNote:
      "Terminal 1 characters is the loneliest tile — three honors are still live for pung pressure, and your dots sequences want the middle. Cut the isolated 1.",
    coachName: "Coach Raka",
  },
  {
    title: "Unsafe middle",
    tileIds: [
      "bamboo-1",
      "bamboo-2",
      "bamboo-3",
      "bamboo-7",
      "bamboo-8",
      "bamboo-9",
      "dots-4",
      "dots-5",
      "dots-6",
      "characters-3",
      "characters-3",
      "characters-3",
      "dots-2",
      "wind-north",
    ],
    idealDiscardId: "wind-north",
    coachNote:
      "North is pure dead weight with three ready sets already forming. Prefer the safer honor dump over cracking a live middle dots wait later.",
    coachName: "Coach Raka",
  },
  {
    title: "Pair or stretch",
    tileIds: [
      "dots-1",
      "dots-1",
      "dots-2",
      "dots-3",
      "dots-7",
      "dots-8",
      "dots-9",
      "bamboo-2",
      "bamboo-3",
      "bamboo-4",
      "characters-6",
      "characters-7",
      "characters-8",
      "dragon-green",
    ],
    idealDiscardId: "dragon-green",
    coachNote:
      "Green dragon is the only honor singleton. Keep the 1s pair as your eye and ride the three chow shapes — classic standard-hand WWYD.",
    coachName: "Coach Raka",
  },
  {
    title: "Flush vs speed",
    tileIds: [
      "characters-1",
      "characters-2",
      "characters-3",
      "characters-5",
      "characters-6",
      "characters-7",
      "characters-8",
      "characters-8",
      "characters-9",
      "bamboo-6",
      "bamboo-6",
      "dots-4",
      "dots-5",
      "dots-6",
    ],
    idealDiscardId: "bamboo-6",
    coachNote:
      "You're deep into characters — the bamboo pair is the speed tax. Pitch one bamboo 6 (or both over time) and commit to the flush lane.",
    coachName: "Coach Raka",
  },
  {
    title: "Ryanmen keeper",
    tileIds: [
      "bamboo-3",
      "bamboo-4",
      "bamboo-5",
      "bamboo-6",
      "dots-2",
      "dots-3",
      "dots-4",
      "characters-4",
      "characters-5",
      "characters-6",
      "wind-east",
      "wind-east",
      "dots-9",
      "characters-1",
    ],
    idealDiscardId: "characters-1",
    coachNote:
      "Keep the east pair as your eye. Characters 1 and dots 9 are both awkward — dump 1 characters first; 9 dots can still blend into terminal pressure later.",
    coachName: "Coach Raka",
  },
  {
    title: "Pung pressure",
    tileIds: [
      "dots-5",
      "dots-5",
      "dots-5",
      "bamboo-2",
      "bamboo-2",
      "bamboo-2",
      "characters-8",
      "characters-8",
      "characters-8",
      "wind-south",
      "wind-south",
      "dragon-red",
      "bamboo-7",
      "dots-3",
    ],
    idealDiscardId: "dots-3",
    coachNote:
      "You're one eye away from an all-pungs frame. Isolated dots 3 and bamboo 7 are the floaters — cut dots 3; bamboo 7 still mirrors your bamboo pung suit.",
    coachName: "Coach Raka",
  },
]

export function todayPuzzleId(date = new Date()) {
  // Asia/Jakarta day key
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const d = parts.find((p) => p.type === "day")?.value
  return `${y}-${m}-${d}`
}

export function getDailyPuzzle(date = new Date()): DailyPuzzle {
  const id = todayPuzzleId(date)
  const dayIndex = Math.floor(
    new Date(`${id}T12:00:00+07:00`).getTime() / 86_400_000,
  )
  const entry = PUZZLE_BANK[((dayIndex % PUZZLE_BANK.length) + PUZZLE_BANK.length) % PUZZLE_BANK.length]!
  return { id, ...entry }
}

export function tilesFromIds(tileIds: string[]): Tile[] {
  return tileIds
    .map((id) => TILE_BY_ID[id])
    .filter((tile): tile is Tile => Boolean(tile))
}

/** Pro coaching breakdown using existing shanten engine. */
export function analyzeWwyd(tileIds: string[]) {
  const hand = tilesFromIds(tileIds)
  const base = analyzeHand(hand, hand, null)
  const uniqueIds = [...new Set(hand.map((t) => t.id))]

  const options = uniqueIds
    .map((discardId) => {
      const idx = hand.findIndex((t) => t.id === discardId)
      if (idx < 0) return null
      const after = [...hand.slice(0, idx), ...hand.slice(idx + 1)]
      const afterAnalysis = analyzeHand(after, after, null)
      return {
        discardId,
        discardLabel: TILE_BY_ID[discardId]?.label ?? discardId,
        shantenAfterDiscard: afterAnalysis.shanten,
        standardShanten: afterAnalysis.standardShanten,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort(
      (a, b) =>
        a.shantenAfterDiscard - b.shantenAfterDiscard ||
        a.discardLabel.localeCompare(b.discardLabel),
    )

  return {
    shanten: base.shanten,
    standardShanten: base.standardShanten,
    special: base.special,
    options: options.slice(0, 6),
  }
}
