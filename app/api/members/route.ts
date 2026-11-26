import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

/** Club roster for seat assignment — real User accounts (+ linked Player). */
export async function GET(request: Request) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() || ""

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { player: { name: { contains: q, mode: "insensitive" } } },
            { player: { nickname: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      playerId: true,
      player: {
        select: {
          id: true,
          name: true,
          nickname: true,
          initials: true,
          skillRating: true,
        },
      },
    },
  })

  const members = users.map((user) => ({
    userId: user.id,
    playerId: user.playerId,
    name: user.player?.name ?? user.name,
    nickname: user.player?.nickname ?? user.name.split(" ")[0] ?? user.name,
    initials: user.player?.initials ?? user.name.slice(0, 2).toUpperCase(),
    skillRating: user.player?.skillRating ?? null,
    email: user.email,
  }))

  return NextResponse.json({ members })
}
