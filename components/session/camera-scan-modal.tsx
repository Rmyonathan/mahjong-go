"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"

import { GameContextControls } from "@/components/mahjong/game-context-controls"
import { RulesetPicker } from "@/components/mahjong/ruleset-picker"
import { ScanCameraViewfinder } from "@/components/scan/scan-camera-viewfinder"
import { ScannedHandEditor } from "@/components/scan/scanned-hand-editor"
import { calculateHandScore } from "@/lib/mahjong/engine"
import { formatJadeMiles, getJadePayout } from "@/lib/mahjong/payout"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import type { GameContext, RuleVariant, Tile } from "@/lib/mahjong/types"
import { scanHandFromFile } from "@/lib/scan/client"
import {
  computePayoutDeltas,
  type LiveSeat,
  type LiveWind,
  type WinMethod,
} from "@/lib/session/live-demo"
import { formatPlainPoints, formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

type Step = "viewfinder" | "scanning" | "review"

export interface ConfirmedScanHand {
  demoHandId?: string
  tileIds: string[]
  winningTileId: string
  combos: { label: string; fan: number }[]
  points: number
  winnerSeatIndex: number
  method: WinMethod
  dealtBySeatIndex: number | null
  deltas: number[]
}

function windToSeatLabel(wind: LiveWind): GameContext["seatWind"] {
  const map: Record<LiveWind, GameContext["seatWind"]> = {
    east: "East",
    south: "South",
    west: "West",
    north: "North",
  }
  return map[wind]
}

function splitTiles(tileIds: string[]): { main: Tile[]; flowers: Tile[] } {
  const main: Tile[] = []
  const flowers: Tile[] = []
  for (const id of tileIds) {
    const tile = TILE_BY_ID[id]
    if (!tile) continue
    if (tile.category === "bonus") flowers.push(tile)
    else main.push(tile)
  }
  return { main, flowers }
}

export function CameraScanModal({
  open,
  seats,
  onClose,
  onConfirm,
  ruleset: lockedRuleset,
}: {
  open: boolean
  seats: LiveSeat[]
  onClose: () => void
  onConfirm: (hand: ConfirmedScanHand) => void
  /** Table hitungan from meet/session — locked for the live table */
  ruleset?: RuleVariant
}) {
  const [step, setStep] = useState<Step>("viewfinder")
  const [error, setError] = useState<string | null>(null)
  const [tileIds, setTileIds] = useState<string[]>([])
  const [uncertainIndices, setUncertainIndices] = useState<number[]>([])

  const [winnerSeatIndex, setWinnerSeatIndex] = useState(0)
  const [method, setMethod] = useState<WinMethod>("self-draw")
  const [dealtBySeatIndex, setDealtBySeatIndex] = useState<number | null>(1)
  const [ruleset, setRuleset] = useState<RuleVariant>(
    lockedRuleset ?? "jade-hk",
  )
  const [gameContext, setGameContext] = useState<GameContext>({
    seatWind: "East",
    roundWind: "East",
  })

  useEffect(() => {
    if (!open) return
    setStep("viewfinder")
    setError(null)
    setTileIds([])
    setUncertainIndices([])
    setWinnerSeatIndex(0)
    setMethod("self-draw")
    setDealtBySeatIndex(seats.length > 1 ? 1 : null)
    setRuleset(lockedRuleset ?? "jade-hk")
    const wind = seats[0]?.wind ?? "east"
    setGameContext({
      seatWind: windToSeatLabel(wind),
      roundWind: "East",
    })
  }, [open, seats, lockedRuleset])

  useEffect(() => {
    const wind = seats[winnerSeatIndex]?.wind
    if (!wind) return
    setGameContext((prev) => ({
      ...prev,
      seatWind: windToSeatLabel(wind),
    }))
  }, [winnerSeatIndex, seats])

  const { main, flowers } = useMemo(() => splitTiles(tileIds), [tileIds])

  const score = useMemo(
    () =>
      calculateHandScore(main, flowers, gameContext, { variant: ruleset }),
    [main, flowers, gameContext, ruleset],
  )

  const payout = useMemo(
    () => getJadePayout(score.totalFan),
    [score.totalFan],
  )

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
        totalFan: score.totalFan,
      }),
    [seats.length, winnerSeatIndex, method, dealtBySeatIndex, score.totalFan],
  )

  async function runScan(file: File) {
    setError(null)
    setStep("scanning")
    try {
      const result = await scanHandFromFile(file)
      setTileIds(result.tiles)
      setUncertainIndices(result.uncertainIndices)
      setStep("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed")
      setStep("viewfinder")
    }
  }

  function confirm() {
    if (method === "discard" && dealtBySeatIndex == null) return
    if (method === "discard" && dealtBySeatIndex === winnerSeatIndex) return
    if (main.length < 14) {
      setError("Need 14 main (non-bonus) tiles to log a win.")
      return
    }
    if (!score.isValidHand) {
      setError(score.messages[0] ?? "Hand is not a valid win under table rules.")
      return
    }
    const winningTileId = main[main.length - 1]?.id ?? tileIds[tileIds.length - 1] ?? ""
    onConfirm({
      tileIds: main.map((tile) => tile.id),
      winningTileId,
      combos: score.patterns.map((pattern) => ({
        label: pattern.name,
        fan: pattern.fan,
      })),
      points: winnerPoints,
      winnerSeatIndex,
      method,
      dealtBySeatIndex: method === "discard" ? dealtBySeatIndex : null,
      deltas,
    })
  }

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.body.dataset.scanModal = "1"
    return () => {
      document.body.style.overflow = prev
      delete document.body.dataset.scanModal
    }
  }, [open])

  if (!open) return null

  return (
    // Above mobile bottom nav (z-50) + sheets (z-60) so Capture isn't covered
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close scan modal"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(94dvh,100%)] w-full max-w-3xl flex-col overflow-hidden border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4 sm:max-h-[94vh]">
        <div className="flex shrink-0 items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Gemini · tile detect only
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5">
          {step === "viewfinder" ? (
            <div className="space-y-3">
              {error ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red">
                  {error}
                </p>
              ) : null}
              <ScanCameraViewfinder onCapture={(file) => void runScan(file)} />
            </div>
          ) : null}

          {step === "scanning" ? (
            <div className="relative flex min-h-[18rem] flex-col items-center justify-center gap-4 overflow-hidden border-[2px] border-jade-ink bg-card p-6">
              <div className="jade-scan-laser absolute inset-x-0 h-1 bg-jade-accent shadow-[0_0_18px_4px_color-mix(in_srgb,var(--jade-accent)_55%,transparent)]" />
              <p className="font-serif text-3xl">Detecting tiles…</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-jade-accent">
                Detecting tiles · keep this tab open
              </p>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-5">
              <div className="jade-card p-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Detected tiles · edit before score
                </p>
                <ScannedHandEditor
                  tileIds={tileIds}
                  uncertainIndices={uncertainIndices}
                  highlightWinningIndex={
                    main.length
                      ? tileIds.lastIndexOf(main[main.length - 1]!.id)
                      : null
                  }
                  onChange={({ tileIds: next, uncertainIndices: nextU }) => {
                    setTileIds(next)
                    setUncertainIndices(nextU)
                    setError(null)
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {score.patterns.map((pattern) => (
                    <span
                      key={`${pattern.key}-${pattern.name}`}
                      className="border border-jade-ink bg-muted px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                    >
                      {pattern.name} · {pattern.fan}f
                    </span>
                  ))}
                  <span className="border border-jade-accent bg-jade-accent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white">
                    {score.totalFan} Fan · {formatPlainPoints(winnerPoints)}
                  </span>
                </div>
                {!score.isValidHand ? (
                  <p className="mt-2 text-xs text-jade-red">
                    {score.messages[0] ?? "Not a valid win yet — fix tiles."}
                  </p>
                ) : null}
              </div>

              <GameContextControls
                context={gameContext}
                onChange={setGameContext}
              />

              <RulesetPicker
                value={ruleset}
                onChange={setRuleset}
                disabled={Boolean(lockedRuleset)}
                compact
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {score.totalFan} Faan = Base {formatJadeMiles(payout.basePoints)}{" "}
                → winner{" "}
                {formatJadeMiles(winnerPoints)}
                {method === "discard"
                  ? ` (penyuap −${formatJadeMiles(payout.discarderPays)})`
                  : ` (tiap lawan −${formatJadeMiles(payout.eachPaysSelfDraw)})`}
              </p>

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
                  Payout preview · engine
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

              {error ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep("viewfinder")}
                  className="inline-flex h-12 flex-1 items-center justify-center border-[2px] border-jade-ink bg-card font-mono text-[11px] uppercase tracking-[0.16em]"
                >
                  Rescan
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  className="scan-cta inline-flex h-12 flex-[1.4] items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
                >
                  Confirm & log hand
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

