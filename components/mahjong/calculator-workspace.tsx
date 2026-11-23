"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { ArrowDownUp, Trash2, Trophy } from "lucide-react"

import { AiAnalysisDialog, type StrategySelection } from "@/components/mahjong/ai-analysis-dialog"
import { AiCoachHud } from "@/components/mahjong/ai-coach-hud"
import { AiSuggestions } from "@/components/mahjong/ai-suggestions"
import { GameContextControls } from "@/components/mahjong/game-context-controls"
import { WinScoreDialog } from "@/components/mahjong/win-score-dialog"
import { calculateHandScore } from "@/lib/mahjong/engine"
import type { ScoreResult } from "@/lib/mahjong/engine"
import { suggestTargetHands } from "@/lib/mahjong/suggestions"
import { analyzeHand, getRecommendations } from "@/lib/mahjong/shanten"
import { sortMainHand } from "@/lib/mahjong/sort-hand"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import type { GameContext, Tile, HandTile } from "@/lib/mahjong/types"
import { POINT_UNIT } from "@/lib/session/live-demo"
import { savePendingHand } from "@/lib/session/pending-hand"
import { Button } from "@/components/ui/button"
import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import { TileBank } from "@/components/mahjong/tile-bank"
import {
  FLOWER_HAND_DROPPABLE_ID,
  MAIN_HAND_DROPPABLE_ID,
  MAX_FLOWER_TILES,
  MAX_MAIN_TILES,
  TileDropzone,
  type HandZone,
} from "@/components/mahjong/player-hand"
import type { TrackedTarget } from "@/components/mahjong/strategy-hud"
import { StrategyHud } from "@/components/mahjong/strategy-hud"
import { cn } from "@/lib/utils"

function createInstanceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `t_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/** Hindari mount desktop + mobile bersamaan (id draggable bentrok di dnd-kit). */
function useIsDesktop(): boolean {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mq = window.matchMedia("(min-width: 1024px)")
    mq.addEventListener("change", onStoreChange)
    return () => mq.removeEventListener("change", onStoreChange)
  }, [])

  const getSnapshot = React.useCallback(
    () => window.matchMedia("(min-width: 1024px)").matches,
    [],
  )

  const getServerSnapshot = React.useCallback(() => false, [])

  return React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )
}

export function CalculatorWorkspace() {
  const isDesktop = useIsDesktop()
  const router = useRouter()
  const searchParams = useSearchParams()
  const applyToSessionId = searchParams.get("applyToSession")
  const [mainHand, setMainHand] = React.useState<HandTile[]>([])
  const [flowerHand, setFlowerHand] = React.useState<HandTile[]>([])
  const [activeTile, setActiveTile] = React.useState<Tile | null>(null)
  const [analysisOpen, setAnalysisOpen] = React.useState(false)
  const [coachOpen, setCoachOpen] = React.useState(false)
  const [trackedTargets, setTrackedTargets] = React.useState<TrackedTarget[]>(
    [],
  )
  const [activeTarget, setActiveTarget] = React.useState<string | null>(null)
  const [gameContext, setGameContext] = React.useState<GameContext>({
    seatWind: "East",
    roundWind: "East",
  })
  const [winDialogOpen, setWinDialogOpen] = React.useState(false)
  const [winScore, setWinScore] = React.useState<ScoreResult | null>(null)

  const desktopSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const mobileSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

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

  /** Ketuk bank = tambah; seret = tambah di dragEnd — cegah dua kali dalam satu gestur. */
  const lastBankAddRef = React.useRef<{ id: string; at: number } | null>(null)
  const addTileFromBank = React.useCallback(
    (tile: Tile) => {
      const now = performance.now()
      if (
        lastBankAddRef.current?.id === tile.id &&
        now - lastBankAddRef.current.at < 250
      ) {
        return
      }
      lastBankAddRef.current = { id: tile.id, at: now }
      addTile(tile)
    },
    [addTile],
  )

  const removeTile = React.useCallback((instanceId: string) => {
    setMainHand((prev) => prev.filter((t) => t.instanceId !== instanceId))
    setFlowerHand((prev) => prev.filter((t) => t.instanceId !== instanceId))
  }, [])

  const clearHand = React.useCallback(() => {
    setMainHand([])
    setFlowerHand([])
    setTrackedTargets([])
    setActiveTarget(null)
  }, [])

  // [BARU] Urutkan tangan: Bulatan → Bambu → Karakter → Honor.
  const sortHand = React.useCallback(() => {
    setMainHand((prev) => sortMainHand(prev))
  }, [])

  function handleDragStart(event: DragStartEvent) {
    const tile = event.active.data.current?.tile as Tile | undefined
    if (tile) setActiveTile(tile)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTile(null)
    const { active, over, delta } = event
    if (!over) return

    const source = active.data.current?.source as "bank" | "hand" | undefined

    if (source === "bank") {
      const tile = event.active.data.current?.tile as Tile | undefined
      const moved = Math.hypot(delta.x, delta.y) >= 8
      if (tile && moved) addTileFromBank(tile)
      return
    }

    if (source === "hand") {
      const zone = active.data.current?.zone as HandZone | undefined
      if (!zone) return
      const activeId = String(active.id)
      const overId = String(over.id)
      if (activeId === overId) return

      const setter = zone === "flower" ? setFlowerHand : setMainHand
      const zoneDropId =
        zone === "flower" ? FLOWER_HAND_DROPPABLE_ID : MAIN_HAND_DROPPABLE_ID

      setter((prev) => {
        const oldIndex = prev.findIndex((t) => t.instanceId === activeId)
        if (oldIndex === -1) return prev
        const newIndex =
          overId === zoneDropId
            ? prev.length - 1
            : prev.findIndex((t) => t.instanceId === overId)
        if (newIndex === -1) return prev
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const visibleTiles = React.useMemo(
    () => [...mainHand, ...flowerHand],
    [mainHand, flowerHand],
  )

  const currentSuggestions = React.useMemo(
    () => suggestTargetHands(mainHand),
    [mainHand],
  )

  React.useEffect(() => {
    const validKeys = new Set(currentSuggestions.map((s) => s.key))
    setTrackedTargets((prev) => {
      const next = prev.filter((t) => validKeys.has(t.key))
      if (next.length === prev.length) return prev
      return next
    })
  }, [currentSuggestions])

  React.useEffect(() => {
    if (
      activeTarget &&
      !trackedTargets.some((t) => t.key === activeTarget)
    ) {
      setActiveTarget(trackedTargets[0]?.key ?? null)
    }
  }, [trackedTargets, activeTarget])

  function handleConfirmStrategy({ standard, legendary }: StrategySelection) {
    const keys = [...standard, ...(legendary ? [legendary] : [])]
    const next = currentSuggestions
      .filter((s) => keys.includes(s.key))
      .map((s) => ({ key: s.key, name: s.name }))
    setTrackedTargets(next)
    setActiveTarget(next[0]?.key ?? null)
    if (isDesktop) {
      setCoachOpen(true)
    }
  }

  const initialStandard = React.useMemo(
    () =>
      trackedTargets
        .filter((t) => {
          const s = currentSuggestions.find((c) => c.key === t.key)
          return s?.category === "standard"
        })
        .map((t) => t.key),
    [trackedTargets, currentSuggestions],
  )

  const initialLegendary = React.useMemo(() => {
    const found = trackedTargets.find((t) => {
      const s = currentSuggestions.find((c) => c.key === t.key)
      return s?.category === "legendary"
    })
    return found?.key ?? null
  }, [trackedTargets, currentSuggestions])

  const activeTargetName =
    trackedTargets.find((t) => t.key === activeTarget)?.name ?? null

  // [BARU] Hitung ulang shanten + uke-ire setiap activeTarget / tangan berubah.
  const handAnalysis = React.useMemo(
    () => analyzeHand(mainHand, visibleTiles, activeTarget),
    [mainHand, visibleTiles, activeTarget],
  )

  const recommendations = React.useMemo(
    () => getRecommendations(mainHand, visibleTiles, activeTarget),
    [mainHand, visibleTiles, activeTarget],
  )

  const analysisForHud = React.useMemo(
    () => ({ ...handAnalysis, recommendations }),
    [handAnalysis, recommendations],
  )

  const isWinningForTarget = React.useMemo(() => {
    if (activeTarget === null || handAnalysis.shanten !== -1) return false
    const standardCount = mainHand.filter((t) => t.category !== "bonus").length
    if (standardCount !== 14) return false
    return calculateHandScore(mainHand, flowerHand, gameContext).isValidHand
  }, [activeTarget, handAnalysis.shanten, mainHand, flowerHand, gameContext])

  function handleCalculateWin() {
    const result = calculateHandScore(mainHand, flowerHand, gameContext)
    setWinScore(result)
    setWinDialogOpen(true)
  }

  const handleActiveTargetChange = React.useCallback((key: string) => {
    setActiveTarget(key)
  }, [])

  const isEmpty = mainHand.length === 0 && flowerHand.length === 0

  function handleApplyToSession(payload: {
    totalFan: number
    pointsRon: number
    pointsTsumo: number
    combos: { label: string; fan: number }[]
    tileIds: string[]
  }) {
    if (!applyToSessionId) return
    const tileIds =
      payload.tileIds.length > 0
        ? payload.tileIds
        : mainHand.map((tile) => tile.id)
    savePendingHand({
      sessionId: applyToSessionId,
      totalFan: payload.totalFan,
      pointsRon: payload.pointsRon * POINT_UNIT,
      pointsTsumo: payload.pointsTsumo * POINT_UNIT,
      method: "discard",
      combos: payload.combos,
      tileIds,
      winningTileId: tileIds[tileIds.length - 1] ?? "",
      createdAt: new Date().toISOString(),
    })
    router.push(`/session/live?id=${encodeURIComponent(applyToSessionId)}&pending=1`)
  }

  const sharedDialogs = (
    <>
      <WinScoreDialog
        open={winDialogOpen}
        onOpenChange={setWinDialogOpen}
        score={winScore}
        applyToSessionId={applyToSessionId}
        tileIds={mainHand.map((tile) => tile.id)}
        onApplyToSession={handleApplyToSession}
      />
      <AiAnalysisDialog
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        mainHand={mainHand}
        initialStandard={initialStandard}
        initialLegendary={initialLegendary}
        onConfirm={handleConfirmStrategy}
      />
    </>
  )

  const handControls = (compact?: boolean) => (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon-sm" : "sm"}
        disabled={mainHand.length < 2}
        onClick={sortHand}
        className={cn(
          "border-[2px] border-jade-ink bg-card text-jade-ink shadow-[3px_3px_0_0_var(--jade-ink)] hover:bg-muted",
          compact && "touch-manipulation",
        )}
      >
        <ArrowDownUp className="size-3.5" />
        {compact ? <span className="sr-only">Urutkan</span> : "Urutkan"}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size={compact ? "icon-sm" : "sm"}
        disabled={isEmpty}
        onClick={clearHand}
        className={cn(
          "border-[2px] border-jade-ink bg-jade-red text-parchment shadow-[3px_3px_0_0_var(--jade-ink)] hover:bg-jade-red/90",
          compact && "touch-manipulation",
        )}
      >
        <Trash2 className="size-3.5" />
        {compact ? <span className="sr-only">Kosongkan</span> : "Kosongkan"}
      </Button>
    </>
  )

  const dragOverlay =
    activeTile ? (
      <DragOverlay dropAnimation={null}>
        <MahjongTile
          tile={activeTile}
          size="xl"
          dragging
          className={isDesktop ? undefined : "!h-16 !w-12"}
        />
      </DragOverlay>
    ) : null

  if (isDesktop) {
    return (
      <DndContext
        id="mahjong-calculator"
        sensors={desktopSensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTile(null)}
      >
        <div className="scan-desk relative flex h-[calc(100dvh-4.5rem)] w-full flex-col overflow-hidden">
        <div className="fixed left-4 top-20 z-40 lg:top-4">
          <GameContextControls
            context={gameContext}
            onChange={setGameContext}
          />
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            coachOpen && "pr-96",
          )}
        >
          <div className="flex flex-1 items-start justify-center overflow-auto px-4 py-6">
            <TileBank
              variant="table"
              fullTileIds={fullTileIds}
              onQuickAdd={addTileFromBank}
            />
          </div>

          <footer className="shrink-0 bg-transparent px-4 pb-2 pt-1">
            <div className="mx-auto flex w-max max-w-full flex-col items-stretch gap-1">
              <div className="flex items-end justify-between gap-3">
                <div className="max-w-full shrink-0 scale-90 opacity-90">
                  <TileDropzone
                    droppableId={FLOWER_HAND_DROPPABLE_ID}
                    zone="flower"
                    tone="bonus"
                    tileSize="sm"
                    layout="single-row"
                    tiles={flowerHand}
                    onRemove={removeTile}
                    emptyTitle="Bunga & Musim"
                    emptyHint="Seret ubin bonus"
                  />
                </div>

                <div className="flex shrink-0 items-center gap-1.5 pb-1">
                  {handControls()}
                </div>
              </div>

              <TileDropzone
                droppableId={MAIN_HAND_DROPPABLE_ID}
                zone="main"
                tone="table"
                tileSize="md"
                layout="single-row"
                tactile
                counter={{
                  current: mainHand.length,
                  max: MAX_MAIN_TILES,
                }}
                tiles={mainHand}
                onRemove={removeTile}
                emptyTitle="Tangan Utama"
                emptyHint="Seret ubin dari bank ke sini"
              />
            </div>
          </footer>
        </div>

        {isWinningForTarget ? (
          <Button
            type="button"
            onClick={handleCalculateWin}
            className={cn(
              "scan-cta fixed bottom-44 left-1/2 z-50 -translate-x-1/2 gap-2 rounded-none px-8 py-4 font-mono text-sm uppercase tracking-[0.14em]",
              "hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
              "animate-in fade-in zoom-in-95 duration-300",
            )}
          >
            <Trophy className="size-5" />
            Hitung Menang
          </Button>
        ) : null}

        {!coachOpen ? (
          <Button
            type="button"
            disabled={mainHand.length === 0}
            onClick={() =>
              trackedTargets.length > 0
                ? setCoachOpen(true)
                : setAnalysisOpen(true)
            }
            className={cn(
              "scan-cta-accent fixed right-8 top-1/2 z-50 -translate-y-1/2 gap-2 rounded-none px-6 py-4 font-mono text-sm uppercase tracking-[0.14em]",
              "hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
              "disabled:opacity-40",
            )}
          >
            <span aria-hidden>🧠</span>
            {trackedTargets.length > 0 ? "Pelatih AI" : "Pilih Strategi AI"}
          </Button>
        ) : null}

        <AiCoachHud
          open={coachOpen}
          onOpenChange={setCoachOpen}
          onRequestAnalysis={() => setAnalysisOpen(true)}
          mainHand={mainHand}
          analysis={analysisForHud}
          trackedTargets={trackedTargets}
          activeTarget={activeTarget}
          onActiveTargetChange={handleActiveTargetChange}
          activeTargetName={activeTargetName}
        />

        {sharedDialogs}
        </div>
        {dragOverlay}
      </DndContext>
    )
  }

  return (
    <div className="scan-desk relative flex min-h-[100dvh] w-full flex-col">
      <header className="relative z-20 flex shrink-0 touch-manipulation items-center justify-between gap-2 border-b-[2px] border-jade-ink bg-card px-3 py-2">
        <GameContextControls
          compact
          context={gameContext}
          onChange={setGameContext}
          className="border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
        />
        <div className="flex shrink-0 touch-manipulation items-center gap-1">
          {isWinningForTarget ? (
            <Button
              type="button"
              size="icon-sm"
              onClick={handleCalculateWin}
              aria-label="Hitung menang"
              className="scan-cta touch-manipulation rounded-none"
            >
              <Trophy className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            disabled={mainHand.length === 0}
            onClick={() => setAnalysisOpen(true)}
            aria-label="Strategi AI"
            className="scan-cta-accent touch-manipulation rounded-none disabled:opacity-40"
          >
            <span aria-hidden className="text-sm">
              🧠
            </span>
          </Button>
          {handControls(true)}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <DndContext
          id="mahjong-calculator-mobile"
          sensors={mobileSensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTile(null)}
        >
          <div className="flex flex-col">
            <div className="px-2 py-2">
              <TileBank
                variant="table"
                layout="compact"
                fullTileIds={fullTileIds}
                onQuickAdd={addTileFromBank}
              />
            </div>

            <footer className="shrink-0 bg-transparent px-2 pb-2 pt-1">
              <div className="mx-auto flex w-full max-w-full flex-col items-stretch gap-1">
                {flowerHand.length > 0 ? (
                  <div className="w-full shrink-0 scale-90 opacity-90">
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
                      emptyTitle="Bunga & Musim"
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
                  counter={{
                    current: mainHand.length,
                    max: MAX_MAIN_TILES,
                  }}
                  tiles={mainHand}
                  onRemove={removeTile}
                  emptyTitle="Tangan Utama"
                  emptyHint="Ketuk ubin dari bank"
                />
              </div>
            </footer>
          </div>
          {dragOverlay}
        </DndContext>

        {trackedTargets.length > 0 ? (
          <section className="shrink-0 border-t-[2px] border-jade-ink bg-card px-3 py-3 pb-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-jade-ink">
                Pelatih AI
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="touch-manipulation h-8 rounded-none border-[2px] border-jade-ink bg-parchment font-mono text-[10px] uppercase tracking-[0.12em] text-jade-ink"
                onClick={() => setAnalysisOpen(true)}
              >
                Ubah Strategi
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              <StrategyHud
                targets={trackedTargets}
                activeTarget={activeTarget}
                onActiveTargetChange={handleActiveTargetChange}
                className="rounded-none border-[2px] border-jade-ink bg-parchment"
              />
              <AiSuggestions
                variant="glass"
                mainHand={mainHand}
                analysis={analysisForHud}
                activeTarget={activeTarget}
                activeTargetName={activeTargetName}
              />
            </div>
          </section>
        ) : null}
      </div>

      {sharedDialogs}
    </div>
  )
}
