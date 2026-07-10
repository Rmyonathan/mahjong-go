"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export interface TrackedTarget {
  key: string
  name: string
}

interface StrategyHudProps {
  targets: TrackedTarget[]
  activeTarget: string | null
  onActiveTargetChange: (key: string) => void
  className?: string
}

export function StrategyHud({
  targets,
  activeTarget,
  onActiveTargetChange,
  className,
}: StrategyHudProps) {
  if (targets.length === 0) return null

  return (
    <div
      className={cn(
        "rounded-xl border p-2 transition-all duration-300",
        "border-slate-700/50 bg-slate-950/40",
        className,
      )}
    >
      <p className="mb-2 px-1 text-xs font-medium text-slate-400">
        Strategi Aktif
      </p>
      <Tabs
        value={activeTarget ?? targets[0]?.key ?? ""}
        onValueChange={(value) => {
          if (value && typeof value === "string") {
            onActiveTargetChange(value)
          }
        }}
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {targets.map((target) => (
            <TabsTrigger
              key={target.key}
              value={target.key}
              className="max-w-full truncate px-3 py-1.5 text-xs text-slate-300 sm:text-sm aria-[selected=true]:bg-blue-600/30 aria-[selected=true]:text-blue-100"
            >
              {target.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
