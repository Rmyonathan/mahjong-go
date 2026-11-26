import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { listPendingSeatInvitesForUser } from "@/lib/session/invites"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ invites: [] })
  }

  const invites = await listPendingSeatInvitesForUser(user.id)
  return NextResponse.json({ invites })
}
