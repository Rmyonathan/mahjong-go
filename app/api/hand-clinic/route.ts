import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  createHandClinicSubmission,
  listHandClinicSubmissions,
  listUserSubmittableLostHands,
} from "@/lib/hand-clinic/service"
import { isProMembership, syncExpiredPro } from "@/lib/membership"

export async function GET() {
  const session = await getSessionUser()
  let isPro = false
  let isAdmin = false
  let myLostHands: Awaited<ReturnType<typeof listUserSubmittableLostHands>> = []

  if (session) {
    await syncExpiredPro(session.id)
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        role: true,
        membershipTier: true,
        proExpiresAt: true,
      },
    })
    if (user) {
      isAdmin = user.role === "ADMIN"
      isPro = isProMembership(user) || isAdmin
      if (isPro) {
        myLostHands = await listUserSubmittableLostHands(user.id)
      }
    }
  }

  const { items, lockedCount } = await listHandClinicSubmissions({ isPro })

  return NextResponse.json({
    items,
    lockedCount,
    isPro,
    isAdmin,
    loggedIn: Boolean(session),
    myLostHands,
  })
}

export async function POST(request: Request) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  await syncExpiredPro(session.id)
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      role: true,
      membershipTier: true,
      proExpiresAt: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  const isPro = isProMembership(user) || user.role === "ADMIN"
  if (!isPro) {
    return NextResponse.json(
      { error: "Pro membership required to submit hands to Hand Clinic" },
      { status: 403 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string
    handNumber?: number
    notes?: string
  }

  if (!body.sessionId || !body.handNumber || !body.notes?.trim()) {
    return NextResponse.json(
      { error: "Select a hand and add your question for the coach" },
      { status: 400 },
    )
  }

  try {
    const id = await createHandClinicSubmission({
      userId: user.id,
      sessionId: body.sessionId,
      handNumber: Number(body.handNumber),
      notes: body.notes,
    })
    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not submit hand",
      },
      { status: 400 },
    )
  }
}
