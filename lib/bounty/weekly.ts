/** Weekly side quests — XP claims land on the linked Player.experienceXp. */

export type WeeklyBounty = {
  /** Stable id within the week, e.g. half-flush */
  key: string
  title: string
  blurb: string
  xp: number
  /** Soft completion hint for UI (manual claim for Week 1). */
  howTo: string
}

export function currentWeekKey(date = new Date()) {
  // ISO week in Asia/Jakarta
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const [y, m, d] = fmt.format(date).split("-").map(Number)
  const utc = new Date(Date.UTC(y!, m! - 1, d!))
  const dayNum = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

/** EDIT HERE — rotate weekly quests as the club season evolves. */
export const WEEKLY_BOUNTIES: WeeklyBounty[] = [
  {
    key: "half-flush",
    title: "Win with Half Flush",
    blurb: "Land any scored hand tagged Half Flush this week.",
    xp: 40,
    howTo: "Log it in a live table, then claim here.",
  },
  {
    key: "beat-top3",
    title: "Beat a Top-3 player",
    blurb: "Finish above a current podium seat at your table.",
    xp: 60,
    howTo: "Check the leaderboard podium, then claim after the session.",
  },
  {
    key: "zero-deal-in",
    title: "Clean sheet",
    blurb: "Finish a session with 0 deal-ins.",
    xp: 35,
    howTo: "Survive a full table without feeding — then claim.",
  },
]

export function bountyId(weekKey: string, key: string) {
  return `${weekKey}:${key}`
}
