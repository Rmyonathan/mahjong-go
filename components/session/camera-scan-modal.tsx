"use client"

import { useEffect, useMemo, useState } from "react"
import { Camera, Upload, X } from "lucide-react"

import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import {
  DEMO_WINNING_HANDS,
  SELF_DRAW_MULTIPLIER,
  computePayoutDeltas,
  type LiveSeat,
  type WinMethod,
} from "@/lib/session/live-demo"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import { formatPlainPoints, formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

type Step = "viewfinder" | "scanning" | "review"

export interface ConfirmedScanHand {
  demoHandId: string
  tileIds: string[]
  winningTileId: string
  combos: { label: string; fan: number }[]
  points: number
  winnerSeatIndex: number
  method: WinMethod
  dealtBySeatIndex: number | null
  deltas: number[]
}

export function CameraScanModal({
  open,
  seats,
  onClose,
  onConfirm,
}: {
  open: boolean
  seats: LiveSeat[]
  onClose: () => void
  onConfirm: (hand: ConfirmedScanHand) => void
}) {
  const [step, setStep] = useState<Step>("viewfinder")
  const [demoIndex, setDemoIndex] = useState(0)
  const [winnerSeatIndex, setWinnerSeatIndex] = useState(0)
  const [method, setMethod] = useState<WinMethod>("self-draw")
  const [dealtBySeatIndex, setDealtBySeatIndex] = useState<number | null>(1)

  const demo = DEMO_WINNING_HANDS[demoIndex] ?? DEMO_WINNING_HANDS[0]

  const winnerPoints = useMemo(() => {
    // EDIT HERE — tweak how self-draw boosts the scanned hand total
    const boost = method === "self-draw" ? SELF_DRAW_MULTIPLIER : 1
    return Math.round(demo.basePoints * Math.max(1, boost))
  }, [demo.basePoints, method])

  const deltas = useMemo(
    () =>
      computePayoutDeltas({
        seatCount: seats.length,
        winnerSeatIndex,
        method,
        dealtBySeatIndex: method === "discard" ? dealtBySeatIndex : null,
        winnerPoints,
      }),
    [seats.length, winnerSeatIndex, method, dealtBySeatIndex, winnerPoints],
  )

  useEffect(() => {
    if (!open) return
    setStep("viewfinder")
    setDemoIndex(0)
    setWinnerSeatIndex(0)
    setMethod("self-draw")
    setDealtBySeatIndex(seats.length > 1 ? 1 : null)
  }, [open, seats.length])

  useEffect(() => {
    if (step !== "scanning") return
    const timer = window.setTimeout(() => setStep("review"), 1100)
    return () => window.clearTimeout(timer)
  }, [step])

  if (!open) return null

  function startScan() {
    setStep("scanning")
  }

  function confirm() {
    if (method === "discard" && dealtBySeatIndex == null) return
    if (method === "discard" && dealtBySeatIndex === winnerSeatIndex) return
    onConfirm({
      demoHandId: demo.id,
      tileIds: demo.tileIds,
      winningTileId: demo.winningTileId,
      combos: demo.combos,
      points: winnerPoints,
      winnerSeatIndex,
      method,
      dealtBySeatIndex: method === "discard" ? dealtBySeatIndex : null,
      deltas,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close scan modal"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4">
        <div className="flex items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              AI demo · Camera scan
            </p>
            <h2 className="font-serif text-2xl">Scan winning hand</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          {step === "viewfinder" ? (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] overflow-hidden border-[2px] border-jade-ink bg-[linear-gradient(160deg,#1B2A1E_0%,#2F6B45_55%,#1B2A1E_100%)]">
                <div className="absolute inset-6 border border-white/35" />
                <Corner className="left-4 top-4" />
                <Corner className="right-4 top-4 rotate-90" />
                <Corner className="bottom-4 left-4 -rotate-90" />
                <Corner className="bottom-4 right-4 rotate-180" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
                  <Camera className="size-8 opacity-80" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
                    Point at 14 winning tiles
                  </p>
                  <p className="max-w-sm text-sm text-white/80">
                    Demo mode — capture loads a preset winning hand. No real
                    vision model is called.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={startScan}
                  className="scan-cta-accent inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
                >
                  <Camera className="size-4" />
                  Capture & scan demo hand
                </button>
                <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]">
                  <Upload className="size-4" />
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={() => startScan()}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {step === "scanning" ? (
            <div className="relative flex min-h-[18rem] flex-col items-center justify-center gap-4 overflow-hidden border-[2px] border-jade-ink bg-card p-6">
              <div className="jade-scan-laser absolute inset-x-0 h-1 bg-jade-accent shadow-[0_0_18px_4px_color-mix(in_srgb,var(--jade-accent)_55%,transparent)]" />
              <p className="font-serif text-3xl">Detecting 14 tiles…</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-jade-accent">
                Calculating MCR combos…
              </p>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {DEMO_WINNING_HANDS.map((hand, index) => (
                  <button
                    key={hand.id}
                    type="button"
                    onClick={() => setDemoIndex(index)}
                    className={cn(
                      "border-[2px] border-jade-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em]",
                      index === demoIndex
                        ? "bg-jade-ink text-white"
                        : "bg-card hover:bg-muted",
                    )}
                  >
                    {hand.name}
                  </button>
                ))}
              </div>

              <div className="jade-card p-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Detected tiles · {demo.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {demo.tileIds.map((id, index) => {
                    const tile = TILE_BY_ID[id]
                    if (!tile) return null
                    return (
                      <MahjongTile
                        key={`${id}-${index}`}
                        tile={tile}
                        size="xs"
                        className={cn(
                          "rounded-none shadow-none ring-1 ring-jade-ink/20",
                          id === demo.winningTileId && "ring-2 ring-jade-gold",
                        )}
                      />
                    )
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {demo.combos.map((combo) => (
                    <span
                      key={combo.label}
                      className="border border-jade-ink bg-muted px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                    >
                      {combo.label} · {combo.fan}f
                    </span>
                  ))}
                  <span className="border border-jade-accent bg-jade-accent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white">
                    {formatPlainPoints(winnerPoints)} pts
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                    Winner
                  </span>
                  <select
                    value={winnerSeatIndex}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setWinnerSeatIndex(next)
                      if (dealtBySeatIndex === next) {
                        const fallback = seats.findIndex((_, i) => i !== next)
                        setDealtBySeatIndex(fallback >= 0 ? fallback : null)
                      }
                    }}
                    className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-2"
                  >
                    {seats.map((seat, index) => (
                      <option key={seat.wind} value={index}>
                        {seat.nickname}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                    Win method
                  </span>
                  <select
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as WinMethod)
                    }
                    className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-2"
                  >
                    <option value="self-draw">Self-draw</option>
                    <option value="discard">Discard</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                    Who dealt in
                  </span>
                  <select
                    disabled={method !== "discard"}
                    value={dealtBySeatIndex ?? ""}
                    onChange={(event) =>
                      setDealtBySeatIndex(Number(event.target.value))
                    }
                    className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-2 disabled:opacity-40"
                  >
                    {seats.map((seat, index) =>
                      index === winnerSeatIndex ? null : (
                        <option key={seat.wind} value={index}>
                          {seat.nickname}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <div className="jade-card-accent p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-jade-accent">
                  Payout preview
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {seats.map((seat, index) => {
                    const delta = deltas[index] ?? 0
                    return (
                      <li
                        key={seat.wind}
                        className="flex items-center justify-between gap-3 border-b border-jade-accent/30 pb-2 last:border-b-0"
                      >
                        <span className="font-serif text-lg leading-none">
                          {seat.nickname}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-sm",
                            delta > 0 && "text-jade-accent",
                            delta < 0 && "text-jade-red",
                          )}
                        >
                          {formatSignedPoints(delta)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <button
                type="button"
                onClick={confirm}
                className="scan-cta inline-flex h-12 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
              >
                Confirm & log hand
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Corner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute size-6 border-l-2 border-t-2 border-white",
        className,
      )}
    />
  )
}
