"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import { ALL_TILE_KINDS, TILE_BY_ID, TILE_BANK_GROUPS } from "@/lib/mahjong/tiles"
import type { Tile } from "@/lib/mahjong/types"
import { cn } from "@/lib/utils"

export function ScannedHandEditor({
  tileIds,
  uncertainIndices,
  onChange,
  highlightWinningIndex,
}: {
  tileIds: string[]
  uncertainIndices: number[]
  onChange: (next: { tileIds: string[]; uncertainIndices: number[] }) => void
  /** Optional gold ring for the winning tile (last by default in live log). */
  highlightWinningIndex?: number | null
}) {
  const [swapIndex, setSwapIndex] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const uncertain = useMemo(
    () => new Set(uncertainIndices),
    [uncertainIndices],
  )

  function removeAt(index: number) {
    const nextIds = tileIds.filter((_, i) => i !== index)
    const nextUncertain = uncertainIndices
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i))
    onChange({ tileIds: nextIds, uncertainIndices: nextUncertain })
    if (swapIndex === index) setSwapIndex(null)
  }

  function replaceAt(index: number, tileId: string) {
    if (!TILE_BY_ID[tileId]) return
    const nextIds = tileIds.map((id, i) => (i === index ? tileId : id))
    const nextUncertain = uncertainIndices.filter((i) => i !== index)
    onChange({ tileIds: nextIds, uncertainIndices: nextUncertain })
    setSwapIndex(null)
  }

  function addTile(tileId: string) {
    if (!TILE_BY_ID[tileId]) return
    onChange({
      tileIds: [...tileIds, tileId],
      uncertainIndices,
    })
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tileIds.map((id, index) => {
          const tile = TILE_BY_ID[id]
          if (!tile) return null
          const isUncertain = uncertain.has(index)
          const isWinning = highlightWinningIndex === index
          return (
            <div key={`${id}-${index}`} className="relative">
              <button
                type="button"
                title={`Tap to swap · ${tile.label}`}
                onClick={() => {
                  setAdding(false)
                  setSwapIndex(swapIndex === index ? null : index)
                }}
                className={cn(
                  "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade-accent",
                  isUncertain && "ring-2 ring-jade-gold ring-offset-1",
                  isWinning && !isUncertain && "ring-2 ring-jade-gold",
                )}
              >
                <MahjongTile
                  tile={tile}
                  size="xs"
                  className="rounded-none shadow-none ring-1 ring-jade-ink/20"
                />
              </button>
              <button
                type="button"
                aria-label={`Remove ${tile.label}`}
                onClick={() => removeAt(index)}
                className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-jade-ink text-[9px] text-white"
              >
                ×
              </button>
            </div>
          )
        })}
        <button
          type="button"
          onClick={() => {
            setSwapIndex(null)
            setAdding((v) => !v)
          }}
          className="inline-flex h-10 w-8 items-center justify-center border border-dashed border-jade-ink/40 bg-white text-jade-ink/70"
          aria-label="Add tile"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {uncertainIndices.length > 0 ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-gold">
          Gold ring · AI unsure — tap to swap
        </p>
      ) : (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Tap a tile to swap · × to delete · + to add
        </p>
      )}

      {swapIndex != null || adding ? (
        <TilePicker
          title={
            swapIndex != null
              ? `Swap tile #${swapIndex + 1}`
              : "Add tile"
          }
          onPick={(tile) => {
            if (swapIndex != null) replaceAt(swapIndex, tile.id)
            else addTile(tile.id)
          }}
          onClose={() => {
            setSwapIndex(null)
            setAdding(false)
          }}
        />
      ) : null}
    </div>
  )
}

function TilePicker({
  title,
  onPick,
  onClose,
}: {
  title: string
  onPick: (tile: Tile) => void
  onClose: () => void
}) {
  return (
    <div className="max-h-56 overflow-y-auto border-[2px] border-jade-ink bg-card p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em]">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
        >
          <Trash2 className="size-3" />
          Close
        </button>
      </div>
      {TILE_BANK_GROUPS.map((group) => (
        <div key={group.key} className="mb-2">
          <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {group.title}
          </p>
          <div className="flex flex-wrap gap-1">
            {(group.tiles.length ? group.tiles : ALL_TILE_KINDS).map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => onPick(tile)}
                className="rounded-sm focus-visible:ring-2 focus-visible:ring-jade-accent"
              >
                <MahjongTile
                  tile={tile}
                  size="xs"
                  className="rounded-none shadow-none ring-1 ring-jade-ink/15"
                />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
