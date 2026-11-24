import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isProMembership, syncExpiredPro } from "@/lib/membership"
import {
  analyzeWwyd,
  getDailyPuzzle,
} from "@/lib/puzzle/daily"

export async function GET() {
  const puzzle = getDailyPuzzle()
  const session = await getSessionUser()

  const tallies = await prisma.puzzleVote.groupBy({
    by: ["discardTileId"],
    where: { puzzleId: puzzle.id },
    _count: { _all: true },
  })
  const totalVotes = tallies.reduce((sum, row) => sum + row._count._all, 0)
  const community = tallies
    .map((row) => ({
      discardTileId: row.discardTileId,
      count: row._count._all,
      pct: totalVotes > 0 ? Math.round((row._count._all / totalVotes) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  let myVote: string | null = null
  let isPro = false
  if (session) {
    await syncExpiredPro(session.id)
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        role: true,
        membershipTier: true,
        proExpiresAt: true,
      },
    })
    isPro = user ? isProMembership(user) : false
    const vote = await prisma.puzzleVote.findUnique({
      where: {
        userId_puzzleId: { userId: session.id, puzzleId: puzzle.id },
      },
    })
    myVote = vote?.discardTileId ?? null
  }

  return NextResponse.json({
    puzzle: {
      id: puzzle.id,
      title: puzzle.title,
      tileIds: puzzle.tileIds,
      coachName: puzzle.coachName,
    },
    community,
    totalVotes,
    myVote,
    isPro,
    loggedIn: Boolean(session),
    // Ideal + coach only after vote (and Pro for full math)
    reveal:
      myVote != null
        ? {
            idealDiscardId: isPro ? puzzle.idealDiscardId : null,
            coachNote: isPro ? puzzle.coachNote : null,
            breakdown: isPro
              ? analyzeWwyd(puzzle.tileIds, puzzle.idealDiscardId)
              : null,
          }
        : null,
  })
}

export async function POST(request: Request) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json()) as { discardTileId?: string }
  const discardTileId = body.discardTileId?.trim()
  if (!discardTileId) {
    return NextResponse.json({ error: "Pick a tile to discard" }, { status: 400 })
  }

  const puzzle = getDailyPuzzle()
  if (!puzzle.tileIds.includes(discardTileId)) {
    return NextResponse.json({ error: "Tile not in today's hand" }, { status: 400 })
  }

  await prisma.puzzleVote.upsert({
    where: {
      userId_puzzleId: { userId: session.id, puzzleId: puzzle.id },
    },
    create: {
      userId: session.id,
      puzzleId: puzzle.id,
      discardTileId,
    },
    update: { discardTileId },
  })

  return NextResponse.json({ ok: true })
}
