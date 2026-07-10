"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Sparkles, X } from "lucide-react"

import { AiSuggestions } from "@/components/mahjong/ai-suggestions"
import { StrategyHud, type TrackedTarget } from "@/components/mahjong/strategy-hud"
import type { ShantenAnalysis } from "@/lib/mahjong/shanten"
import type { Tile } from "@/lib/mahjong/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AiCoachHudProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestAnalysis: () => void
  mainHand: Tile[]
  /** [BARU] Analisis ter-sync dari parent — berganti saat activeTarget berubah. */
  analysis: ShantenAnalysis
  trackedTargets: TrackedTarget[]
  activeTarget: string | null
  onActiveTargetChange: (key: string) => void
  activeTargetName: string | null
  /** `floating` = panel fixed desktop; `embedded` = mengisi kolom mobile. */
  mode?: "floating" | "embedded"
}

export function AiCoachHud({
  open,
  onOpenChange,
  onRequestAnalysis,
  mainHand,
  analysis,
  trackedTargets,
  activeTarget,
  onActiveTargetChange,
  activeTargetName,
  mode = "floating",
}: AiCoachHudProps) {
  const hasHand = mainHand.length > 0
  const hasStrategy = trackedTargets.length > 0
  const isEmbedded = mode === "embedded"

  const panelContent = (
    <>
      <div
        className={cn(
          "flex items-center justify-between border-b border-blue-500/20 px-4 py-3",
          isEmbedded && "px-2 py-2",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid place-items-center rounded-lg bg-blue-500/20 text-blue-300",
              isEmbedded ? "size-6" : "size-8",
            )}
          >
            <Sparkles className={isEmbedded ? "size-3" : "size-4"} />
          </span>
          <div>
            <p className={cn("font-semibold", isEmbedded ? "text-xs" : "text-sm")}>
              Pelatih AI
            </p>
            {!isEmbedded ? (
              <p className="text-[11px] text-slate-400">
                Shanten &amp; strategi buangan
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          onClick={() => onOpenChange(false)}
          aria-label="Tutup panel"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col gap-3 overflow-y-auto p-4",
          isEmbedded && "gap-2 p-2",
        )}
      >
        {!hasStrategy ? (
          <div
            className={cn(
              "rounded-xl border border-dashed border-blue-500/25 bg-slate-950/40 px-4 py-6 text-center",
              isEmbedded && "px-2 py-4",
            )}
          >
            <p className={cn("text-slate-300", isEmbedded ? "text-xs" : "text-sm")}>
              Pilih hingga 3 target tangan untuk melacak shanten dan rekomendasi
              buangan.
            </p>
            <Button
              className={cn(
                "mt-4 gap-2 bg-blue-600 hover:bg-blue-500",
                isEmbedded && "mt-2 h-8 text-xs",
              )}
              disabled={!hasHand}
              onClick={onRequestAnalysis}
            >
              <Sparkles className="size-4" />
              Buka Papan Strategi
            </Button>
          </div>
        ) : (
          <>
            <StrategyHud
              targets={trackedTargets}
              activeTarget={activeTarget}
              onActiveTargetChange={onActiveTargetChange}
              className="border-blue-500/20 bg-slate-950/50"
            />
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full border-blue-500/30 bg-slate-950/40 text-slate-200 hover:bg-slate-800",
                isEmbedded && "h-8 text-xs",
              )}
              disabled={!hasHand}
              onClick={onRequestAnalysis}
            >
              Ubah Strategi
            </Button>
            <AiSuggestions
              key={activeTarget ?? "none"}
              variant="glass"
              mainHand={mainHand}
              analysis={analysis}
              activeTarget={activeTarget}
              activeTargetName={activeTargetName}
            />
          </>
        )}
      </div>
    </>
  )

  if (isEmbedded) {
    if (!open) return null
    return (
      <aside
        className={cn(
          "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl",
          "border border-blue-500/30 bg-slate-900/60 text-slate-100 shadow-xl backdrop-blur-xl",
        )}
      >
        {panelContent}
      </aside>
    )
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          key="ai-coach-panel"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className={cn(
            "fixed right-4 top-4 z-40 flex w-80 flex-col overflow-hidden rounded-2xl",
            "border border-blue-500/30 bg-slate-900/60 text-slate-100 shadow-2xl backdrop-blur-xl",
            "bottom-44 max-h-[calc(100dvh-12rem)]",
          )}
        >
          {panelContent}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
