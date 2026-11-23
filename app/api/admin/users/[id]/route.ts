import { NextResponse } from "next/server"

import { hashPassword, requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isProMembership, proGrantExpiry } from "@/lib/membership"

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = (await request.json()) as {
    name?: string
    role?: "ADMIN" | "MEMBER"
    password?: string
    playerId?: string | null
    /** One-click Set PRO (30 days) / clear Pro. */
    setPro30Days?: boolean
  }

  const data: {
    name?: string
    role?: "ADMIN" | "MEMBER"
    passwordHash?: string
    playerId?: string | null
    membershipTier?: "FREE" | "PRO"
    proExpiresAt?: Date | null
  } = {}

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
  if (body.role === "ADMIN" || body.role === "MEMBER") data.role = body.role
  if (typeof body.password === "string" && body.password.length >= 6) {
    data.passwordHash = await hashPassword(body.password)
  }
  if (body.playerId === null || typeof body.playerId === "string") {
    data.playerId = body.playerId
  }
  if (typeof body.setPro30Days === "boolean") {
    if (body.setPro30Days) {
      data.membershipTier = "PRO"
      data.proExpiresAt = proGrantExpiry()
    } else {
      data.membershipTier = "FREE"
      data.proExpiresAt = null
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        membershipTier: true,
        proExpiresAt: true,
        playerId: true,
        createdAt: true,
      },
    })
    return NextResponse.json({
      user: {
        ...user,
        proExpiresAt: user.proExpiresAt?.toISOString() ?? null,
        isPro: isProMembership(user),
      },
    })
  } catch {
    return NextResponse.json({ error: "User not found or update failed" }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  if (admin.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
}
