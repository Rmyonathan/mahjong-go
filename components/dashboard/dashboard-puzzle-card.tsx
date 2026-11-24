"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export function DashboardPuzzleCard() {
  const [solved, setSolved] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/puzzle/today")
      .then(async (response) => {
        if (!response.ok) return
        const data = (await response.json()) as {
          vote?: { discardTileId?: string } | null
          alreadyVoted?: boolean
        }
        if (cancelled) return
        setSolved(Boolean(data.alreadyVoted || data.vote?.discardTileId))
      })
      .catch(() => {
        if (!cancelled) setSolved(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="jade-card flex flex-col p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Daily WWYD
      </p>
      <h3 className="mt-1 font-serif text-2xl leading-none">
        {solved ? "Solved today" : "Today’s puzzle"}
      </h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">
        {solved
          ? "Nice — come back tomorrow for a fresh discard call."
          : "What would you discard? One vote per day."}
      </p>
      <Link
        href="/puzzle"
        className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-jade-accent px-4 text-sm font-semibold text-white"
      >
        {solved ? "Review puzzle →" : "Play now →"}
      </Link>
    </section>
  )
}
