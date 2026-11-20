"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"

import {
  DEMO_WINNING_HANDS,
  POINT_UNIT,
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
  onClose,
  onConfirm,
}: {
  open: boolean
  seats: LiveSeat[]
  onClose: () => void
  onConfirm: (hand: ConfirmedScanHand) => void
}) {
  const [demoIndex, setDemoIndex] = useState(0)
  const [winnerSeatIndex, setWinnerSeatIndex] = useState(0)
  const [method, setMethod] = useState<WinMethod>("discard")
  const [dealtBySeatIndex, setDealtBySeatIndex] = useState<number | null>(1)
  // EDIT HERE — default manual points override (0 = use demo hand base)
  const [customPoints, setCustomPoints] = useState(0)

  const demo = DEMO_WINNING_HANDS[demoIndex] ?? DEMO_WINNING_HANDS[0]
  const winnerPoints = customPoints > 0 ? customPoints : demo.basePoints

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
    setDemoIndex(0)
    setWinnerSeatIndex(0)
    setMethod("discard")
    setDealtBySeatIndex(seats.length > 1 ? 1 : null)
    setCustomPoints(0)
  }, [open, seats.length])

  if (!open) return null

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
          <h2 className="font-serif text-2xl">Log hand manually</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
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
                    : "bg-card",
                )}
              >
                {hand.name}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Uses demo tiles for the log. Point unit default is{" "}
            <span className="font-mono">{POINT_UNIT}</span> (see live-demo).
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
                <option value="self-draw">Self-draw</option>
                <option value="discard">Discard</option>
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
                Custom points
              </span>
              <input
                type="number"
                min={0}
                step={100}
                value={customPoints || ""}
                placeholder={String(demo.basePoints)}
                onChange={(event) =>
                  setCustomPoints(Number(event.target.value) || 0)
                }
                className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-3 font-mono"
              />
            </label>
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
                    deltas[index]! > 0 && "text-jade-accent",
                    deltas[index]! < 0 && "text-jade-red",
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
                demoHandId: demo.id,
                tileIds: demo.tileIds,
                winningTileId: demo.winningTileId,
                combos: demo.combos,
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
            Log {formatPlainPoints(winnerPoints)} pts
          </button>
        </div>
      </div>
    </div>
  )
}
