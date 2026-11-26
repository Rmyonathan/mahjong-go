import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { reviewHandClinicSubmission } from "@/lib/hand-clinic/service"

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json(
      { error: "Coaching staff / admin only" },
      { status: 403 },
    )
  }

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as {
    coachNote?: string
  }

  if (!body.coachNote?.trim()) {
    return NextResponse.json(
      { error: "Coach breakdown cannot be empty" },
      { status: 400 },
    )
  }

  await reviewHandClinicSubmission({
    id,
    coachName: admin.name,
    coachNote: body.coachNote,
  })

  return NextResponse.json({ ok: true })
}
