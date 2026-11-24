"use client"

import Link from "next/link"
import { useState } from "react"

import { SeeAllLink } from "@/components/jade/see-all-link"
import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import { usePreviewLimit } from "@/hooks/use-preview-limit"
import type { PersonalSessionHistory } from "@/lib/data/session-history"
import { FREE_SESSION_HISTORY_LIMIT } from "@/lib/membership"
import { boardLabel } from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

export function SessionHistoryList({
  history,
  accountName,
  seeAllHref,
  /** When true, render every visible row (archive page). Free cap still applies upstream. */
  showAll = false,
}: {
  history: PersonalSessionHistory
  accountName?: string
  seeAllHref?: string
  showAll?: boolean
}) {
  const [proOpen, setProOpen] = useState(false)
  const { limit, hasMore } = usePreviewLimit(history.visible.length, {
    forceShowAll: showAll,
  })
  const visible = history.visible.slice(0, limit)
  // Free locked archive: still offer See all so they land on the capped page + upsell
  const showSeeAll =
    Boolean(seeAllHref) &&
    !showAll &&
    (hasMore || history.locked)

  return (
    <section className="jade-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b-[2px] border-jade-ink px-4 py-3">
        <div>
          <h2 className="font-serif text-2xl">
            {showAll ? "All sessions" : "Session history"}
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {history.isPro
              ? "Permanent archive · recent first"
              : `Free · last ${FREE_SESSION_HISTORY_LIMIT} games`}
          </p>
        </div>
        {history.isPro ? (
          <span className="rounded-full border border-jade-gold bg-jade-gold/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-jade-ink">
            Permanent archive
          </span>
        ) : (
          <span className="rounded-full border border-[#102A20]/15 bg-white px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em]">
            Free · {FREE_SESSION_HISTORY_LIMIT} max
          </span>
        )}
      </div>

      {history.visible.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">
          No finished tables yet. Sit a live session to fill this ledger.
        </p>
      ) : (
        <ul className="divide-y divide-jade-ink/20">
          {visible.map((row) => (
            <li key={row.id}>
              <Link
                href={`/session/${row.id}`}
                className="tap-press block px-4 py-3.5 transition hover:bg-jade-soft/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {new Date(row.startedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {boardLabel(row.boardType)} · {row.wind}
                    </p>
                    <p className="mt-1 font-serif text-xl leading-none">
                      {row.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {row.placementLabel}
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-mono text-sm font-semibold",
                        row.netPoints >= 0
                          ? "text-jade-accent"
                          : "text-jade-red",
                      )}
                    >
                      {row.netLabel}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showSeeAll && seeAllHref ? (
        <SeeAllLink
          href={seeAllHref}
          label={
            history.locked
              ? `See all · ${history.visible.length} free + upgrade`
              : `See all · ${history.visible.length} sessions`
          }
        />
      ) : null}

      {history.locked ? (
        <div className="relative border-t border-dashed border-jade-ink/30">
          <div
            className="pointer-events-none select-none px-4 py-4 blur-[2px] opacity-50"
            aria-hidden
          >
            <p className="font-serif text-xl">Older session locked</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em]">
              Net · placement · board
            </p>
          </div>
          <div className="absolute inset-0 flex flex-col items-stretch justify-center bg-[#F6F4EE]/75 px-4 py-4 backdrop-blur-[1px]">
            <p className="text-sm text-jade-ink">
              Showing {history.limit} of {history.total} sessions · Free accounts
              store your last {history.limit} games. Upgrade to Pro (Rp 29k/mo)
              to unlock your permanent archive.
            </p>
            <button
              type="button"
              onClick={() => setProOpen(true)}
              className="scan-cta-accent mt-3 inline-flex h-10 items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      ) : null}

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
      />
    </section>
  )
}
