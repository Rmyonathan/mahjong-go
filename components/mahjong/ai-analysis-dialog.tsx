"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { TargetSuggestionRow } from "@/components/mahjong/target-suggestion-row"
import { suggestTargetHands } from "@/lib/mahjong/suggestions"
import type { Tile } from "@/lib/mahjong/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const MAX_STANDARD = 2

export interface StrategySelection {
  standard: string[]
  legendary: string | null
}

interface AiAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mainHand: Tile[]
  initialStandard: string[]
  initialLegendary: string | null
  onConfirm: (selection: StrategySelection) => void
}

export function AiAnalysisDialog({
  open,
  onOpenChange,
  mainHand,
  initialStandard,
  initialLegendary,
  onConfirm,
}: AiAnalysisDialogProps) {
  const suggestions = React.useMemo(
    () => suggestTargetHands(mainHand),
    [mainHand],
  )

  const standardSuggestions = React.useMemo(
    () => suggestions.filter((s) => s.category === "standard"),
    [suggestions],
  )
  const legendarySuggestions = React.useMemo(
    () => suggestions.filter((s) => s.category === "legendary"),
    [suggestions],
  )

  // [BARU] Pilihan terpisah: maks. 2 standar + maks. 1 legendaris.
  const [selectedStandard, setSelectedStandard] = React.useState<string[]>([])
  const [selectedLegendary, setSelectedLegendary] = React.useState<
    string | null
  >(null)

  React.useEffect(() => {
    if (open) {
      setSelectedStandard(initialStandard)
      setSelectedLegendary(initialLegendary)
    }
  }, [open, initialStandard, initialLegendary])

  function toggleStandard(key: string) {
    setSelectedStandard((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= MAX_STANDARD) return prev
      return [...prev, key]
    })
  }

  function toggleLegendary(key: string) {
    setSelectedLegendary((prev) => (prev === key ? null : key))
  }

  const totalSelected =
    selectedStandard.length + (selectedLegendary ? 1 : 0)

  function handleConfirm() {
    onConfirm({ standard: selectedStandard, legendary: selectedLegendary })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        className="flex max-h-[92dvh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden border-slate-700 bg-slate-950 p-0 text-slate-100 sm:w-[90vw]"
      >
        <div className="shrink-0 space-y-4 p-4 pb-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg text-slate-100 sm:text-xl">
              <span className="grid size-9 place-items-center rounded-xl bg-blue-500/20 text-blue-300 sm:size-10">
                <Sparkles className="size-4 sm:size-5" />
              </span>
              Papan Strategi AI
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Pilih strategi realistis: hingga 2 tangan standar dan opsional 1
              tangan legendaris. Total maksimum 3 target.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="border-slate-700 bg-slate-900 tabular-nums text-slate-200"
              >
                Standar {selectedStandard.length}/{MAX_STANDARD}
              </Badge>
              <Badge
                variant="secondary"
                className="border-amber-900/50 bg-amber-950/40 tabular-nums text-amber-200"
              >
                Legendaris {selectedLegendary ? 1 : 0}/1
              </Badge>
            </div>
            <span className="text-xs text-slate-500">
              {totalSelected} dari 3 target aktif
            </span>
          </div>
        </div>

        {suggestions.length > 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-6 pb-4 lg:grid-cols-3">
            {/* [BARU] Kiri — Tangan Standar & Cepat (2/3 lebar) */}
            <section className="flex flex-col gap-3 lg:col-span-2">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Tangan Standar &amp; Cepat
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Pilih maks. 2. 85% kemenangan berasal dari tangan campuran, All
                  Chows, dan All Pungs.
                </p>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {standardSuggestions.map((suggestion) => {
                  const isSelected = selectedStandard.includes(suggestion.key)
                  const atLimit =
                    !isSelected && selectedStandard.length >= MAX_STANDARD
                  return (
                    <li key={suggestion.key} className="min-h-[8.5rem]">
                      <TargetSuggestionRow
                        variant="grid"
                        suggestion={suggestion}
                        selected={isSelected}
                        disabled={atLimit}
                        onSelect={() => toggleStandard(suggestion.key)}
                      />
                    </li>
                  )
                })}
              </ul>
              {standardSuggestions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada tangan standar yang cocok.
                </p>
              ) : null}
            </section>

            {/* [BARU] Kanan — Tangan Legendaris / Limit (1/3 lebar) */}
            <section className="flex flex-col gap-3 rounded-xl border border-rose-950/50 bg-slate-950/60 p-4">
              <div>
                <h3 className="text-base font-semibold text-amber-200">
                  Tangan Legendaris / Limit
                </h3>
                <p className="mt-1 text-xs text-rose-300/80">
                  Pilih maks. 1. Peluang astronomis (0.01%), butuh keberuntungan
                  tinggi.
                </p>
              </div>
              <ul className="flex flex-col gap-3">
                {legendarySuggestions.map((suggestion) => {
                  const isSelected = selectedLegendary === suggestion.key
                  const blocked =
                    !isSelected && selectedLegendary !== null
                  return (
                    <li key={suggestion.key}>
                      <TargetSuggestionRow
                        variant="legendary"
                        suggestion={suggestion}
                        selected={isSelected}
                        disabled={blocked}
                        onSelect={() => toggleLegendary(suggestion.key)}
                      />
                    </li>
                  )
                })}
              </ul>
              {legendarySuggestions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada limit hand yang relevan.
                </p>
              ) : null}
            </section>
            </div>
          </div>
        ) : (
          <p className="min-h-0 flex-1 px-4 py-8 text-center text-sm text-slate-400 sm:px-6">
            Tambahkan ubin ke Tangan Utama untuk melihat analisis kecocokan pola.
          </p>
        )}

        <DialogFooter className="shrink-0 gap-2 border-t border-slate-800 bg-slate-950 p-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            variant="outline"
            className="touch-manipulation border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            className="touch-manipulation bg-blue-600 px-8 hover:bg-blue-500"
            onClick={handleConfirm}
            disabled={totalSelected === 0}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
