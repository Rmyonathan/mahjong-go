import { NextResponse } from "next/server"

import { hashPassword, requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      playerId: true,
      createdAt: true,
      player: { select: { nickname: true, name: true } },
    },
  })
  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as {
    email?: string
    name?: string
    password?: string
    role?: "ADMIN" | "MEMBER"
    playerId?: string | null
  }

  const email = body.email?.trim().toLowerCase()
  const name = body.name?.trim()
  const password = body.password ?? ""
  if (!email || !name || password.length < 6) {
    return NextResponse.json(
      { error: "Name, email, and password (6+ chars) required" },
      { status: 400 },
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 })
  }

  if (body.playerId) {
    const player = await prisma.player.findUnique({ where: { id: body.playerId } })
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 400 })
    }
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role: body.role === "ADMIN" ? "ADMIN" : "MEMBER",
      playerId: body.playerId || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      playerId: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ user }, { status: 201 })
}
