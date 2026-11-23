import { NextResponse } from "next/server"

import {
  createSessionToken,
  getSessionUser,
  requireUser,
  setSessionCookie,
} from "@/lib/auth"
import { prisma } from "@/lib/db"

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
  }

  const name = body.name?.trim()
  const nickname = body.nickname?.trim()

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "Name must be at least 2 characters" },
      { status: 400 },
    )
  }

  const nextNickname = nickname || name.split(/\s+/)[0] || name

  const [player, user] = await prisma.$transaction([
    prisma.player.update({
      where: { id: session.playerId },
      data: {
        name,
        nickname: nextNickname,
        initials: initialsFromName(name),
      },
    }),
    prisma.user.update({
      where: { id: session.id },
      data: { name },
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
