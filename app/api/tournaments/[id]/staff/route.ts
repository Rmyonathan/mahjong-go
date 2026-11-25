import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { canAdministerTournament } from "@/lib/tournaments/staff"

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { id } = await params
  const tournament = await prisma.tournament.findUnique({ where: { id } })
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  if (!canAdministerTournament(user.id, user.role, tournament.createdById)) {
    return NextResponse.json({ error: "Admin or creator only" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    panitiaUserId?: string | null
    wasitUserId?: string | null
  }

  const panitiaUserId =
    body.panitiaUserId === null
      ? null
      : body.panitiaUserId?.trim()
        ? body.panitiaUserId.trim()
        : undefined
  const wasitUserId =
    body.wasitUserId === null
      ? null
      : body.wasitUserId?.trim()
        ? body.wasitUserId.trim()
        : undefined

  const ids = [panitiaUserId, wasitUserId].filter(
    (value): value is string => Boolean(value),
  )
  if (ids.length > 0) {
    const found = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })
    if (found.length !== ids.length) {
      return NextResponse.json({ error: "Invalid staff user" }, { status: 400 })
    }
  }

  const updated = await prisma.tournament.update({
    where: { id },
    data: {
      ...(panitiaUserId !== undefined ? { panitiaUserId } : {}),
      ...(wasitUserId !== undefined ? { wasitUserId } : {}),
    },
    include: {
      panitiaUser: { select: { name: true } },
      wasitUser: { select: { name: true } },
    },
  })

  return NextResponse.json({
    panitiaUserId: updated.panitiaUserId,
    panitiaName: updated.panitiaUser?.name ?? null,
    wasitUserId: updated.wasitUserId,
    wasitName: updated.wasitUser?.name ?? null,
  })
}