import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

/** Live search for registered Jade players by name or nickname. */
export async function GET(request: Request) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  if (!q) {
    return NextResponse.json({ players: [] })
  }

  const players = await prisma.player.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { nickname: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      nickname: true,
      initials: true,
      district: true,
      skillRating: true,
    },
    orderBy: { name: "asc" },
    take: 8,
  })

  return NextResponse.json({ players })
}
