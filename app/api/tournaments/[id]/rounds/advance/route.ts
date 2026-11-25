import { NextResponse } from "next/server"

/** Legacy path — use POST /api/tournaments/actions/rounds-advance */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Use POST /api/tournaments/actions/rounds-advance (close KO by table score + auto roll)",
    },
    { status: 410 },
  )
}