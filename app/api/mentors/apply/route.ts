import { NextResponse } from "next/server"

import { getSessionUser, requireUser } from "@/lib/auth"
import { applyForMentor, getMentorStatusForUser } from "@/lib/mentors/service"

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const status = await getMentorStatusForUser(session.id)
  return NextResponse.json(status)
}

export async function POST(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { bio?: string }
  try {
    await applyForMentor({ userId: user.id, bio: body.bio ?? "" })
    const status = await getMentorStatusForUser(user.id)
    return NextResponse.json(status, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not apply" },
      { status: 400 },
    )
  }
}
