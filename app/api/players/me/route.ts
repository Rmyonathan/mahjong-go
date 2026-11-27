import { NextResponse } from "next/server"

import {
  createSessionToken,
  getSessionUser,
  requireUser,
  setSessionCookie,
} from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isProMembership } from "@/lib/membership"
import {
  getAvatarFrame,
  isFrameUnlocked,
  isValidAvatarValue,
} from "@/lib/players/avatar-frames"
import { levelFromXp } from "@/lib/xp/progression"

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "JM"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}

export async function GET() {
  const session = await getSessionUser()
  if (!session?.playerId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }
  return NextResponse.json({ playerId: session.playerId })
}

export async function PATCH(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  if (!session.playerId) {
    return NextResponse.json(
      { error: "No player profile linked to this account" },
      { status: 400 },
    )
  }

  const body = (await request.json()) as {
    name?: string
    nickname?: string
    avatarUrl?: string | null
    frameId?: string
  }

  const name = body.name?.trim()
  const nickname = body.nickname?.trim()

  if (body.name !== undefined && (!name || name.length < 2)) {
    return NextResponse.json(
      { error: "Name must be at least 2 characters" },
      { status: 400 },
    )
  }

  if (body.avatarUrl !== undefined && !isValidAvatarValue(body.avatarUrl)) {
    return NextResponse.json(
      { error: "Invalid avatar format or image too large (max ~150KB)" },
      { status: 400 },
    )
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      membershipTier: true,
      proExpiresAt: true,
      player: { select: { experienceXp: true } },
    },
  })
  const level = levelFromXp(currentUser?.player?.experienceXp ?? 0)
  const isPro = currentUser ? isProMembership(currentUser) : false

  let nextFrameId: string | undefined
  if (typeof body.frameId === "string" && body.frameId.trim()) {
    const frame = getAvatarFrame(body.frameId.trim())
    if (!isFrameUnlocked(frame, { level, isPro })) {
      return NextResponse.json(
        { error: `Frame "${frame.name}" requires ${frame.unlockLabel}` },
        { status: 403 },
      )
    }
    nextFrameId = frame.id
  }

  const playerData: {
    name?: string
    nickname?: string
    initials?: string
    avatarUrl?: string | null
    frameId?: string
  } = {}

  if (name) {
    playerData.name = name
    playerData.nickname = nickname || name.split(/\s+/)[0] || name
    playerData.initials = initialsFromName(name)
  } else if (nickname) {
    playerData.nickname = nickname
  }

  if (body.avatarUrl !== undefined) {
    playerData.avatarUrl = body.avatarUrl || null
  }
  if (nextFrameId) {
    playerData.frameId = nextFrameId
  }

  const [player, user] = await prisma.$transaction([
    prisma.player.update({
      where: { id: session.playerId },
      data: playerData,
    }),
    name
      ? prisma.user.update({
          where: { id: session.id },
          data: { name },
        })
      : prisma.user.findUniqueOrThrow({
          where: { id: session.id },
        }),
  ])

  // Refresh JWT display name
  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    playerId: user.playerId,
  })
  await setSessionCookie(token)

  return NextResponse.json({
    player: {
      id: player.id,
      name: player.name,
      nickname: player.nickname,
      initials: player.initials,
    },
  })
}
