import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { syncPlayerExperienceFromXp } from "@/lib/xp/apply"
import { getXpProgress } from "@/lib/xp/progression"

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ user: null, progress: null })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      playerId: true,
      player: {
        select: {
          id: true,
          name: true,
          nickname: true,
          experienceXp: true,
          experienceLevelId: true,
          skillRating: true,
        },
      },
    },
  })

  if (!user?.player) {
    return NextResponse.json({
      user: { id: user?.id, name: user?.name, playerId: user?.playerId },
      progress: null,
    })
  }

  await syncPlayerExperienceFromXp(user.player.id)
  const fresh = await prisma.player.findUnique({
    where: { id: user.player.id },
  })
  if (!fresh) {
    return NextResponse.json({ user, progress: null })
  }

  const progress = getXpProgress(fresh.experienceXp)
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      playerId: fresh.id,
      skillRating: fresh.skillRating,
    },
    progress: {
      xp: progress.xp,
      level: progress.level,
      bandTitle: progress.band.title,
      bandRange: progress.band.levelRange,
      experienceLevelId: progress.experienceLevelId,
      experienceLevelName: progress.experienceLevel.name,
      xpIntoLevel: progress.xpIntoLevel,
      xpForNextLevel: progress.xpForNextLevel,
      pctToNext: progress.pctToNext,
      nextBandTitle: progress.nextBand?.title ?? null,
      xpToNextBand: progress.xpToNextBand,
    },
  })
}
