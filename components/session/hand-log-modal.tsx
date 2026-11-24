"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Trophy, X } from "lucide-react"

import { GameContextControls } from "@/components/mahjong/game-context-controls"
import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import { RulesetPicker } from "@/components/mahjong/ruleset-picker"
import { TileBank } from "@/components/mahjong/tile-bank"
import {
  FLOWER_HAND_DROPPABLE_ID,
  MAIN_HAND_DROPPABLE_ID,
  MAX_FLOWER_TILES,
  MAX_MAIN_TILES,
  TileDropzone,
} from "@/components/mahjong/player-hand"
import type { ConfirmedScanHand } from "@/components/session/camera-scan-modal"
import { calculateHandScore } from "@/lib/mahjong/engine"
import { formatJadeMiles, getJadePayout } from "@/lib/mahjong/payout"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import type { GameContext, HandTile, RuleVariant, Tile } from "@/lib/mahjong/types"
import {
  computePayoutDeltas,
  type LiveSeat,
  type WinMethod,
} from "@/lib/session/live-demo"
import { formatPlainPoints, formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function createInstanceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `t_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

type Step = "tiles" | "assign"

export function HandLogModal({
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
  ruleset?: RuleVariant
}) {
  const [step, setStep] = React.useState<Step>("tiles")
  const [mainHand, setMainHand] = React.useState<HandTile[]>([])
  const [flowerHand, setFlowerHand] = React.useState<HandTile[]>([])
  const [activeTile, setActiveTile] = React.useState<Tile | null>(null)
  const [gameContext, setGameContext] = React.useState<GameContext>({
    seatWind: "East",
    roundWind: "East",
  })
  const [ruleset, setRuleset] = React.useState<RuleVariant>(
    lockedRuleset ?? "jade-hk",
  )
  const [scoreFan, setScoreFan] = React.useState(0)
  const [scoreCombos, setScoreCombos] = React.useState<
    { label: string; fan: number }[]
  >([])
  const [scoreError, setScoreError] = React.useState<string | null>(null)

  const [winnerSeatIndex, setWinnerSeatIndex] = React.useState(0)
  const [method, setMethod] = React.useState<WinMethod>("discard")
  const [dealtBySeatIndex, setDealtBySeatIndex] = React.useState<number | null>(
    1,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  React.useEffect(() => {
    if (!open) return
    setStep("tiles")
    setMainHand([])
    setFlowerHand([])
    setScoreFan(0)
    setScoreCombos([])
    setScoreError(null)
    setWinnerSeatIndex(0)
    setMethod("discard")
    setDealtBySeatIndex(seats.length > 1 ? 1 : null)
    setRuleset(lockedRuleset ?? "jade-hk")
    setGameContext({ seatWind: "East", roundWind: "East" })
  }, [open, seats.length, lockedRuleset])

  const isMainFull = mainHand.length >= MAX_MAIN_TILES
  const isFlowerFull = flowerHand.length >= MAX_FLOWER_TILES

  const countsById = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const tile of [...mainHand, ...flowerHand]) {
      map.set(tile.id, (map.get(tile.id) ?? 0) + 1)
    }
    return map
  }, [mainHand, flowerHand])

  const fullTileIds = React.useMemo(() => {
    const full = new Set<string>()
    for (const [id, count] of countsById) {
      const rep = TILE_BY_ID[id]
      if (rep && count >= rep.copies) full.add(id)
    }
    if (isMainFull || isFlowerFull) {
      for (const tile of Object.values(TILE_BY_ID)) {
        if (isFlowerFull && tile.category === "bonus") full.add(tile.id)
        if (isMainFull && tile.category !== "bonus") full.add(tile.id)
      }
    }
    return full
  }, [countsById, isMainFull, isFlowerFull])

  const addTile = React.useCallback((tile: Tile) => {
    if (tile.category === "bonus") {
      setFlowerHand((prev) => {
        if (prev.length >= MAX_FLOWER_TILES) return prev
        const existing = prev.filter((t) => t.id === tile.id).length
        if (existing >= tile.copies) return prev
        return [...prev, { ...tile, instanceId: createInstanceId() }]
      })
    } else {
      setMainHand((prev) => {
        if (prev.length >= MAX_MAIN_TILES) return prev
        const existing = prev.filter((t) => t.id === tile.id).length
        if (existing >= tile.copies) return prev
        return [...prev, { ...tile, instanceId: createInstanceId() }]
      })
    }
  }, [])

  const removeTile = React.useCallback((instanceId: string) => {
    setMainHand((prev) => prev.filter((t) => t.instanceId !== instanceId))
    setFlowerHand((prev) => prev.filter((t) => t.instanceId !== instanceId))
  }, [])

  const standardCount = mainHand.filter((t) => t.category !== "bonus").length

  const payout = React.useMemo(() => getJadePayout(scoreFan), [scoreFan])
  const winnerPoints = React.useMemo(() => {
    return method === "self-draw"
      ? payout.winnerSelfDraw
      : payout.winnerDiscard
  }, [method, payout])

  const deltas = React.useMemo(
    () =>
      computePayoutDeltas({
        seatCount: seats.length,
        winnerSeatIndex,
        method,
        dealtBySeatIndex: method === "discard" ? dealtBySeatIndex : null,
        totalFan: scoreFan,
      }),
    [seats.length, winnerSeatIndex, method, dealtBySeatIndex, scoreFan],
  )

  function handleCalculate() {
    setScoreError(null)
    if (standardCount < 14) {
      setScoreError("Need 14 main tiles to score a winning hand.")
      return
    }
    const result = calculateHandScore(mainHand, flowerHand, gameContext, {
      variant: ruleset,
    })
    if (!result.isValidHand) {
      setScoreError(
        result.messages[0] ?? "Hand is not a valid win under table rules.",
      )
      return
    }
    setScoreFan(result.totalFan)
    setScoreCombos(
      result.patterns.map((pattern) => ({
        label: pattern.name,
        fan: pattern.fan,
      })),
    )
    setStep("assign")
  }

  function handleDragStart(event: DragStartEvent) {
    const tile = event.active.data.current?.tile as Tile | undefined
    if (tile) setActiveTile(tile)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTile(null)
    const { active, over } = event
    if (!over) return
    const source = active.data.current?.source as "bank" | "hand" | undefined
    const tile = active.data.current?.tile as Tile | undefined
    if (source === "bank" && tile) {
      const overId = String(over.id)
      if (
        overId === MAIN_HAND_DROPPABLE_ID ||
        overId === FLOWER_HAND_DROPPABLE_ID ||
        overId.startsWith("hand-")
      ) {
        addTile(tile)
      }
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close hand log"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-[min(94dvh,52rem)] w-full max-w-3xl flex-col border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4">
        <div className="flex shrink-0 items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
          <div>
            <h2 className="font-serif text-2xl">
              {step === "tiles" ? "Score winning hand" : "Assign to seats"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
          >
            <X className="size-4" />
          </button>
        </div>

        {step === "tiles" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 flex-col gap-2 border-b border-jade-ink/30 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <GameContextControls
                  compact
                  context={gameContext}
                  onChange={setGameContext}
                  className="border-0 bg-transparent p-0 shadow-none"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={standardCount < 14}
                  onClick={handleCalculate}
                  className="scan-cta shrink-0 gap-1.5 rounded-none font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-40"
                >
                  <Trophy className="size-3.5" />
                  Hitung · {standardCount}/14
                </Button>
              </div>
              <RulesetPicker
                value={ruleset}
                onChange={setRuleset}
                disabled={Boolean(lockedRuleset)}
                compact
              />
              {scoreFan > 0 ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {scoreFan} Faan · B {formatJadeMiles(payout.basePoints)} →
                  winner {formatJadeMiles(winnerPoints)}
                </p>
              ) : null}
            </div>

            <DndContext
              id="hand-log-calculator"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveTile(null)}
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                <TileBank
                  variant="table"
                  layout="compact"
                  fullTileIds={fullTileIds}
                  onQuickAdd={addTile}
                />
              </div>
              <footer className="shrink-0 border-t-[2px] border-jade-ink bg-card px-2 py-2">
                {flowerHand.length > 0 ? (
                  <div className="mb-1 scale-90 opacity-90">
                    <TileDropzone
                      droppableId={FLOWER_HAND_DROPPABLE_ID}
                      zone="flower"
                      tone="bonus"
                      tileSize="xs"
                      layout="single-row"
                      dense
                      fullWidth
                      tiles={flowerHand}
                      onRemove={removeTile}
                      emptyTitle="Bunga"
                      emptyHint=""
                    />
                  </div>
                ) : null}
                <TileDropzone
                  droppableId={MAIN_HAND_DROPPABLE_ID}
                  zone="main"
                  tone="table"
                  tileSize="xs"
                  layout="two-row"
                  tactile
                  dense
                  fullWidth
                  counter={{ current: mainHand.length, max: MAX_MAIN_TILES }}
                  tiles={mainHand}
                  onRemove={removeTile}
                  emptyTitle="Tangan utama"
                  emptyHint="Tap tiles from the bank"
                />
              </footer>
              {activeTile ? (
                <DragOverlay dropAnimation={null}>
                  <MahjongTile tile={activeTile} size="md" dragging />
                </DragOverlay>
              ) : null}
            </DndContext>

            {scoreError ? (
              <p className="shrink-0 border-t border-jade-ink/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red">
                {scoreError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="jade-card space-y-2 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Calculator result
              </p>
              <p className="font-serif text-3xl text-jade-accent">
                {scoreFan} Fan · {formatPlainPoints(winnerPoints)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {scoreCombos.map((combo) => (
                  <span
                    key={`${combo.label}-${combo.fan}`}
                    className="border border-jade-ink bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]"
                  >
                    {combo.label}
                    {combo.fan > 0 ? ` · ${combo.fan}f` : ""}
                  </span>
                ))}
              </div>
              {mainHand.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {mainHand.map((tile) => (
                    <MahjongTile key={tile.instanceId} tile={tile} size="xs" />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  Winner
                </span>
                <select
                  value={winnerSeatIndex}
                  onChange={(event) =>
                    setWinnerSeatIndex(Number(event.target.value))
                  }
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
                  onChange={(event) =>
                    setMethod(event.target.value as WinMethod)
                  }
                  className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-2"
                >
                  <option value="discard">Discard (ron)</option>
                  <option value="self-draw">Self-draw (tsumo)</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
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

            <div className="mt-auto flex gap-2">
              <button
                type="button"
                onClick={() => setStep("tiles")}
                className="h-11 flex-1 border-[2px] border-jade-ink bg-card font-mono text-[10px] uppercase tracking-[0.14em]"
              >
                ← Edit tiles
              </button>
              <button
                type="button"
                onClick={() =>
                  onConfirm({
                    tileIds: mainHand.map((tile) => tile.id),
                    winningTileId: mainHand[mainHand.length - 1]?.id ?? "",
                    combos:
                      scoreCombos.length > 0
                        ? scoreCombos
                        : [{ label: `${scoreFan} Faan Jade`, fan: scoreFan }],
                    points: winnerPoints,
                    winnerSeatIndex,
                    method,
                    dealtBySeatIndex:
                      method === "discard" ? dealtBySeatIndex : null,
                    deltas,
                  })
                }
                className="scan-cta h-11 flex-[1.4] font-mono text-[10px] uppercase tracking-[0.16em]"
              >
                Log {formatPlainPoints(winnerPoints)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
