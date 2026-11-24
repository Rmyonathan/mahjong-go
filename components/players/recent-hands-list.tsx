"use client"

import Link from "next/link"

import { SeeAllLink } from "@/components/jade/see-all-link"
import { usePreviewLimit } from "@/hooks/use-preview-limit"
import type { RecentHandSummary } from "@/lib/data/player-profile"
import { formatPlainPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

export function RecentHandsList({
  hands,
  seeAllHref,
  showAll = false,
}: {
  hands: RecentHandSummary[]
  seeAllHref?: string
  showAll?: boolean
}) {
  const { limit, hasMore } = usePreviewLimit(hands.length, {
    forceShowAll: showAll,
  })
  const visible = hands.slice(0, limit)
  const showSeeAll = Boolean(seeAllHref) && !showAll && hasMore

  return (
    <section className="jade-card overflow-hidden">
      <div className="border-b-[2px] border-jade-ink px-4 py-3">
        <h2 className="font-serif text-2xl">
          {showAll ? "All hands" : "Recent hands"}
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          From finished live tables · recent first
        </p>
      </div>

      {hands.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">
          No scored hands on file yet. Sit a live table to fill this ledger.
        </p>
      ) : (
        <ol className="divide-y divide-jade-ink/30">
          {visible.map((hand) => (
            <li key={hand.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Hand {String(hand.handNumber).padStart(2, "0")} ·{" "}
                    {hand.method}
                  </p>
                  <Link
                    href={`/session/${hand.sessionId}`}
                    className="mt-1 inline-block font-serif text-xl leading-none underline-offset-2 hover:underline"
                  >
                    {hand.sessionTitle}
                  </Link>
                </div>
                <span
                  className={cn(
                    "border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
                    hand.role === "win" &&
                      "border-jade-accent bg-card text-jade-accent",
                    hand.role === "dealt-in" &&
                      "border-jade-red bg-card text-jade-red",
                    hand.role === "played" && "border-jade-ink bg-muted",
                  )}
                >
                  {hand.role}
                </span>
              </div>
              {hand.points > 0 ? (
                <p className="mt-2 font-mono text-sm text-jade-accent">
                  {formatPlainPoints(hand.points)}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {showSeeAll && seeAllHref ? (
        <SeeAllLink
          href={seeAllHref}
          label={`See all · ${hands.length} hands`}
        />
      ) : null}
    </section>
  )
}
