import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { evaluateBountiesForUser } from "@/lib/bounty/verify"
import {
  bountyId,
  currentWeekKey,
  WEEKLY_BOUNTIES,
} from "@/lib/bounty/weekly"
import { prisma } from "@/lib/db"
import { applyPlayerXpGain } from "@/lib/xp/apply"

export async function GET() {
  const weekKey = currentWeekKey()
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({
      weekKey,
      loggedIn: false,
      bounties: WEEKLY_BOUNTIES.map((b) => ({
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
  const bounty = WEEKLY_BOUNTIES.find((b) => b.key === key)
  if (!bounty) {
    return NextResponse.json({ error: "Unknown bounty" }, { status: 400 })
  }

  const { weekKey, bounties } = await evaluateBountiesForUser(session.id)
  const status = bounties.find((b) => b.key === bounty.key)
  if (!status?.eligible) {
    return NextResponse.json(
      { error: status?.reason ?? "Not eligible yet" },
      { status: 403 },
    )
  }

  const id = bountyId(weekKey, bounty.key)
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
      xpAwarded: bounty.xp,
    },
  })
  await applyPlayerXpGain(user.playerId, bounty.xp)

  return NextResponse.json({ ok: true, xpAwarded: bounty.xp })
}
