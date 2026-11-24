import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { evaluateBountiesForUser } from "@/lib/bounty/verify"
import { getWeeklyBounties } from "@/lib/bounty/store"
import { bountyId, currentWeekKey } from "@/lib/bounty/weekly"
import { prisma } from "@/lib/db"
import { applyPlayerXpGain } from "@/lib/xp/apply"

export async function GET() {
  const weekKey = currentWeekKey()
  const session = await getSessionUser()
  if (!session) {
    const week = await getWeeklyBounties(weekKey)
    return NextResponse.json({
      weekKey,
      source: week.source,
      loggedIn: false,
      bounties: week.bounties.map((b) => ({
        ...b,
        bountyId: bountyId(weekKey, b.key),
        claimed: false,
        eligible: false,
        reason: "Login to track progress",
      })),
    })
  }

  const evaluated = await evaluateBountiesForUser(session.id)
  return NextResponse.json({
    weekKey: evaluated.weekKey,
    source: evaluated.source,
    loggedIn: true,
    bounties: evaluated.bounties,
  })
}

export async function POST(request: Request) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json()) as { key?: string }
  const key = body.key?.trim()
  if (!key) {
    return NextResponse.json({ error: "Missing bounty key" }, { status: 400 })
  }

  const { weekKey, bounties } = await evaluateBountiesForUser(session.id)
  const status = bounties.find((b) => b.key === key)
  if (!status) {
    return NextResponse.json({ error: "Unknown bounty" }, { status: 400 })
  }
  if (!status.eligible) {
    return NextResponse.json(
      { error: status.reason ?? "Not eligible yet" },
      { status: 403 },
    )
  }

  const id = bountyId(weekKey, status.key)
  const existing = await prisma.bountyClaim.findUnique({
    where: { userId_bountyId: { userId: session.id, bountyId: id } },
  })
  if (existing) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { playerId: true },
  })
  if (!user?.playerId) {
    return NextResponse.json(
      { error: "Link a player profile before claiming XP" },
      { status: 400 },
    )
  }

  await prisma.bountyClaim.create({
    data: {
      userId: session.id,
      bountyId: id,
      weekKey,
      xpAwarded: status.xp,
    },
  })
  await applyPlayerXpGain(user.playerId, status.xp)

  return NextResponse.json({ ok: true, xpAwarded: status.xp })
}
