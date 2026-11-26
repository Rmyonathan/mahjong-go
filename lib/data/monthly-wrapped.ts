import { prisma } from "@/lib/db"

export type MonthlyWrappedData = {
  monthLabel: string
  sessionsPlayed: number
  gamesPlayed: number
  totalWins: number
  netPoints: number
  biggestHand: {
    points: number
    combos: string[]
    sessionTitle: string
  } | null
  bestRival: {
    name: string
    netAgainst: number
    hands: number
  } | null
}

function currentMonthRangeJakarta() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now)
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "2026")
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1")

  const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`)
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const end = new Date(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`,
  )
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(now)

  return { start, end, monthLabel }
}

export async function getMonthlyJadeWrapped(
  userId: string,
): Promise<MonthlyWrappedData> {
  const { start, end, monthLabel } = currentMonthRangeJakarta()

  const seats = await prisma.sessionSeat.findMany({
    where: {
      userId,
      session: {
        status: "FINISHED",
        startedAt: { gte: start, lt: end },
      },
    },
    include: {
      session: {
        include: {
          seats: {
            include: {
              user: { include: { player: true } },
            },
          },
          hands: true,
        },
      },
    },
  })

  let totalWins = 0
  let netPoints = 0
  let gamesPlayed = 0
  let biggestHand: MonthlyWrappedData["biggestHand"] = null
  const rivalMap = new Map<string, { name: string; netAgainst: number; hands: number }>()

  for (const mySeat of seats) {
    totalWins += mySeat.wins
    netPoints += mySeat.netPoints
    gamesPlayed += mySeat.session.hands.length

    const seatById = new Map(mySeat.session.seats.map((s) => [s.id, s]))

    for (const hand of mySeat.session.hands) {
      if (hand.winnerSeatId === mySeat.id) {
        const combosRaw = Array.isArray(hand.combosJson)
          ? (hand.combosJson as Array<{ label?: string }>)
          : []
        const combos = combosRaw
          .map((c) => c.label ?? "")
          .filter(Boolean)
          .slice(0, 3)

        if (!biggestHand || hand.points > biggestHand.points) {
          biggestHand = {
            points: hand.points,
            combos,
            sessionTitle: mySeat.session.title,
          }
        }

        if (hand.dealtInSeatId && hand.dealtInSeatId !== mySeat.id) {
          const opp = seatById.get(hand.dealtInSeatId)
          if (opp) {
            const key = opp.userId ?? opp.guestName ?? opp.id
            const name =
              opp.user?.player?.nickname ??
              opp.user?.name?.split(" ")[0] ??
              opp.guestName ??
              "Opponent"
            const cur = rivalMap.get(key) ?? { name, netAgainst: 0, hands: 0 }
            cur.netAgainst += hand.points
            cur.hands += 1
            rivalMap.set(key, cur)
          }
        }
      } else if (hand.dealtInSeatId === mySeat.id && hand.winnerSeatId) {
        const opp = seatById.get(hand.winnerSeatId)
        if (opp) {
          const key = opp.userId ?? opp.guestName ?? opp.id
          const name =
            opp.user?.player?.nickname ??
            opp.user?.name?.split(" ")[0] ??
            opp.guestName ??
            "Opponent"
          const cur = rivalMap.get(key) ?? { name, netAgainst: 0, hands: 0 }
          cur.netAgainst -= hand.points
          cur.hands += 1
          rivalMap.set(key, cur)
        }
      }
    }
  }

  const bestRival =
    [...rivalMap.values()].sort(
      (a, b) => Math.abs(b.netAgainst) - Math.abs(a.netAgainst),
    )[0] ?? null

  return {
    monthLabel,
    sessionsPlayed: seats.length,
    gamesPlayed,
    totalWins,
    netPoints,
    biggestHand,
    bestRival,
  }
}
