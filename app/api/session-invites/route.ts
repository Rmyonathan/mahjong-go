import { NextResponse } from "next/server"

import { getSessionUser, requireUser } from "@/lib/auth"
import {
  InviteActionError,
  listPendingSeatInvitesForUser,
  respondToSeatInvite,
} from "@/lib/session/invites"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ invites: [] })
  }

  const invites = await listPendingSeatInvitesForUser(user.id)
  return NextResponse.json({ invites })
}

export async function POST(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    inviteId?: string
    action?: string
  }

  if (
    !body.inviteId ||
    (body.action !== "accept" && body.action !== "decline")
  ) {
    return NextResponse.json(
      { error: "inviteId and action ('accept' | 'decline') are required" },
      { status: 400 },
    )
  }

  try {
    const result = await respondToSeatInvite({
      inviteId: body.inviteId,
      userId: user.id,
      action: body.action,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof InviteActionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      )
    }
    throw error
  }
}
