"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { MonitorPlay, Share2 } from "lucide-react"

import type { BoardTier } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

const BOARDS: { id: BoardTier | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "beginner", label: "Beginner" },
  { id: "advanced", label: "Advanced" },
  { id: "mcr", label: "MCR" },
]

export function BoardFilters({ seasonLabel }: { seasonLabel: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const boardParam = searchParams.get("board")
  const board: BoardTier | "all" =
    boardParam === "beginner" ||
    boardParam === "mcr" ||
    boardParam === "advanced" ||
    boardParam === "all"
      ? boardParam
      : "all"
  const q = searchParams.get("q")

  function setBoard(next: BoardTier | "all") {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    params.set("board", next)
    router.push(`/leaderboard?${params.toString()}`)
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "/leaderboard"
    try {
      if (navigator.share) {
        await navigator.share({ title: "Jade Leaderboard", url })
        return
      }
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore cancel / clipboard denial
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#102A20]/10 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {seasonLabel}
        </span>

        <div
          className="inline-flex rounded-full border border-[#102A20]/10 bg-white p-1 shadow-sm"
          role="group"
          aria-label="Board"
        >
          {BOARDS.map((item) => {
            const active = board === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setBoard(item.id)}
                className={cn(
                  "tap-press rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-jade-soft text-jade-accent"
                    : "text-jade-ink/70 hover:bg-jade-soft/60",
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={share}
          className="tap-press inline-flex h-10 items-center gap-2 rounded-full border border-[#102A20]/10 bg-white px-3.5 text-xs font-semibold text-jade-ink shadow-sm hover:bg-jade-soft"
        >
          <Share2 className="size-3.5" />
          Share
        </button>
        <Link
          href="/leaderboard?tv=1"
          className="tap-press inline-flex h-10 items-center gap-2 rounded-full border border-[#102A20]/10 bg-white px-3.5 text-xs font-semibold text-jade-ink shadow-sm hover:bg-jade-soft"
        >
          <MonitorPlay className="size-3.5" />
          TV Mode
        </Link>
      </div>
    </div>
  )
}
