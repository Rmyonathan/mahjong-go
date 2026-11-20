"use client"

import { useMemo, useState } from "react"

import { TileStrip } from "@/components/jade/tile-strip"
import {
  COMBO_POINT_FILTERS,
  HOUSE_COMBO_PATTERNS,
  type ComboPointBucket,
} from "@/lib/mock/jade-combos"
import { cn } from "@/lib/utils"

export function CombosFilter() {
  const [bucket, setBucket] = useState<ComboPointBucket | "all">("all")

  const groups = useMemo(() => {
    const filtered =
      bucket === "all"
        ? HOUSE_COMBO_PATTERNS
        : HOUSE_COMBO_PATTERNS.filter((entry) => entry.bucket === bucket)

    const order: ComboPointBucket[] = ["1", "2", "4", "6", "8+"]
    return order
      .map((key) => ({
        key,
        label:
          key === "1"
            ? "1 pt"
            : key === "8+"
              ? "8+ pts"
              : `${key} pts`,
        items: filtered.filter((entry) => entry.bucket === key),
      }))
      .filter((group) => group.items.length > 0)
  }, [bucket])

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by points">
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
                "border-[2px] border-jade-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em]",
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
              <h3 className="font-serif text-3xl uppercase">{group.label}</h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {String(group.items.length).padStart(2, "0")} pola
              </p>
            </div>
            <div className="jade-rule mt-3" />
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {group.items.map((combo) => (
                <li key={combo.id} className="jade-card flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-xl leading-tight">{combo.name}</h4>
                      {combo.tag ? (
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {combo.tag}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 border-[1.5px] border-jade-ink bg-card px-2 py-1 font-mono text-xs">
                      {combo.points} PTS
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{combo.description}</p>
                  <TileStrip ids={combo.exampleTileIds} size="xs" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
