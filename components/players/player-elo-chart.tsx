"use client"

import { useState } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"

import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import type { EloSnapshotPoint } from "@/lib/elo/snapshots"
import { cn } from "@/lib/utils"

export function PlayerEloChart({
  history,
  currentRating,
  unlocked,
  accountName,
}: {
  history: EloSnapshotPoint[]
  currentRating: number
  unlocked: boolean
  accountName?: string
}) {
  const [proOpen, setProOpen] = useState(false)

  // Build plotted points: prepend ratingBefore of first snapshot so a 1-session player still has a 2-point line
  const plotted =
    history.length > 0
      ? [
          {
            label: "Start",
            rating: history[0]!.ratingBefore,
            delta: 0,
            title: "Starting rating",
          },
          ...history.map((pt, idx) => ({
            label: `#${idx + 1}`,
            rating: pt.ratingAfter,
            delta: pt.delta,
            title: pt.sessionTitle,
          })),
        ]
      : [
          { label: "Now", rating: currentRating, delta: 0, title: "Current rating" },
        ]

  const samplePlotted = [
    { label: "Start", rating: 1500, delta: 0, title: "Start" },
    { label: "#1", rating: 1516, delta: 16, title: "Session 1" },
    { label: "#2", rating: 1504, delta: -12, title: "Session 2" },
    { label: "#3", rating: 1528, delta: 24, title: "Session 3" },
    { label: "#4", rating: 1542, delta: 14, title: "Session 4" },
  ]

  const activePoints = unlocked ? plotted : samplePlotted
  const ratings = activePoints.map((p) => p.rating)
  const rawMin = Math.min(...ratings)
  const rawMax = Math.max(...ratings)
  const pad = Math.max(15, Math.round((rawMax - rawMin) * 0.2))
  const minVal = rawMin - pad
  const maxVal = rawMax + pad
  const span = Math.max(1, maxVal - minVal)

  const width = 520
  const height = 160
  const left = 18
  const right = 18
  const top = 16
  const bottom = 22
  const plotW = width - left - right
  const plotH = height - top - bottom

  const coords = activePoints.map((pt, idx) => {
    const x =
      activePoints.length === 1
        ? left + plotW / 2
        : left + (idx / (activePoints.length - 1)) * plotW
    const y = top + (1 - (pt.rating - minVal) / span) * plotH
    return { ...pt, x, y }
  })

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ")
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1]!.x.toFixed(1)} ${(top + plotH).toFixed(1)} L ${coords[0]!.x.toFixed(1)} ${(top + plotH).toFixed(1)} Z`
      : ""

  const netDelta =
    history.length > 0
      ? history[history.length - 1]!.ratingAfter - history[0]!.ratingBefore
      : 0

  return (
    <>
      <section className="jade-card relative mt-6 overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Pro analytics · Skill Rating
            </p>
            <h2 className="mt-1 font-serif text-2xl">ELO Progression</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-semibold text-jade-ink">
              {currentRating}
            </span>
            {unlocked && history.length > 0 ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                  netDelta >= 0
                    ? "bg-jade-soft text-jade-accent"
                    : "bg-jade-red/15 text-jade-red",
                )}
              >
                {netDelta >= 0 ? (
                  <TrendingUp className="size-3" aria-hidden />
                ) : (
                  <TrendingDown className="size-3" aria-hidden />
                )}
                {netDelta >= 0 ? `+${netDelta}` : netDelta}
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative mt-4">
          <div className={cn(!unlocked && "select-none blur-[5px]")}>
            {unlocked && history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#102A20]/20 bg-parchment/60 px-4 py-8 text-center text-sm text-muted-foreground">
                No ELO snapshots recorded yet. Finish a live table with 2+
                registered players to plot your rating progression.
              </div>
            ) : (
              <>
                <div className="w-full overflow-hidden rounded-xl border border-[#102A20]/10 bg-parchment/50 p-2">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="h-40 w-full"
                    role="img"
                    aria-label="ELO rating progression chart"
                  >
                    <defs>
                      <linearGradient id="eloFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#16794C" stopOpacity="0.24" />
                        <stop offset="100%" stopColor="#16794C" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {[0.25, 0.5, 0.75].map((pct) => {
                      const y = top + pct * plotH
                      return (
                        <line
                          key={pct}
                          x1={left}
                          x2={width - right}
                          y1={y}
                          y2={y}
                          stroke="currentColor"
                          strokeOpacity="0.1"
                          strokeDasharray="3 4"
                        />
                      )
                    })}

                    {areaPath ? <path d={areaPath} fill="url(#eloFill)" /> : null}

                    {coords.length > 1 ? (
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#16794C"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}

                    {coords.map((pt, idx) => (
                      <g key={`${pt.label}-${idx}`}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={idx === coords.length - 1 ? 4.5 : 3.2}
                          fill={idx === coords.length - 1 ? "#B07A1A" : "#16794C"}
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                        <title>{`${pt.title}: ${pt.rating}`}</title>
                      </g>
                    ))}
                  </svg>
                </div>

                {history.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {history.slice(-6).map((pt) => (
                      <span
                        key={pt.id}
                        title={pt.sessionTitle}
                        className={cn(
                          "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]",
                          pt.delta >= 0
                            ? "border-jade-accent/30 bg-jade-soft/60 text-jade-accent"
                            : "border-jade-red/30 bg-jade-red/10 text-jade-red",
                        )}
                      >
                        {pt.sessionTitle.slice(0, 16)} ·{" "}
                        {pt.delta >= 0 ? `+${pt.delta}` : pt.delta}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>

          {!unlocked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-parchment/75 p-4 text-center backdrop-blur-[2px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-jade-gold">
                Pro analytics
              </p>
              <p className="mt-1 max-w-sm text-sm font-medium text-jade-ink">
                Unlock your full ELO progression line graph and per-session
                rating swings.
              </p>
              <button
                type="button"
                onClick={() => setProOpen(true)}
                className="tap-press mt-3 inline-flex h-9 items-center rounded-full bg-jade-accent px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white shadow-sm"
              >
                Unlock with Pro · Rp 29k/mo
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
      />
    </>
  )
}
