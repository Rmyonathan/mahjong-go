"use client"

import type { HandSuggestion } from "@/lib/mahjong/suggestions"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function percentToneText(percent: number): string {
  if (percent >= 60) return "text-emerald-600 dark:text-emerald-400"
  if (percent >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-muted-foreground"
}

export function percentToneBg(percent: number): string {
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

export function suggestionTier(key: string): { text: string; className: string } {
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
  if (key === "nine-gates") return { text: "Limit · 10 Fan", className: red }
  if (key === "big-three-dragons") return { text: "Limit · 10 Fan", className: red }
  if (key === "little-three-dragons") return { text: "Menengah · 4 Fan", className: blue }
  if (key === "big-four-winds") return { text: "Limit · 10 Fan", className: red }
  if (key === "little-four-winds") return { text: "Limit · 8 Fan", className: red }
  if (key === "all-kongs") return { text: "Limit · 10 Fan", className: red }
  if (key === "all-terminals") return { text: "Limit · 10 Fan", className: red }
  if (key === "jade-dragon") return { text: "Limit · 10 Fan", className: red }
  if (key === "ruby-dragon") return { text: "Limit · 10 Fan", className: red }
  if (key === "pearl-dragon") return { text: "Limit · 10 Fan", className: red }
  return { text: "Menengah", className: blue }
}

export function TargetSuggestionRow({
  suggestion,
  selected,
  onSelect,
  disabled,
  variant = "list",
}: {
  suggestion: HandSuggestion
  selected: boolean
  onSelect: () => void
  disabled?: boolean
  /** `grid` = kartu Strategy Board; `legendary` = kolom limit hand. */
  variant?: "list" | "grid" | "legendary"
}) {
  const tier = suggestionTier(suggestion.key)
  const isGrid = variant === "grid"
  const isLegendary = variant === "legendary"

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        (isGrid || isLegendary) && "hover:scale-[1.03] hover:shadow-lg",
        selected
          ? isLegendary
            ? "border-amber-500 bg-amber-950/30 ring-4 ring-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.35)]"
            : isGrid
              ? "border-blue-500 bg-blue-900/20 ring-4 ring-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.35)]"
              : "border-primary bg-primary/10 ring-1 ring-primary/30"
          : isLegendary
            ? "border-rose-900/60 bg-slate-950/80 hover:border-amber-600/50"
            : isGrid
              ? "border-slate-700/80 bg-slate-900/60 hover:border-blue-500/40"
              : "border-border bg-card",
        !isGrid && !isLegendary && "hover:bg-muted/50",
      )}
    >
      <div
        className={cn(
          "flex gap-2",
          isGrid || isLegendary ? "flex-col items-start" : "items-center justify-between",
        )}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "font-medium",
              isGrid || isLegendary ? "text-sm text-slate-100" : "text-sm",
            )}
          >
            {suggestion.name}
          </span>
          <Badge
            className={cn("px-1.5 py-0 text-[10px] font-medium", tier.className)}
          >
            {tier.text}
          </Badge>
        </span>
        <span
          className={cn(
            "shrink-0 font-bold tabular-nums",
            isGrid || isLegendary ? "text-lg" : "text-sm",
            isGrid || isLegendary
              ? percentToneText(suggestion.percent).replace(
                  "text-muted-foreground",
                  "text-slate-400",
                )
              : percentToneText(suggestion.percent),
          )}
        >
          {suggestion.percent}%
        </span>
      </div>
      <div
        className={cn(
          "h-2 w-full overflow-hidden rounded-full",
          isGrid || isLegendary ? "bg-slate-800" : "bg-muted",
        )}
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
      <span
        className={cn(
          "text-xs",
          isGrid || isLegendary ? "text-slate-400" : "text-muted-foreground",
        )}
      >
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
