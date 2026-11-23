import { NextResponse } from "next/server"

import { registerMember } from "@/lib/auth"

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string
    email?: string
    username?: string
    password?: string
  }

  const name = body.name?.trim() ?? ""
  const emailOrUsername = (body.email ?? body.username ?? "").trim()
  const password = body.password ?? ""

  try {
    const user = await registerMember({ name, emailOrUsername, password })
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          playerId: user.playerId,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create account"
    const status = message.includes("already") ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
