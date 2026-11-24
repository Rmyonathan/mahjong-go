import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { searchPersonalSessions } from "@/lib/data/session-history"
import { prisma } from "@/lib/db"
import { isProMembership, syncExpiredPro } from "@/lib/membership"

/**
 * Pro-only: search finished sessions the viewer sat (title or table-mate).
 * Free accounts get locked:true so the search UI can upsell.
 */
export async function GET(request: Request) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  await syncExpiredPro(session.id)

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      role: true,
      membershipTier: true,
      proExpiresAt: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  const isPro = isProMembership(user) || user.role === "ADMIN"
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ sessions: [], locked: !isPro, isPro })
  }

  if (!isPro) {
    return NextResponse.json({
      sessions: [],
      locked: true,
      isPro: false,
    })
  }

  const sessions = await searchPersonalSessions(user.id, q)
  return NextResponse.json({ sessions, locked: false, isPro: true })
}
