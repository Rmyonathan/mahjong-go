"use client"

import { useDraggable } from "@dnd-kit/core"

import { TILE_BANK_GROUPS } from "@/lib/mahjong/tiles"
import type { Tile } from "@/lib/mahjong/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import { cn } from "@/lib/utils"

/** Prefix id draggable untuk ubin bank agar tidak bentrok dengan tangan. */
export const BANK_DRAG_PREFIX = "bank:"

interface BankTileProps {
  tile: Tile
  disabled?: boolean
  onQuickAdd: (tile: Tile) => void
  tileSize?: "xs" | "sm" | "md"
  /** Mobile: ketuk saja, tanpa listener drag yang memblokir sentuhan iOS. */
  tapOnly?: boolean
}

function BankTile({
  tile,
  disabled,
  onQuickAdd,
  tileSize = "sm",
  tapOnly = false,
}: BankTileProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${BANK_DRAG_PREFIX}${tile.id}`,
    data: { source: "bank", tile },
    disabled: disabled || tapOnly,
  })

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={() => !disabled && onQuickAdd(tile)}
      aria-label={`Tambah ${tile.label}`}
      className={cn(
        "touch-manipulation rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
        tapOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        disabled && "cursor-not-allowed opacity-40",
        isDragging && "opacity-30",
      )}
      {...(tapOnly ? {} : { ...listeners, ...attributes })}
    >
      <MahjongTile tile={tile} size={tileSize} className="pointer-events-none" />
    </button>
  )
}

interface TileBankProps {
  /** Jenis ubin yang sudah penuh (4 salinan / 1 untuk bonus) sehingga dinonaktifkan. */
  fullTileIds: Set<string>
  onQuickAdd: (tile: Tile) => void
  /** [BARU] `table` = tampilan di meja digital gelap. */
  variant?: "default" | "table"
  /** Sidebar sempit untuk mobile lanskap. */
  layout?: "default" | "compact"
}

export function TileBank({
  fullTileIds,
  onQuickAdd,
  variant = "default",
  layout = "default",
}: TileBankProps) {
  const isTable = variant === "table"
  const isCompact = layout === "compact"
  const tileSize: "xs" | "sm" | "md" = isCompact ? "xs" : isTable ? "md" : "sm"

  const content = (
    <div className={cn("flex flex-col", isCompact ? "gap-3" : "gap-5")}>
      {TILE_BANK_GROUPS.map((group) => (
        <section key={group.key} className="flex flex-col gap-1.5">
          <div
            className={cn(
              "flex items-baseline justify-between gap-2",
              isCompact && "px-0.5",
            )}
          >
            <h3
              className={cn(
                "font-semibold",
                isTable ? "text-slate-200" : undefined,
                isCompact ? "text-[10px]" : "text-sm",
              )}
            >
              {group.title}
            </h3>
            {!isCompact ? (
              <p
                className={cn(
                  "text-xs",
                  isTable ? "text-slate-500" : "text-muted-foreground",
                )}
              >
                {group.description}
              </p>
            ) : null}
          </div>
          <div
            className={cn(
              "flex gap-1",
              isCompact ? "flex-wrap justify-start" : "flex-wrap justify-center gap-2",
            )}
          >
            {group.tiles.map((tile) => (
              <BankTile
                key={tile.id}
                tile={tile}
                tileSize={tileSize}
                tapOnly={isCompact}
                disabled={fullTileIds.has(tile.id)}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )

  if (isTable && isCompact) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-700/50 px-2 py-1.5">
          <h2 className="text-[11px] font-semibold text-slate-100">Bank Ubin</h2>
          <p className="text-[9px] text-slate-500">Ketuk ubin untuk menambah</p>
        </div>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden px-1.5 py-2">
          {content}
        </div>
      </div>
    )
  }

  if (isTable) {
    return (
      <div className="w-full max-w-6xl rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Bank Ubin</h2>
            <p className="text-xs text-slate-400">
              Seret atau ketuk ubin ke tangan Anda
            </p>
          </div>
          <Badge
            variant="secondary"
            className="border-slate-600/50 bg-slate-800/80 text-slate-300"
          >
            144 ubin
          </Badge>
        </div>
        {content}
      </div>
    )
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bank Ubin</span>
          <Badge variant="muted">144 ubin</Badge>
        </CardTitle>
        <CardDescription>
          Seret ubin ke tangan pemain, atau klik untuk menambah cepat.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
