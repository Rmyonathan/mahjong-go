"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Share2 } from "lucide-react"

import type { BoardTier } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

const BOARDS: { id: BoardTier; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "advanced", label: "Advanced" },
  { id: "mcr", label: "MCR" },
]

export function BoardFilters({ seasonLabel }: { seasonLabel: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const boardParam = searchParams.get("board")
  const board: BoardTier =
    boardParam === "beginner" || boardParam === "mcr" || boardParam === "advanced"
      ? boardParam
      : "advanced"
  const q = searchParams.get("q")

  function setBoard(next: BoardTier) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    params.set("board", next)
    router.push(`/leaderboard?${params.toString()}`)
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "/leaderboard"
    try {
      if (navigator.share) {
        await navigator.share({ title: "Jade Rank", url })
        return
      }
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore cancel / clipboard denial
    }
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center border-[2px] border-jade-ink bg-card">
          <span className="border-r-[2px] border-jade-ink px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em]">
            Showing
          </span>
          <select
            className="h-10 bg-transparent px-3 font-mono text-xs uppercase tracking-[0.08em] outline-none"
            defaultValue={seasonLabel}
            aria-label="Season"
          >
            <option value={seasonLabel}>{seasonLabel}</option>
          </select>
        </label>

        <div
          className="flex border-[2px] border-jade-ink"
          role="group"
          aria-label="Board"
        >
          <span className="hidden border-r-[2px] border-jade-ink px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] sm:inline">
            Board
          </span>
          {BOARDS.map((item, index) => {
            const active = board === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setBoard(item.id)}
                className={cn(
                  "px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
                  index > 0 && "border-l-[2px] border-jade-ink",
                  active
                    ? "bg-jade-ink text-parchment"
                    : "bg-card text-jade-ink hover:bg-muted",
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={share}
        className="inline-flex h-10 items-center gap-2 border-[2px] border-jade-ink bg-card px-4 font-mono text-[10px] uppercase tracking-[0.16em] shadow-[3px_3px_0_0_var(--jade-ink)] hover:translate-x-px hover:translate-y-px hover:shadow-none"
      >
        <Share2 className="size-3.5" />
        Share standings
      </button>

      {/* Keep linkable state for no-JS crawlers */}
      <Link href="/leaderboard?board=advanced" className="sr-only">
        Advanced board
      </Link>
    </div>
  )
}
