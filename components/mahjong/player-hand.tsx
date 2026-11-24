"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { LayoutGroup, motion } from "framer-motion"
import { X } from "lucide-react"

import type { HandTile } from "@/lib/mahjong/types"
import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import { cn } from "@/lib/utils"

/** Id droppable untuk area tangan utama (suit/honor). */
export const MAIN_HAND_DROPPABLE_ID = "main-hand-dropzone"
/** Id droppable untuk area Bunga & Musim. */
export const FLOWER_HAND_DROPPABLE_ID = "flower-hand-dropzone"

/**
 * Batas maksimum ubin di tangan utama.
 * Tangan standar berisi 14 ubin, namun setiap Kong (4 ubin sejenis)
 * menambah 1 ubin ekstra, sehingga secara teoritis bisa mencapai 18
 * ubin (14 + hingga 4 Kong).
 */
export const MAX_MAIN_TILES = 18

/** Ubin suit/honor untuk Hu standar (4 set + pasang); Kong ekstra → hingga 18. */
export const STANDARD_WIN_TILES = 14

/** Batas maksimum ubin bonus (4 Bunga + 4 Musim). */
export const MAX_FLOWER_TILES = 8

/** Zona tempat sebuah ubin berada. */
export type HandZone = "main" | "flower"

interface SortableHandTileProps {
  tile: HandTile
  zone: HandZone
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  onRemove: (instanceId: string) => void
  /** [BARU] Gaya meja digital — ubin besar + hover taktil. */
  tactile?: boolean
}

function SortableHandTile({
  tile,
  zone,
  size = "md",
  onRemove,
  tactile = false,
}: SortableHandTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tile.instanceId,
    data: { source: "hand", zone, tile },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <motion.div
      layout={!isDragging}
      initial={false}
      ref={setNodeRef}
      style={style}
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      className={cn(
        "group relative shrink-0 touch-none",
        isDragging && "z-10 opacity-40",
      )}
    >
      <button
        type="button"
        className={cn(
          "cursor-grab outline-none active:cursor-grabbing",
          tactile && "transition-transform hover:-translate-y-2",
        )}
        aria-label={`Ubin ${tile.label} — seret untuk menata ulang`}
        {...listeners}
        {...attributes}
      >
        <MahjongTile tile={tile} size={size} />
      </button>
      <button
        type="button"
        onClick={() => onRemove(tile.instanceId)}
        aria-label={`Hapus ${tile.label}`}
        className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        <X className="size-3" />
      </button>
    </motion.div>
  )
}

interface TileDropzoneProps {
  /** Id droppable dnd-kit. */
  droppableId: string
  /** Zona logis ubin di dalam dropzone ini. */
  zone: HandZone
  /** Ubin yang ditampung. */
  tiles: HandTile[]
  onRemove: (instanceId: string) => void
  /** Gaya visual: `main` (tangan utama) atau `bonus` (Bunga & Musim). */
  tone?: "main" | "bonus" | "table"
  /** Ukuran ubin. */
  tileSize?: "xs" | "sm" | "md" | "lg" | "xl"
  /** Judul saat kosong. */
  emptyTitle: string
  /** Petunjuk saat kosong. */
  emptyHint: string
  /** `single-row` = satu baris horizontal dengan scroll. `two-row` = bungkus 2 baris (mobile). */
  layout?: "wrap" | "single-row" | "two-row"
  /** Penghitung ubin — ditampilkan di atas border. */
  counter?: { current: number; max: number }
  /** [BARU] Ubin besar + animasi hover untuk tangan meja. */
  tactile?: boolean
  /** [BARU] Padat — tinggi & padding lebih kecil untuk layar mobile. */
  dense?: boolean
  /** Lebar penuh — penting agar scroll horizontal / wrap 2 baris berfungsi di mobile. */
  fullWidth?: boolean
}

export function TileDropzone({
  droppableId,
  zone,
  tiles,
  onRemove,
  tone = "main",
  tileSize = "md",
  emptyTitle,
  emptyHint,
  layout = "wrap",
  counter,
  tactile = false,
  dense = false,
  fullWidth = false,
}: TileDropzoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  const isBonus = tone === "bonus"
  const isTable = tone === "table"
  const isSingleRow = layout === "single-row"
  const isTwoRow = layout === "two-row"

  const minHeightClass = dense
    ? isTwoRow
      ? "min-h-[6.5rem]"
      : isTable
        ? "min-h-[4.5rem]"
        : isBonus
          ? "min-h-[3.5rem]"
          : "min-h-[5rem]"
    : isTwoRow
      ? "min-h-[8rem]"
      : isTable
        ? "min-h-[6rem]"
        : isBonus
          ? "min-h-[6rem]"
          : isSingleRow
            ? "min-h-[7rem]"
            : "min-h-[9.5rem]"

  const sortStrategy =
    isTwoRow || layout === "wrap"
      ? rectSortingStrategy
      : horizontalListSortingStrategy

  return (
    <div
      className={cn(
        "flex flex-col items-center",
        fullWidth ? "w-full max-w-full" : "w-max",
      )}
    >
      {counter ? (
        <p className="mb-1.5 font-mono text-xs font-medium tabular-nums text-muted-foreground">
          {counter.current}/{counter.max}
        </p>
      ) : null}
      <div
        ref={setNodeRef}
        className={cn(
          "relative flex w-full flex-col rounded-none border-2 border-dashed transition-colors",
          minHeightClass,
          isTable
            ? "border-jade-ink/50 bg-card shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--jade-ink)_12%,transparent),4px_4px_0_0_var(--jade-ink)]"
            : undefined,
          isOver
            ? isTable
              ? "border-jade-accent bg-jade-accent/10"
              : "border-primary bg-primary/5"
            : isBonus
              ? "border-jade-gold/70 bg-[color-mix(in_srgb,var(--jade-gold)_12%,var(--bg-card))]"
              : isTable
                ? undefined
                : "border-border bg-muted/40",
        )}
      >
        <div
          className={cn(
            "flex min-h-[inherit] flex-1 items-center gap-2",
            dense ? "p-1.5" : "p-3",
            isTwoRow
              ? "flex-wrap justify-center content-start gap-1"
              : isSingleRow || isTable
                ? "flex-nowrap overflow-x-auto whitespace-nowrap [scrollbar-color:rgba(148,163,184,0.4)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600/80 [&::-webkit-scrollbar-track]:bg-transparent"
                : "flex-wrap content-start",
          )}
        >
          <LayoutGroup id={droppableId}>
            <SortableContext
              items={tiles.map((tile) => tile.instanceId)}
              strategy={sortStrategy}
            >
              {tiles.map((tile) => (
                <SortableHandTile
                  key={tile.instanceId}
                  tile={tile}
                  zone={zone}
                  size={tileSize}
                  onRemove={onRemove}
                  tactile={tactile}
                />
              ))}
            </SortableContext>
          </LayoutGroup>
          {tiles.length === 0 ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center",
                isBonus ? "py-4" : isTable ? "py-8" : isSingleRow ? "py-6" : "py-8",
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium",
                  isTable ? "font-serif text-jade-ink" : "text-muted-foreground",
                )}
              >
                {emptyTitle}
              </p>
              {emptyHint ? (
                <p
                  className={cn(
                    "text-xs",
                    isTable ? "text-muted-foreground" : "text-muted-foreground",
                  )}
                >
                  {emptyHint}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
