import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import { cn } from "@/lib/utils"

interface TileStripProps {
  ids: string[]
  winningId?: string | null
  size?: "xs" | "sm"
}

export function TileStrip({ ids, winningId = null, size = "xs" }: TileStripProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id, index) => {
        const tile = TILE_BY_ID[id]
        if (!tile) return null
        const winning = id === winningId
        return (
          <MahjongTile
            key={`${id}-${index}`}
            tile={tile}
            size={size}
            className={cn(winning && "ring-2 ring-jade-gold")}
          />
        )
      })}
    </div>
  )
}
