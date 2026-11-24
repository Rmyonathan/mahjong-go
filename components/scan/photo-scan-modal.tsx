"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { ScanCameraViewfinder } from "@/components/scan/scan-camera-viewfinder"
import { ScannedHandEditor } from "@/components/scan/scanned-hand-editor"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import type { Tile } from "@/lib/mahjong/types"
import { scanHandFromFile } from "@/lib/scan/client"

type Step = "pick" | "scanning" | "review"

/**
 * Standalone photo → tile IDs flow for `/scan` calculator.
 * Scoring stays with `calculateHandScore` after tiles are applied to the hand.
 */
export function PhotoScanModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean
  onClose: () => void
  onApply: (tiles: Tile[]) => void
}) {
  const [step, setStep] = useState<Step>("pick")
  const [error, setError] = useState<string | null>(null)
  const [tileIds, setTileIds] = useState<string[]>([])
  const [uncertainIndices, setUncertainIndices] = useState<number[]>([])

  useEffect(() => {
    if (!open) return
    setStep("pick")
    setError(null)
    setTileIds([])
    setUncertainIndices([])
  }, [open])

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
      setStep("pick")
    }
  }

  function apply() {
    const tiles = tileIds
      .map((id) => TILE_BY_ID[id])
      .filter((tile): tile is Tile => Boolean(tile))
    if (!tiles.length) {
      setError("No tiles to apply")
      return
    }
    onApply(tiles)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close photo scan"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(94dvh,100%)] w-full max-w-lg flex-col overflow-hidden border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4 sm:max-h-[94vh]">
        <div className="flex shrink-0 items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Gemini · detect only
            </p>
            <h2 className="font-serif text-2xl">Scan hand photo</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {step === "pick" ? (
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
            <div className="relative flex min-h-[14rem] flex-col items-center justify-center gap-3 overflow-hidden border-[2px] border-jade-ink bg-card p-6">
              <div className="jade-scan-laser absolute inset-x-0 h-1 bg-jade-accent" />
              <p className="font-serif text-2xl">Detecting tiles…</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-jade-accent">
                ~2–4 seconds
              </p>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-4">
              <ScannedHandEditor
                tileIds={tileIds}
                uncertainIndices={uncertainIndices}
                onChange={({ tileIds: next, uncertainIndices: nextU }) => {
                  setTileIds(next)
                  setUncertainIndices(nextU)
                }}
              />
              {error ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red">
                  {error}
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("pick")}
                  className="inline-flex h-11 flex-1 items-center justify-center border-[2px] border-jade-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em]"
                >
                  Rescan
                </button>
                <button
                  type="button"
                  onClick={apply}
                  className="scan-cta inline-flex h-11 flex-[1.4] items-center justify-center font-mono text-[11px] uppercase tracking-[0.14em]"
                >
                  Apply to calculator
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
