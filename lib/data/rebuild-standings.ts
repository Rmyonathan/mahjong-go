import type { BoardTier, FormResult, MeetBoardType } from "@prisma/client"

import { prisma } from "@/lib/db"

function boardFromMeet(boardType: MeetBoardType): BoardTier {
  if (boardType === "BEGINNER" || boardType === "GUIDED") return "beginner"
  if (boardType === "MCR") return "mcr"
  return "advanced"
}

type Agg = {
  playerId: string
  board: BoardTier
  points: number
  wins: number
  games: number
  selfDraw: number
  discardWins: number
  biggestHand: number
  form: FormResult[]
  lastStartedAt: number
}

/**
 * Rebuild season BoardStanding rows from finished GameSessions only.
 * Seed demo rows are dropped once real tables exist — live seats are source of truth.
 */
export async function rebuildStandingsFromFinishedSessions(seasonId: string) {
  const sessions = await prisma.gameSession.findMany({
    where: { status: "FINISHED" },
    include: {
      seats: {
        include: { user: { select: { playerId: true } } },
        orderBy: { seatOrder: "asc" },
      },
      hands: {
        select: {
          points: true,
          winnerSeatId: true,
          winMethod: true,
        },
      },
    },
    orderBy: { startedAt: "asc" },
  })

  const byPlayer = new Map<string, Agg>()

  for (const session of sessions) {
    const board = boardFromMeet(session.boardType)
    const startedAt = session.startedAt.getTime()

    for (const seat of session.seats) {
      const playerId = seat.user?.playerId
      if (!playerId) continue

      const formEntry: FormResult =
        seat.netPoints > 0 ? "W" : seat.netPoints < 0 ? "L" : "D"
      const discardWins = Math.max(0, seat.wins - seat.selfDraws)
      const seatBiggest = session.hands
        .filter((hand) => hand.winnerSeatId === seat.id)
        .reduce((max, hand) => Math.max(max, hand.points), 0)

      const prev = byPlayer.get(playerId)
      if (!prev) {
        byPlayer.set(playerId, {
          playerId,
          board,
          points: seat.netPoints,
          wins: seat.wins,
          games: 1,
          selfDraw: seat.selfDraws,
          discardWins,
          biggestHand: seatBiggest,
          form: [formEntry],
          lastStartedAt: startedAt,
        })
        continue
      }

      prev.points += seat.netPoints
      prev.wins += seat.wins
      prev.games += 1
      prev.selfDraw += seat.selfDraws
      prev.discardWins += discardWins
      prev.biggestHand = Math.max(prev.biggestHand, seatBiggest)
      prev.form = [...prev.form, formEntry].slice(-8)
      if (startedAt >= prev.lastStartedAt) {
        prev.board = board
        prev.lastStartedAt = startedAt
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.boardStanding.deleteMany({ where: { seasonId } })

    const rows = [...byPlayer.values()].sort(
      (a, b) => b.points - a.points || b.wins - a.wins,
    )

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      const winRate = row.games > 0 ? row.wins / Math.max(row.games, 1) : 0
      const streak = (() => {
        let n = 0
        for (let j = row.form.length - 1; j >= 0; j--) {
          if (row.form[j] !== "W") break
          n += 1
        }
        return n
      })()

      await tx.boardStanding.create({
        data: {
          seasonId,
          playerId: row.playerId,
          rank: i + 1,
          board: row.board,
          points: row.points,
          wins: row.wins,
          games: row.games,
          winRate,
          ptsPerWin: row.wins > 0 ? Math.round(row.points / row.wins) : 0,
          bonus: 0,
          pen: 0,
          biggestHand: row.biggestHand,
          form: row.form,
          streak,
          selfDraw: row.selfDraw,
          discardWins: row.discardWins,
        },
      })
    }

    // Per-board ranks (overall rank already set above)
    for (const board of ["beginner", "advanced", "mcr"] as BoardTier[]) {
      const boardRows = await tx.boardStanding.findMany({
        where: { seasonId, board },
        orderBy: [{ points: "desc" }, { wins: "desc" }],
      })
      for (let i = 0; i < boardRows.length; i++) {
        await tx.boardStanding.update({
          where: { id: boardRows[i]!.id },
          data: { rank: i + 1 },
        })
      }
    }
  })

  return byPlayer.size
}
