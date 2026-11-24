"use client"

import * as React from "react"
import { Trophy } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ScoreResult } from "@/lib/mahjong/engine"
import { formatJadeMiles, getJadePayout } from "@/lib/mahjong/payout"
import { rulesetMeta } from "@/lib/mahjong/rulesets"
import { cn } from "@/lib/utils"

interface WinScoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  score: ScoreResult | null
  applyToSessionId?: string | null
  tileIds?: string[]
  onApplyToSession?: (payload: {
    totalFan: number
    pointsRon: number
    pointsTsumo: number
    combos: { label: string; fan: number }[]
    tileIds: string[]
  }) => void
}

export function WinScoreDialog({
  open,
  onOpenChange,
  score,
  applyToSessionId,
  tileIds = [],
  onApplyToSession,
}: WinScoreDialogProps) {
  if (!score) return null

  const payout = getJadePayout(score.totalFan)
  const meta = rulesetMeta(score.variant)
  const handPatterns = score.patterns.filter(
    (p) =>
      !p.key.startsWith("own-bonus") &&
      !p.key.startsWith("round-bonus") &&
      p.key !== "no-flowers",
  )
  const flowerPatterns = score.patterns.filter(
    (p) =>
      p.key.startsWith("own-bonus") ||
      p.key.startsWith("round-bonus") ||
      p.key.startsWith("set-of-"),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        className="max-h-[90vh] w-[min(100vw-1.5rem,28rem)] gap-0 overflow-hidden border-[2px] border-jade-ink bg-parchment p-0 text-jade-ink shadow-[6px_6px_0_0_var(--jade-ink)]"
      >
        <div className="border-b-[2px] border-jade-ink bg-jade-accent/15 px-5 py-5">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-3 font-serif text-2xl text-jade-ink">
              <span className="grid size-11 place-items-center border-[2px] border-jade-ink bg-jade-accent text-parchment shadow-[3px_3px_0_0_var(--jade-ink)]">
                <Trophy className="size-5" />
              </span>
              Tangan Menang!
            </DialogTitle>
            <DialogDescription className="text-sm text-jade-ink/70">
              {meta.label} · Jade Miles (per 1.000) — bukan uang tunai.
            </DialogDescription>
          </DialogHeader>

          {score.variant === "chicken" ? (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-ink/60">
              Chicken: tanpa Faan HK (Flush, Toitoi, …). Kong, Double Chi, &
              Bunga tetap dihitung.
            </p>
          ) : null}

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Total Faan
              </p>
              <p className="font-serif text-5xl tabular-nums text-jade-accent">
                {score.totalFan}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Base B = {formatJadeMiles(payout.basePoints)} Jade Miles
              </p>
            </div>
            {score.isLimitHand ? (
              <span className="border border-jade-ink bg-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-parchment">
                Limit 10
              </span>
            ) : null}
          </div>
        </div>

        <div className="max-h-[min(50vh,360px)] overflow-y-auto px-5 py-4">
          {!score.isValidHand ? (
            <p className="mb-4 border-[2px] border-jade-red/40 bg-jade-red/10 px-3 py-2 text-sm text-jade-red">
              {score.messages.find((m) =>
                m.includes("minimal") || m.includes("Struktur"),
              ) ??
                score.messages[0] ??
                "Struktur tangan belum valid menurut hitungan meja ini."}
            </p>
          ) : null}

          {handPatterns.length > 0 ? (
            <section className="mb-4">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Pola Tangan
              </h3>
              <ul className="flex flex-col gap-2">
                {handPatterns.map((pattern) => (
                  <li
                    key={pattern.key}
                    className="jade-card flex items-start justify-between gap-2 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-serif text-base leading-tight">
                        {pattern.name}
                      </p>
                      {pattern.description ? (
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          {pattern.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 border border-jade-ink bg-card px-2 py-0.5 font-mono text-[10px] tabular-nums">
                      {pattern.fan} F
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {flowerPatterns.length > 0 ? (
            <section className="mb-4">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Bunga &amp; Musim
              </h3>
              <ul className="flex flex-col gap-2">
                {flowerPatterns.map((pattern) => (
                  <li
                    key={pattern.key}
                    className="jade-card flex items-center justify-between gap-2 p-3"
                  >
                    <span className="text-sm">{pattern.name}</span>
                    <span className="font-mono text-[10px] tabular-nums">
                      {pattern.fan} F
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="border-t-[2px] border-jade-ink bg-card px-5 py-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Bayaran · Jade Miles
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {score.totalFan} Faan = Base {formatJadeMiles(payout.basePoints)} →
            Discard +{formatJadeMiles(payout.winnerDiscard)} · Self-draw +
            {formatJadeMiles(payout.winnerSelfDraw)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div
              className={cn(
                "border-[2px] border-jade-ink bg-parchment p-3",
                score.isValidHand && "jade-card-accent",
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Discard
              </p>
              <p className="font-mono text-lg font-semibold tabular-nums text-jade-accent">
                +{formatJadeMiles(payout.winnerDiscard)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Penyuap −{formatJadeMiles(payout.discarderPays)}
              </p>
            </div>
            <div className="border-[2px] border-jade-ink bg-parchment p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Self-draw
              </p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                +{formatJadeMiles(payout.winnerSelfDraw)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Tiap lawan −{formatJadeMiles(payout.eachPaysSelfDraw)}
              </p>
            </div>
          </div>

          {applyToSessionId && onApplyToSession && score.isValidHand ? (
            <button
              type="button"
              onClick={() =>
                onApplyToSession({
                  totalFan: score.totalFan,
                  pointsRon: payout.winnerDiscard,
                  pointsTsumo: payout.winnerSelfDraw,
                  combos: score.patterns.map((pattern) => ({
                    label: pattern.name,
                    fan: pattern.fan,
                  })),
                  tileIds,
                })
              }
              className="scan-cta mt-4 inline-flex h-11 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.14em]"
            >
              Apply to live table →
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}