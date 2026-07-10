import * as React from "react"
// Foto ubin dirender lewat komponen Image bawaan Next.js.
import Image from "next/image"

import type { Tile } from "@/lib/mahjong/types"
import { cn } from "@/lib/utils"

type TileSize = "xs" | "sm" | "md" | "lg" | "xl"

// Dimensi kontainer per ukuran + `sizes` untuk pemuatan gambar responsif.
const sizeStyles: Record<
  TileSize,
  { root: string; label: string; sizes: string }
> = {
  xs: { root: "h-10 w-8", label: "text-[8px]", sizes: "32px" },
  sm: { root: "h-14 w-11", label: "text-[9px]", sizes: "44px" },
  md: { root: "h-20 w-14", label: "text-[10px]", sizes: "56px" },
  lg: { root: "h-24 w-16", label: "text-[11px]", sizes: "64px" },
  // [BARU] Ukuran taktil untuk tangan di meja digital.
  xl: { root: "h-28 w-[4.5rem]", label: "text-xs", sizes: "72px" },
}

export interface MahjongTileProps
  extends React.HTMLAttributes<HTMLDivElement> {
  tile: Tile
  size?: TileSize
  showLabel?: boolean
  /** Tampilan sedang diseret (drag). */
  dragging?: boolean
}

export const MahjongTile = React.forwardRef<HTMLDivElement, MahjongTileProps>(
  function MahjongTile(
    { tile, size = "md", showLabel = false, dragging = false, className, ...props },
    ref,
  ) {
    const styles = sizeStyles[size]

    return (
      // Ref dnd-kit menempel pada kontainer (parent) foto agar drag tetap mulus.
      <div
        ref={ref}
        data-tile-id={tile.id}
        title={tile.label}
        className={cn(
          "group/tile relative select-none overflow-hidden rounded-md bg-white shadow-md ring-1 ring-black/5 transition-all",
          styles.root,
          dragging && "scale-105 shadow-xl ring-2 ring-primary/50",
          className,
        )}
        {...props}
      >
        {/* Foto ubin: responsif & tidak terpotong. Spasi pada nama berkas
            di-encode agar URL valid. */}
        <Image
          src={`/tiles/${encodeURIComponent(tile.imagePath)}`}
          alt={tile.label}
          fill
          sizes={styles.sizes}
          draggable={false}
          className="h-full w-full object-contain p-0.5 pointer-events-none"
        />
        {showLabel ? (
          <span
            className={cn(
              "absolute inset-x-0 bottom-0 truncate bg-white/80 px-1 py-0.5 text-center font-medium text-zinc-600",
              styles.label,
            )}
          >
            {tile.label}
          </span>
        ) : null}
      </div>
    )
  },
)
