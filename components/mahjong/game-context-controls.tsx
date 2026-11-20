"use client"

import type { GameContext, Wind } from "@/lib/mahjong/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const WIND_OPTIONS: { value: Wind; label: string }[] = [
  { value: "East", label: "Timur" },
  { value: "South", label: "Selatan" },
  { value: "West", label: "Barat" },
  { value: "North", label: "Utara" },
]

interface GameContextControlsProps {
  context: GameContext
  onChange: (context: GameContext) => void
  className?: string
  compact?: boolean
}

export function GameContextControls({
  context,
  onChange,
  className,
  compact = false,
}: GameContextControlsProps) {
  return (
    <div
      className={cn(
        "scan-panel flex flex-wrap items-end gap-3 rounded-none p-3",
        compact && "gap-2 p-2",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-[8.5rem] flex-col gap-1.5",
          compact && "min-w-[5.5rem] gap-1",
        )}
      >
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
            compact && "text-[9px]",
          )}
        >
          Angin Kursi
        </span>
        <Select
          value={context.seatWind}
          onValueChange={(value) => {
            if (value) {
              onChange({ ...context, seatWind: value as Wind })
            }
          }}
        >
          <SelectTrigger
            className={cn(
              "w-full touch-manipulation rounded-none border-[2px] border-jade-ink bg-parchment text-jade-ink",
              compact && "h-8 text-xs",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {WIND_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "flex min-w-[8.5rem] flex-col gap-1.5",
          compact && "min-w-[5.5rem] gap-1",
        )}
      >
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
            compact && "text-[9px]",
          )}
        >
          Angin Ronde
        </span>
        <Select
          value={context.roundWind}
          onValueChange={(value) => {
            if (value) {
              onChange({ ...context, roundWind: value as Wind })
            }
          }}
        >
          <SelectTrigger
            className={cn(
              "w-full touch-manipulation rounded-none border-[2px] border-jade-ink bg-parchment text-jade-ink",
              compact && "h-8 text-xs",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {WIND_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
