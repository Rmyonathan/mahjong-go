import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { BOUNTY_CATALOG } from "@/lib/bounty/catalog"
import { shuffleWeeklyBounties } from "@/lib/bounty/generate"
import {
  getWeeklyBounties,
  resetWeeklyBounties,
} from "@/lib/bounty/store"
import { currentWeekKey } from "@/lib/bounty/weekly"

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const weekKey = currentWeekKey()
  const week = await getWeeklyBounties(weekKey)
  return NextResponse.json({
    ...week,
    weekKey,
    catalog: BOUNTY_CATALOG.map((t) => ({
      key: t.key,
      title: t.title,
      xpMin: t.xpMin,
      xpMax: t.xpMax,
    })),
  })
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: "shuffle" | "generate" | "reset"
  }
  // "generate" kept as alias so old UI clicks still work
  const action = body.action === "reset" ? "reset" : "shuffle"
  const weekKey = currentWeekKey()

  if (action === "reset") {
    const week = await resetWeeklyBounties(weekKey)
    return NextResponse.json({ ok: true, action: "reset", ...week })
  }

  const shuffled = await shuffleWeeklyBounties(weekKey)
  return NextResponse.json({ ok: true, action: "shuffle", ...shuffled })
}
