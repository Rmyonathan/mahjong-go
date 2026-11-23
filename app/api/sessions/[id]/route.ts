import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import { getGameSession, serializeSession } from "@/lib/session/service"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { id } = await context.params
  const session = await getGameSession(id)
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  return NextResponse.json({
    session: serializeSession(session),
    viewer: {
      id: user.id,
      name: user.name,
      role: user.role,
      isCaptain: user.id === session.captainUserId || user.role === "ADMIN",
    },
  })
}
