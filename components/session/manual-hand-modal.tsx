"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Calculator, X } from "lucide-react"

import { formatJadeMiles, getJadePayout } from "@/lib/mahjong/payout"
import {
  computePayoutDeltas,
  type LiveSeat,
  type WinMethod,
} from "@/lib/session/live-demo"
import { formatPlainPoints, formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

import type { ConfirmedScanHand } from "@/components/session/camera-scan-modal"

export function ManualHandModal({
  open,
  seats,
  sessionId,
  onClose,
  onConfirm,
}: {
  open: boolean
  seats: LiveSeat[]
  sessionId?: string
  onClose: () => void
  onConfirm: (hand: ConfirmedScanHand) => void
}) {
  const [winnerSeatIndex, setWinnerSeatIndex] = useState(0)
  const [method, setMethod] = useState<WinMethod>("discard")
  const [dealtBySeatIndex, setDealtBySeatIndex] = useState<number | null>(1)
  // EDIT HERE — default fan when logging without the full tile calculator
  const [fan, setFan] = useState(3)
  const [comboLabel, setComboLabel] = useState("")

  const payout = useMemo(() => getJadePayout(fan), [fan])
  const winnerPoints = useMemo(() => {
    return method === "self-draw"
      ? payout.winnerSelfDraw
      : payout.winnerDiscard
  }, [method, payout])

  const deltas = useMemo(
    () =>
      computePayoutDeltas({
        seatCount: seats.length,
        winnerSeatIndex,
        method,
        dealtBySeatIndex: method === "discard" ? dealtBySeatIndex : null,
        totalFan: fan,
      }),
    [seats.length, winnerSeatIndex, method, dealtBySeatIndex, fan],
  )

  const combos = useMemo(() => {
    const label =
      comboLabel.trim() ||
      (payout.isLimit ? "Limit 10 Faan" : `${fan} Faan Jade`)
    return [{ label, fan }]
  }, [comboLabel, fan, payout.isLimit])

  useEffect(() => {
    if (!open) return
    setWinnerSeatIndex(0)
    setMethod("discard")
    setDealtBySeatIndex(seats.length > 1 ? 1 : null)
    setFan(3)
    setComboLabel("")
  }, [open, seats.length])

  if (!open) return null

  const calculatorHref = sessionId
    ? `/scan?applyToSession=${encodeURIComponent(sessionId)}`
    : "/scan"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close manual log"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4">
        <div className="flex items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
          <h2 className="font-serif text-2xl">Log hand</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <Link
            href={calculatorHref}
            className="inline-flex h-11 w-full items-center justify-center gap-2 border-[2px] border-jade-ink bg-card px-3 font-mono text-[11px] uppercase tracking-[0.14em] shadow-[3px_3px_0_0_var(--jade-ink)]"
          >
            <Calculator className="size-4" />
            Open tile calculator →
          </Link>
          <p className="text-sm text-muted-foreground">
            Jade Miles from Faan (per 1.000) — same table as /scan. Example:{" "}
            {fan} Faan → B {formatJadeMiles(payout.basePoints)} → winner{" "}
            {formatJadeMiles(winnerPoints)}.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Winner
              </span>
              <select
                value={winnerSeatIndex}
                onChange={(event) => setWinnerSeatIndex(Number(event.target.value))}
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
                Method
              </span>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value as WinMethod)}
                className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-2"
              >
                <option value="self-draw">Self-draw (tsumo)</option>
                <option value="discard">Discard (ron)</option>
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Dealt in
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
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Total Fan
              </span>
              <input
                type="number"
                min={1}
                max={13}
                value={fan}
                onChange={(event) =>
                  setFan(Math.max(1, Math.min(13, Number(event.target.value) || 1)))
                }
                className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-3 font-mono"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Combo label (optional)
              </span>
              <input
                value={comboLabel}
                onChange={(event) => setComboLabel(event.target.value)}
                placeholder="e.g. Half Flush + Seat Wind"
                className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-3 text-sm"
              />
            </label>
          </div>

          <div className="jade-card grid grid-cols-2 gap-2 p-3 font-mono text-[10px] uppercase tracking-[0.12em]">
            <div>
              <p className="text-muted-foreground">Discard · pemenang</p>
              <p className="mt-0.5 text-sm">
                +{formatJadeMiles(payout.winnerDiscard)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Self-draw · pemenang</p>
              <p className="mt-0.5 text-sm">
                +{formatJadeMiles(payout.winnerSelfDraw)}
              </p>
            </div>
            <div className="col-span-2 border-t border-jade-ink/25 pt-2">
              <p className="text-muted-foreground">This hand · Jade Miles</p>
              <p className="mt-0.5 text-lg text-jade-accent">
                {formatPlainPoints(winnerPoints)}
              </p>
            </div>
          </div>

          <ul className="jade-card space-y-2 p-3">
            {seats.map((seat, index) => (
              <li
                key={seat.wind}
                className="flex justify-between font-mono text-sm"
              >
                <span>{seat.nickname}</span>
                <span
                  className={cn(
                    (deltas[index] ?? 0) > 0 && "text-jade-accent",
                    (deltas[index] ?? 0) < 0 && "text-jade-red",
                  )}
                >
                  {formatSignedPoints(deltas[index] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              onConfirm({
                tileIds: [],
                winningTileId: "",
                combos,
                points: winnerPoints,
                winnerSeatIndex,
                method,
                dealtBySeatIndex:
                  method === "discard" ? dealtBySeatIndex : null,
                deltas,
              })
            }
            className="scan-cta inline-flex h-11 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            Log {formatPlainPoints(winnerPoints)} pts · {fan}f
          </button>
        </div>
      </div>
    </div>
  )
}
