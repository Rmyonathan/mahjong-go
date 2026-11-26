import { NextResponse } from "next/server"

import { getSessionUser, requireUser } from "@/lib/auth"
import {
  listNotificationsForUser,
  markNotificationsRead,
} from "@/lib/notifications/service"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }

  const result = await listNotificationsForUser(user.id)
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string }
  await markNotificationsRead(user.id, body.id)
  return NextResponse.json({ ok: true })
}
