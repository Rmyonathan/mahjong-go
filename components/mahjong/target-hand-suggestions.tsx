"use client"

import * as React from "react"
import { Lightbulb } from "lucide-react"

import { suggestTargetHands, type HandSuggestion } from "@/lib/mahjong/suggestions"
import type { Tile } from "@/lib/mahjong/types"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface TargetHandSuggestionsProps {
  mainHand: Tile[]
  selectedTarget: string | null
  onSelectTarget: (key: string | null) => void
}

function percentToneText(percent: number): string {
  if (percent >= 60) return "text-emerald-600 dark:text-emerald-400"
  if (percent >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-muted-foreground"
}

function percentToneBg(percent: number): string {
  if (percent >= 60) return "bg-emerald-500"
  if (percent >= 40) return "bg-amber-500"
  return "bg-primary/60"
}

function connectivityLabel(blocks: number): string {
  if (blocks >= 4) return "Konektivitas Sangat Baik"
  if (blocks >= 2.5) return "Konektivitas Baik"
  if (blocks >= 1) return "Konektivitas Lemah"
  return "Belum Terhubung"
}

function suggestionTier(key: string): { text: string; className: string } {
  const gray =
    "border-transparent bg-zinc-200 text-zinc-700 dark:bg-zinc-700/60 dark:text-zinc-200"
  const blue =
    "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
  const gold =
    "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
  const red =
    "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"

  if (key === "all-chows") return { text: "Cepat · 1 Fan", className: gray }
  if (key === "chicken-hand") return { text: "Cepat · Menang Dasar", className: gray }
  if (key === "seven-pairs") return { text: "Menengah · 4 Fan", className: blue }
  if (key.startsWith("flush-seven-pairs-"))
    return { text: "Limit · 10 Fan", className: red }
  if (key === "all-pungs") return { text: "Menengah · 3 Fan", className: blue }
  if (key.startsWith("half-flush")) return { text: "Menengah · 3 Fan", className: blue }
  if (key.startsWith("full-flush")) return { text: "Tinggi · 6 Fan", className: gold }
  if (key === "thirteen-orphans") return { text: "Limit · 10 Fan", className: red }
  if (key === "all-honors") return { text: "Limit · 10 Fan", className: red }
  return { text: "Menengah", className: blue }
}

function TargetRow({
  suggestion,
  selected,
  onSelect,
}: {
  suggestion: HandSuggestion
  selected: boolean
  onSelect: () => void
}) {
  const tier = suggestionTier(suggestion.key)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">{suggestion.name}</span>
          <Badge
            className={cn("px-1.5 py-0 text-[10px] font-medium", tier.className)}
          >
            {tier.text}
          </Badge>
        </span>
        <span
          className={cn(
            "shrink-0 text-sm font-bold tabular-nums",
            percentToneText(suggestion.percent),
          )}
        >
          {suggestion.percent}%
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={suggestion.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            percentToneBg(suggestion.percent),
          )}
          style={{ width: `${suggestion.percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {suggestion.blocks !== undefined ? (
          <>
            Membangun{" "}
            <span className="tabular-nums">{suggestion.blocks.toFixed(1)}</span>{" "}
            dari 5 Blok · {connectivityLabel(suggestion.blocks)}
          </>
        ) : (
          <span className="tabular-nums">
            {suggestion.matched} / {suggestion.total} ubin cocok
          </span>
        )}
      </span>
    </button>
  )
}

export function TargetHandSuggestions({
  mainHand,
  selectedTarget,
  onSelectTarget,
}: TargetHandSuggestionsProps) {
  const suggestions = React.useMemo(
    () => suggestTargetHands(mainHand),
    [mainHand],
  )

  // Bersihkan pilihan jika target tidak lagi muncul di daftar.
  React.useEffect(() => {
    if (
      selectedTarget &&
      !suggestions.some((s) => s.key === selectedTarget)
    ) {
      onSelectTarget(null)
    }
  }, [suggestions, selectedTarget, onSelectTarget])

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Lightbulb className="size-4" />
          </span>
          Saran Target Tangan
        </CardTitle>
        <CardDescription>
          Pilih target tangan untuk melihat rekomendasi buangan di bawah.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {suggestions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.key}>
                <TargetRow
                  suggestion={suggestion}
                  selected={selectedTarget === suggestion.key}
                  onSelect={() =>
                    onSelectTarget(
                      selectedTarget === suggestion.key ? null : suggestion.key,
                    )
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tambahkan ubin ke Tangan Utama untuk melihat analisis kecocokan
            pola.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
