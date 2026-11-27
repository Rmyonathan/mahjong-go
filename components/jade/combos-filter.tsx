"use client"

import { useMemo, useState } from "react"

import { TileStrip } from "@/components/jade/tile-strip"
import {
  COMBO_POINT_FILTERS,
  HOUSE_COMBO_PATTERNS,
  type ComboPointBucket,
} from "@/lib/mock/jade-combos"
import { cn } from "@/lib/utils"

const BUCKET_ORDER: ComboPointBucket[] = ["1", "3", "4", "6", "10"]

const BUCKET_LABELS: Record<ComboPointBucket, string> = {
  "1": "1 Faan",
  "3": "3 Faan",
  "4": "4 Faan",
  "6": "6 Faan",
  "10": "10+ Faan (Limit)",
}

export function CombosFilter() {
  const [bucket, setBucket] = useState<ComboPointBucket | "all">("all")

  const groups = useMemo(() => {
    const filtered =
      bucket === "all"
        ? HOUSE_COMBO_PATTERNS
        : HOUSE_COMBO_PATTERNS.filter((entry) => entry.bucket === bucket)

    return BUCKET_ORDER.map((key) => ({
      key,
      label: BUCKET_LABELS[key],
      items: filtered.filter((entry) => entry.bucket === key),
    })).filter((group) => group.items.length > 0)
  }, [bucket])

  return (
    <div>
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filter by Faan"
      >
        {COMBO_POINT_FILTERS.map((filter) => {
          const active = bucket === filter.id
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setBucket(filter.id)}
              className={cn(
                "shrink-0 border-[2px] border-jade-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em]",
                active ? "bg-jade-ink text-parchment" : "bg-card hover:bg-muted",
              )}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.key} aria-label={group.label}>
            <div className="flex items-end justify-between gap-3">
              <h3 className="font-serif text-2xl uppercase sm:text-3xl">
                {group.label}
              </h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {String(group.items.length).padStart(2, "0")} pola
              </p>
            </div>
            <div className="jade-rule mt-3" />
            <ul className="mt-3 flex flex-col gap-2">
              {group.items.map((combo) => (
                <li
                  key={combo.id}
                  className="jade-card min-w-0 overflow-hidden p-2.5 sm:p-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h4 className="font-serif text-sm leading-tight sm:text-base">
                          {combo.name}
                        </h4>
                        {combo.tag ? (
                          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                            {combo.tag}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted-foreground sm:line-clamp-2 sm:text-xs">
                        {combo.description}
                      </p>
                    </div>
                    <span className="shrink-0 border border-jade-ink bg-card px-1.5 py-0.5 font-mono text-[10px]">
                      {combo.points}F
                    </span>
                  </div>
                  <div className="mt-1.5 min-w-0 border-t border-jade-ink/15 pt-1.5">
                    <TileStrip ids={combo.exampleTileIds} size="xs" horizontal />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}