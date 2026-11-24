import { BOUNTY_BIG_HAND_POINTS } from "@/lib/bounty/catalog"
import { getWeeklyBounties } from "@/lib/bounty/store"
import {
  bountyId,
  currentWeekKey,
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
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey)
  const now = new Date()
  if (!match) {
    const end = now
    const start = new Date(now.getTime() - 7 * 86_400_000)
    return { start, end, weekKey }
  }
  const year = Number(match[1])
  const week = Number(match[2])
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7)
  const start = new Date(monday.getTime() - 7 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 7 * 86_400_000)
  return { start, end, weekKey }
}

async function playerSeatsThisWeek(userId: string, start: Date, end: Date) {
  return prisma.sessionSeat.findMany({
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

type SeatRow = Awaited<ReturnType<typeof playerSeatsThisWeek>>[number]

function comboHit(combos: { label?: string }[] | null, needle: string) {
  const n = needle.toLowerCase()
  return (combos ?? []).some((c) => (c.label ?? "").toLowerCase().includes(n))
}

function evaluateFlags(seats: SeatRow[], top3: Set<string>) {
  let halfFlush = false
  let fullFlush = false
  let beatTop3 = false
  let cleanSheet = false
  let selfDraw = false
  let discardWin = false
  let positiveNet = false
  let threeWins = false
  let bigHand = false
  let tableWinner = false
  const playSession = seats.length > 0
  const twoTables = seats.length >= 2

  for (const seat of seats) {
    if (seat.dealtInCount === 0) cleanSheet = true
    if (seat.netPoints > 0) positiveNet = true
    if (seat.wins >= 3) threeWins = true

    const topNet = Math.max(...seat.session.seats.map((s) => s.netPoints), seat.netPoints)
    if (seat.netPoints === topNet && seat.session.seats.length > 0) {
      tableWinner = true
    }

    for (const hand of seat.session.hands) {
      if (hand.winnerSeatId !== seat.id) continue
      if (hand.winMethod === "SELF_DRAW") selfDraw = true
      if (hand.winMethod === "DISCARD") discardWin = true
      if (hand.points >= BOUNTY_BIG_HAND_POINTS) bigHand = true
      const combos = (hand.combosJson as { label?: string }[] | null) ?? []
      if (comboHit(combos, "half flush")) halfFlush = true
      if (comboHit(combos, "full flush")) fullFlush = true
    }

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

  return {
    "half-flush": {
      ok: halfFlush,
      reason: halfFlush
        ? "Half Flush win logged this week"
        : "No Half Flush win in finished tables this week",
    },
    "full-flush": {
      ok: fullFlush,
      reason: fullFlush
        ? "Full Flush win logged this week"
        : "No Full Flush win in finished tables this week",
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
    "self-draw": {
      ok: selfDraw,
      reason: selfDraw
        ? "Self-draw win logged this week"
        : "No self-draw win in finished tables this week",
    },
    "discard-win": {
      ok: discardWin,
      reason: discardWin
        ? "Discard win logged this week"
        : "No discard win in finished tables this week",
    },
    "positive-net": {
      ok: positiveNet,
      reason: positiveNet
        ? "Finished a session above zero"
        : "No positive-net finished session this week",
    },
    "play-session": {
      ok: playSession,
      reason: playSession
        ? "Finished a table this week"
        : "Finish any live session this week",
    },
    "three-wins": {
      ok: threeWins,
      reason: threeWins
        ? "3+ wins in one finished session"
        : "Need 3 wins in a single finished session",
    },
    "big-hand": {
      ok: bigHand,
      reason: bigHand
        ? `Won a ${BOUNTY_BIG_HAND_POINTS.toLocaleString("id-ID")}+ hand`
        : `No ${BOUNTY_BIG_HAND_POINTS.toLocaleString("id-ID")}+ hand this week`,
    },
    "two-tables": {
      ok: twoTables,
      reason: twoTables
        ? "Finished 2 tables this week"
        : "Finish 2 live tables this week",
    },
    "table-winner": {
      ok: tableWinner,
      reason: tableWinner
        ? "Finished 1st in net at a table"
        : "Finish 1st in net points at any table",
    },
  } as const
}

export async function evaluateBountiesForUser(userId: string): Promise<{
  weekKey: string
  source: "default" | "shuffle" | "ai"
  bounties: BountyStatus[]
}> {
  const weekKey = currentWeekKey()
  const { start, end } = weekRangeJakarta(weekKey)
  const [week, seats, claims, top3] = await Promise.all([
    getWeeklyBounties(weekKey),
    playerSeatsThisWeek(userId, start, end),
    prisma.bountyClaim.findMany({ where: { userId, weekKey } }),
    top3PlayerIds(),
  ])
  const claimed = new Set(claims.map((c) => c.bountyId))
  const flags = evaluateFlags(seats, top3)

  const bounties: BountyStatus[] = week.bounties.map((bounty) => {
    const id = bountyId(weekKey, bounty.key)
    const check = flags[bounty.key as keyof typeof flags] ?? {
      ok: false,
      reason: "Unknown bounty type",
    }
    return {
      ...bounty,
      bountyId: id,
      claimed: claimed.has(id),
      eligible: check.ok,
      reason: check.reason,
    }
  })

  return { weekKey, source: week.source, bounties }
}
