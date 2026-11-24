import type { WeeklyBounty } from "@/lib/bounty/weekly"

/**
 * Verifiable quest templates only.
 * Shuffle picks 3 — never invent keys without a matching checker in verify.ts.
 */
export type BountyTemplate = WeeklyBounty & {
  xpMin: number
  xpMax: number
}

// EDIT HERE — big-hand unlock threshold (hand.points)
export const BOUNTY_BIG_HAND_POINTS = 2400

// EDIT HERE — add templates only when verify.ts has a matching checker
export const BOUNTY_CATALOG: BountyTemplate[] = [
  {
    key: "half-flush",
    title: "Win with Half Flush",
    blurb: "Land any scored hand tagged Half Flush this week.",
    xp: 40,
    xpMin: 30,
    xpMax: 60,
    howTo: "Log it in a live table, then claim here.",
  },
  {
    key: "full-flush",
    title: "Full Flush flex",
    blurb: "Win a hand tagged Full Flush this week.",
    xp: 55,
    xpMin: 40,
    xpMax: 75,
    howTo: "One-suit glory — log Full Flush on a finished table.",
  },
  {
    key: "beat-top3",
    title: "Beat a Top-3 player",
    blurb: "Finish above a current podium seat at your table.",
    xp: 60,
    xpMin: 40,
    xpMax: 80,
    howTo: "Check the leaderboard podium, then claim after the session.",
  },
  {
    key: "zero-deal-in",
    title: "Clean sheet",
    blurb: "Finish a session with 0 deal-ins.",
    xp: 35,
    xpMin: 25,
    xpMax: 50,
    howTo: "Survive a full table without feeding — then claim.",
  },
  {
    key: "self-draw",
    title: "Self-draw once",
    blurb: "Win any hand by self-draw this week.",
    xp: 30,
    xpMin: 20,
    xpMax: 45,
    howTo: "Log a self-draw win on a finished table.",
  },
  {
    key: "discard-win",
    title: "Off someone's discard",
    blurb: "Win any hand off a discard this week.",
    xp: 25,
    xpMin: 15,
    xpMax: 40,
    howTo: "Claim a discard win, finish the table, then claim.",
  },
  {
    key: "positive-net",
    title: "Leave green",
    blurb: "Finish a session with positive net points.",
    xp: 35,
    xpMin: 25,
    xpMax: 50,
    howTo: "End any finished table above zero.",
  },
  {
    key: "play-session",
    title: "Sit a table",
    blurb: "Finish any live session this week.",
    xp: 20,
    xpMin: 15,
    xpMax: 30,
    howTo: "Play through End session — guests don't count.",
  },
  {
    key: "three-wins",
    title: "Hot seat",
    blurb: "Bank 3+ wins in a single finished session.",
    xp: 45,
    xpMin: 30,
    xpMax: 65,
    howTo: "Stack three wins before someone ends the table.",
  },
  {
    key: "big-hand",
    title: "Big hand",
    blurb: `Win a hand worth ${BOUNTY_BIG_HAND_POINTS.toLocaleString("id-ID")}+ points.`,
    xp: 50,
    xpMin: 35,
    xpMax: 70,
    howTo: "Land a fat score, finish the session, claim XP.",
  },
  {
    key: "two-tables",
    title: "Double shift",
    blurb: "Finish 2 different live tables this week.",
    xp: 40,
    xpMin: 25,
    xpMax: 55,
    howTo: "Sit two finished sessions in the same week.",
  },
  {
    key: "table-winner",
    title: "Table captain of net",
    blurb: "Finish 1st in net points at any table this week.",
    xp: 50,
    xpMin: 35,
    xpMax: 70,
    howTo: "Top the ledger when the session ends.",
  },
]

export const BOUNTY_CATALOG_BY_KEY = Object.fromEntries(
  BOUNTY_CATALOG.map((t) => [t.key, t]),
) as Record<string, BountyTemplate>

export const DEFAULT_WEEKLY_BOUNTY_KEYS = [
  "half-flush",
  "beat-top3",
  "zero-deal-in",
] as const

export function bountiesFromKeys(
  keys: string[],
  overrides?: Partial<Record<string, Partial<WeeklyBounty>>>,
): WeeklyBounty[] {
  const out: WeeklyBounty[] = []
  for (const key of keys) {
    const template = BOUNTY_CATALOG_BY_KEY[key]
    if (!template) continue
    const over = overrides?.[key]
    out.push({
      key: template.key,
      title: over?.title?.trim() || template.title,
      blurb: over?.blurb?.trim() || template.blurb,
      howTo: over?.howTo?.trim() || template.howTo,
      xp: clampXp(
        typeof over?.xp === "number" ? over.xp : template.xp,
        template.xpMin,
        template.xpMax,
      ),
    })
  }
  return out
}

export function defaultWeeklyBounties(): WeeklyBounty[] {
  return bountiesFromKeys([...DEFAULT_WEEKLY_BOUNTY_KEYS])
}

function clampXp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}
