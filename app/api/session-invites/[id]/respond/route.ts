import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth"
import {
  InviteActionError,
  respondToSeatInvite,
} from "@/lib/session/invites"

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { id: inviteId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    action?: string
  }

  if (body.action !== "accept" && body.action !== "decline") {
    return NextResponse.json(
      { error: "Action must be 'accept' or 'decline'" },
      { status: 400 },
    )
  }

  try {
    const result = await respondToSeatInvite({
      inviteId,
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
