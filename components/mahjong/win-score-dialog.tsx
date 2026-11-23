"use client"

import * as React from "react"
import { Trophy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ScoreResult } from "@/lib/mahjong/engine"
import { getHkosPayout } from "@/lib/mahjong/payout"

interface WinScoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  score: ScoreResult | null
  /** When set, offer applying this HKOS result back to a live table. */
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

  const payout = getHkosPayout(score.totalFan)
  const handPatterns = score.patterns.filter(
    (p) => !p.key.startsWith("own-bonus") && p.key !== "no-flowers",
  )
  const flowerPatterns = score.patterns.filter(
    (p) => p.key.startsWith("own-bonus") || p.key === "no-flowers" || p.key.startsWith("set-of-"),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        className="max-h-[90vh] w-[90vw] max-w-lg gap-0 overflow-hidden border-amber-500/30 bg-slate-950 p-0 text-slate-100"
      >
        <div className="bg-gradient-to-br from-amber-600/30 via-slate-950 to-emerald-900/20 px-6 py-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-3 text-2xl text-amber-100">
              <span className="grid size-12 place-items-center rounded-2xl bg-amber-500/20 text-amber-300">
                <Trophy className="size-6" />
              </span>
              Tangan Menang!
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Rincian Fan Hong Kong Old Style &amp; tabel bayaran.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Fan
              </p>
              <p className="text-5xl font-black tabular-nums text-amber-300">
                {score.totalFan}
              </p>
            </div>
            {score.isLimitHand ? (
              <Badge className="bg-rose-600 text-white">Limit Hand</Badge>
            ) : null}
          </div>
        </div>

        <div className="max-h-[min(50vh,400px)] overflow-y-auto px-6 py-4">
          {handPatterns.length > 0 ? (
            <section className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pola Tangan
              </h3>
              <ul className="flex flex-col gap-2">
                {handPatterns.map((pattern) => (
                  <li
                    key={pattern.key}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100">
                        {pattern.name}
                      </p>
                      {pattern.description ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {pattern.description}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 border-amber-900/50 bg-amber-950/50 tabular-nums text-amber-200"
                    >
                      {pattern.fan} Fan
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {flowerPatterns.length > 0 ? (
            <section className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bunga &amp; Musim
              </h3>
              <ul className="flex flex-col gap-2">
                {flowerPatterns.map((pattern) => (
                  <li
                    key={pattern.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
                  >
                    <span className="text-sm text-slate-300">{pattern.name}</span>
                    <Badge
                      variant="secondary"
                      className="shrink-0 tabular-nums text-slate-200"
                    >
                      {pattern.fan} Fan
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!score.isValidHand ? (
            <p className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
              Struktur tangan belum valid menurut aturan standar.
            </p>
          ) : null}
        </div>

        <div className="border-t border-slate-800 bg-slate-900/80 px-6 py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tabel Bayaran HKOS
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Ron (1 lawan)</p>
              <p className="text-xl font-bold tabular-nums text-emerald-300">
                {payout.perOpponentRon}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Ron (3 lawan)</p>
              <p className="text-xl font-bold tabular-nums text-emerald-300">
                {payout.totalRon}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Tsumo (per lawan)</p>
              <p className="text-lg font-semibold tabular-nums text-sky-300">
                {payout.perOpponentTsumo}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">Tsumo (total)</p>
              <p className="text-lg font-semibold tabular-nums text-sky-300">
                {payout.totalTsumo}
              </p>
            </div>
          </div>
          {payout.isLimit ? (
            <p className="mt-2 text-center text-xs text-amber-400/80">
              Limit Hand — bayaran maksimum {payout.perOpponentRon} per lawan.
            </p>
          ) : null}

          {applyToSessionId && onApplyToSession ? (
            <button
              type="button"
              onClick={() =>
                onApplyToSession({
                  totalFan: score.totalFan,
                  pointsRon: payout.perOpponentRon,
                  pointsTsumo: payout.totalTsumo,
                  combos: score.patterns.map((pattern) => ({
                    label: pattern.name,
                    fan: pattern.fan,
                  })),
                  tileIds,
                })
              }
              className="mt-4 inline-flex h-11 w-full items-center justify-center border-[2px] border-amber-400 bg-amber-500/20 font-mono text-[11px] uppercase tracking-[0.14em] text-amber-100"
            >
              Apply to live table →
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
