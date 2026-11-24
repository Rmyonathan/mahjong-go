"use client"

import type { RuleVariant } from "@/lib/mahjong/types"
import { RULESET_OPTIONS } from "@/lib/mahjong/rulesets"
import { cn } from "@/lib/utils"

export function RulesetPicker({
  value,
  onChange,
  disabled = false,
  compact = false,
  className,
}: {
  value: RuleVariant
  onChange: (next: RuleVariant) => void
  disabled?: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {!compact ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Hitungan · scoring rules
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {RULESET_OPTIONS.map((opt) => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={cn(
                "border-[2px] px-3 py-2.5 text-left transition",
                active
                  ? "border-jade-ink bg-jade-ink text-white"
                  : "border-jade-ink/25 bg-card hover:bg-muted",
                disabled && "opacity-60",
              )}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.12em]">
                {opt.shortLabel}
              </p>
              {!compact ? (
                <p
                  className={cn(
                    "mt-1 text-xs leading-snug",
                    active ? "text-white/80" : "text-muted-foreground",
                  )}
                >
                  {opt.summaryId}
                </p>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
