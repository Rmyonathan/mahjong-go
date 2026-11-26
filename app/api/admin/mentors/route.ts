import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth"
import {
  listMentorApplications,
  reviewMentorApplication,
} from "@/lib/mentors/service"
import { createPlayerNotification } from "@/lib/notifications/service"

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const applications = await listMentorApplications()
  return NextResponse.json({ applications })
}

export async function POST(request: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string
    action?: string
  }
  if (
    !body.id ||
    (body.action !== "approve" && body.action !== "reject")
  ) {
    return NextResponse.json(
      { error: "id and action ('approve' | 'reject') are required" },
      { status: 400 },
    )
  }

  const userId = await reviewMentorApplication({
    id: body.id,
    action: body.action,
    reviewedById: admin.id,
  })

  if (!userId) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  if (body.action === "approve") {
    await createPlayerNotification({
      userId,
      kind: "MENTOR",
      title: "Certified Coach Badge Unlocked",
      body: "You are now a Certified Table Mentor! You can host paid beginner Guided Tables on Schedule.",
      href: "/schedule?create=1",
    }).catch(() => undefined)
  }

  return NextResponse.json({ ok: true })
}
