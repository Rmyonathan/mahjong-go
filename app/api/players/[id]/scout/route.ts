import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { getPlayerProfile } from "@/lib/data/player-profile"
import { prisma } from "@/lib/db"
import { isProMembership, syncExpiredPro } from "@/lib/membership"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * Pre-game opponent scouting report.
 * Returns basic rank & archetype to logged-in users; unlocks Fan DNA,
 * win-method ratios, and rivalry stats for Pro / Admin viewers.
 */
export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  await syncExpiredPro(session.id)

  const [viewer, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        role: true,
        membershipTier: true,
        proExpiresAt: true,
      },
    }),
    params.then(({ id }) => getPlayerProfile(id)),
  ])

  if (!profile) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 })
  }

  const isPro = viewer
    ? isProMembership(viewer) || viewer.role === "ADMIN"
    : false

  const totalWins = profile.selfDraw + profile.discardWins
  const selfDrawPct =
    totalWins > 0 ? Math.round((profile.selfDraw / totalWins) * 100) : 0
  const discardPct = totalWins > 0 ? 100 - selfDrawPct : 0

  return NextResponse.json({
    isPro,
    player: {
      id: profile.player.id,
      name: profile.player.name,
      nickname: profile.player.nickname,
      initials: profile.player.initials,
      district: profile.player.district,
    },
    skillRating: profile.skillRating,
    skillTierName: profile.skillTierName,
    experienceLevelNumber: profile.experienceLevelNumber,
    experienceBandTitle: profile.experienceBandTitle,
    games: profile.games,
    winRateLabel: profile.winRateLabel,
    playstyle: profile.playstyle,
    scouting: isPro
      ? {
          selfDraw: profile.selfDraw,
          discardWins: profile.discardWins,
          dealtIn: profile.dealtIn,
          selfDrawPct,
          discardPct,
          fanDna: profile.proInsights.fanDna,
          nemesis: profile.proInsights.nemesis,
          victim: profile.proInsights.victim,
        }
      : null,
  })
}
