import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import {
  finishGameSession,
  getGameSession,
  serializeSession,
} from "@/lib/session/service"

export async function POST(
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
  const existing = await getGameSession(id)
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const isCaptain = user.id === existing.captainUserId
  const isAdmin = user.role === "ADMIN"
  if (!isCaptain && !isAdmin) {
    return NextResponse.json(
      { error: "Only the table captain can finish the session" },
      { status: 403 },
    )
  }

  try {
    const session = await finishGameSession(id)
    return NextResponse.json({ session: serializeSession(session) })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not finish session"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
