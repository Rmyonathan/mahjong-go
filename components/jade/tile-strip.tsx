import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import { cn } from "@/lib/utils"

interface TileStripProps {
  ids: string[]
  winningId?: string | null
  size?: "xs" | "sm"
  /** One row; swipe sideways on narrow cards (default on). */
  horizontal?: boolean
  className?: string
}

export function TileStrip({
  ids,
  winningId = null,
  size = "xs",
  horizontal = true,
  className,
}: TileStripProps) {
  return (
    <div
      className={cn(
        "flex gap-0.5 sm:gap-1",
        horizontal
          ? "min-w-0 flex-nowrap overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex-wrap",
        className,
      )}
    >
      {ids.map((id, index) => {
        const tile = TILE_BY_ID[id]
        if (!tile) return null
        const winning = id === winningId
        return (
          <MahjongTile
            key={`${id}-${index}`}
            tile={tile}
            size={size}
            className={cn(
              "shrink-0",
              horizontal && "w-7 sm:w-8",
              winning && "ring-2 ring-jade-gold",
            )}
          />
        )
      })}
    </div>
  )
}
