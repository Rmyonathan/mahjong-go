"use client"

import Link from "next/link"
import { useState } from "react"

import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import type { PlayerProInsights } from "@/lib/data/player-profile"
import { formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

export function PlayerProTeaser({
  insights,
  unlocked,
  accountName,
}: {
  insights: PlayerProInsights
  /** True when the viewer has active Pro (or admin). */
  unlocked: boolean
  accountName?: string
}) {
  const [proOpen, setProOpen] = useState(false)

  const nemesisLine = insights.nemesis
    ? insights.nemesis.name
    : "No discard losses yet"
  const victimLine = insights.victim
    ? insights.victim.name
    : "No discard wins yet"
  const nemesisSub = insights.nemesis
    ? `${formatSignedPoints(-insights.nemesis.points)} · ${insights.nemesis.hands} hands`
    : "Need finished tables"
  const victimSub = insights.victim
    ? `${formatSignedPoints(insights.victim.points)} · ${insights.victim.hands} hands`
    : "Need finished tables"

  return (
    <>
      <section className="jade-card relative overflow-hidden p-4 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Pro insights
        </p>
        <h2 className="mt-2 font-serif text-2xl">Nemesis · victim · Fan DNA</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Real HandRecord tallies from finished tables — who you paid, who paid
          you, and the combos you claim most.
        </p>

        <div className={cn("relative mt-5 space-y-3", !unlocked && "select-none")}>
          <div className={cn(!unlocked && "blur-[5px]")} aria-hidden={!unlocked}>
            <MatchCard
              tone="nemesis"
              title="Nemesis"
              name={nemesisLine}
              subtitle={nemesisSub}
              href={
                unlocked && insights.nemesis?.playerId
                  ? `/players/${insights.nemesis.playerId}`
                  : undefined
              }
            />
            <div className="mt-3">
              <MatchCard
                tone="victim"
                title="Victim"
                name={victimLine}
                subtitle={victimSub}
                href={
                  unlocked && insights.victim?.playerId
                    ? `/players/${insights.victim.playerId}`
                    : undefined
                }
              />
            </div>
            <div className="mt-3 border-[2px] border-jade-ink bg-parchment p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Fan DNA · most claimed
              </p>
              {insights.fanDna.length === 0 ? (
                <p className="mt-2 font-serif text-lg">No combo ledger yet</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {insights.fanDna.map((combo) => (
                    <li
                      key={combo.label}
                      className="flex items-baseline justify-between gap-3 font-mono text-xs"
                    >
                      <span className="truncate">{combo.label}</span>
                      <span className="shrink-0 text-jade-accent">
                        {combo.count}×
                        {combo.totalFan > 0 ? ` · ${combo.totalFan}f` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {!unlocked ? (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-parchment via-parchment/40 to-transparent" />
          ) : null}
        </div>

        {!unlocked ? (
          <button
            type="button"
            onClick={() => setProOpen(true)}
            className="scan-cta-accent relative mt-4 inline-flex h-11 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            Upgrade to Pro · Rp 29k/mo
          </button>
        ) : (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
            Pro unlocked · live matchup math
          </p>
        )}
      </section>

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
      />
    </>
  )
}

function MatchCard({
  tone,
  title,
  name,
  subtitle,
  href,
}: {
  tone: "nemesis" | "victim"
  title: string
  name: string
  subtitle: string
  href?: string
}) {
  const body = (
    <>
      <p
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.14em]",
          tone === "nemesis" ? "text-jade-red" : "text-jade-accent",
        )}
      >
        {title}
      </p>
      <p className="mt-1 font-serif text-xl">{name}</p>
      <p className="mt-2 font-mono text-xs">{subtitle}</p>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block border-[2px] border-jade-ink bg-parchment p-3 transition hover:translate-x-px hover:translate-y-px"
      >
        {body}
      </Link>
    )
  }

  return (
    <div className="border-[2px] border-jade-ink bg-parchment p-3">{body}</div>
  )
}
