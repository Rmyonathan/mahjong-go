import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { syncExpiredPro, toMembershipSnapshot } from "@/lib/membership"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ user: null })

  await syncExpiredPro(session.id)

  const full = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      membershipTier: true,
      proExpiresAt: true,
      playerId: true,
      player: {
        select: {
          initials: true,
          avatarUrl: true,
          frameId: true,
        },
      },
    },
  })
  if (!full) return NextResponse.json({ user: null })

  const membership = toMembershipSnapshot(full)
  return NextResponse.json({
    user: {
      ...full,
      proExpiresAt: full.proExpiresAt?.toISOString() ?? null,
      membershipTier: membership.membershipTier,
      isPro: membership.isPro,
    },
  })
}
