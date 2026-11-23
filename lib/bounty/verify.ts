import {
  bountyId,
  currentWeekKey,
  WEEKLY_BOUNTIES,
  type WeeklyBounty,
} from "@/lib/bounty/weekly"
import { prisma } from "@/lib/db"

export type BountyStatus = WeeklyBounty & {
  bountyId: string
  claimed: boolean
  eligible: boolean
  reason: string
}

function weekRangeJakarta(weekKey = currentWeekKey()) {
  // weekKey = YYYY-Www — approximate Mon 00:00 → next Mon in +07
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey)
  const now = new Date()
  if (!match) {
    const end = now
    const start = new Date(now.getTime() - 7 * 86_400_000)
    return { start, end, weekKey }
  }
  const year = Number(match[1])
  const week = Number(match[2])
  // ISO week: Thursday of week determines year; Monday = day 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7)
  // Asia/Jakarta = UTC+7
  const start = new Date(monday.getTime() - 7 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 7 * 86_400_000)
  return { start, end, weekKey }
}

async function playerSeatIdsThisWeek(userId: string, start: Date, end: Date) {
  const seats = await prisma.sessionSeat.findMany({
    where: {
      userId,
      session: {
        status: "FINISHED",
        endedAt: { gte: start, lt: end },
      },
    },
    include: {
      session: {
        include: {
          hands: true,
          seats: {
            include: { user: { select: { playerId: true } } },
          },
        },
      },
    },
  })
  return seats
}

async function top3PlayerIds(): Promise<Set<string>> {
  const season = await prisma.season.findFirst({ where: { isActive: true } })
  if (!season) return new Set()
  const rows = await prisma.boardStanding.findMany({
    where: { seasonId: season.id },
    orderBy: [{ points: "desc" }, { rank: "asc" }],
    take: 3,
    select: { playerId: true },
  })
  return new Set(rows.map((r) => r.playerId))
}

export async function evaluateBountiesForUser(userId: string): Promise<{
  weekKey: string
  bounties: BountyStatus[]
}> {
  const weekKey = currentWeekKey()
  const { start, end } = weekRangeJakarta(weekKey)
  const [seats, claims, top3] = await Promise.all([
    playerSeatIdsThisWeek(userId, start, end),
    prisma.bountyClaim.findMany({ where: { userId, weekKey } }),
    top3PlayerIds(),
  ])
  const claimed = new Set(claims.map((c) => c.bountyId))

  let halfFlush = false
  let beatTop3 = false
  let cleanSheet = false

  for (const seat of seats) {
    if (seat.dealtInCount === 0) cleanSheet = true

    for (const hand of seat.session.hands) {
      if (hand.winnerSeatId !== seat.id) continue
      const combos =
        (hand.combosJson as { label?: string }[] | null) ?? []
      if (
        combos.some((c) =>
          (c.label ?? "").toLowerCase().includes("half flush"),
        )
      ) {
        halfFlush = true
      }
    }

    // Beat a current Top-3 player at the same finished table
    if (top3.size > 0) {
      for (const other of seat.session.seats) {
        const otherPlayerId = other.user?.playerId
        if (!otherPlayerId || other.id === seat.id) continue
        if (top3.has(otherPlayerId) && seat.netPoints > other.netPoints) {
          beatTop3 = true
        }
      }
    }
  }

  const eligibility: Record<string, { ok: boolean; reason: string }> = {
    "half-flush": {
      ok: halfFlush,
      reason: halfFlush
        ? "Half Flush win logged this week"
        : "No Half Flush win in finished tables this week",
    },
    "beat-top3": {
      ok: beatTop3,
      reason: beatTop3
        ? "Finished above a Top-3 seat this week"
        : "Haven't outscored a Top-3 player at a finished table this week",
    },
    "zero-deal-in": {
      ok: cleanSheet,
      reason: cleanSheet
        ? "Finished a session with 0 deal-ins"
        : "No clean-sheet (0 deal-in) session this week",
    },
  }

  const bounties: BountyStatus[] = WEEKLY_BOUNTIES.map((bounty) => {
    const id = bountyId(weekKey, bounty.key)
    const check = eligibility[bounty.key] ?? {
      ok: false,
      reason: "Unknown bounty",
    }
    return {
      ...bounty,
      bountyId: id,
      claimed: claimed.has(id),
      eligible: check.ok,
      reason: check.reason,
    }
  })

  return { weekKey, bounties }
}
