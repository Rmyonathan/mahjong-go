"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { Share2 } from "lucide-react"

import { tileImageSrc } from "@/lib/mahjong/tile-image"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import { formatPlainPoints, formatSignedPoints } from "@/lib/mock/jade-board"
import { shareOrDownloadImage } from "@/lib/share/capture"
import { cn } from "@/lib/utils"

export type WinStoryPayload = {
  sessionTitle: string
  handNo: number
  winnerName: string
  method: string
  points: number
  combos: { label: string; fan: number }[]
  tileIds: string[]
  winningTileId: string
}

/** Off-screen 9:16 editorial card + 1-tap share/download. */
export function ShareWinCardButton({
  hand,
  isPro,
  className,
}: {
  hand: WinStoryPayload
  isPro: boolean
  className?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  if (hand.points <= 0 && hand.method === "draw") return null

  async function onShare() {
    if (!cardRef.current || busy) return
    setBusy(true)
    try {
      await shareOrDownloadImage({
        node: cardRef.current,
        fileName: `jade-win-hand-${hand.handNo}.png`,
        title: `${hand.winnerName} · Jade Mahjong`,
        text: `${hand.winnerName} · ${formatSignedPoints(hand.points)} · ${hand.sessionTitle}`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={onShare}
        className={cn(
          "inline-flex items-center gap-1.5 border-[2px] border-jade-ink bg-card px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-50",
          className,
        )}
      >
        <Share2 className="size-3" />
        {busy ? "Rendering…" : "Share win card"}
      </button>

      {/* Capture target — fixed off-viewport, 9:16 */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-[-10000px] z-[-1]"
      >
        <div
          ref={cardRef}
          className="relative flex h-[1920px] w-[1080px] flex-col overflow-hidden bg-[#F4F0E6] text-[#1A1A1A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(201,162,39,0.22),transparent_45%),radial-gradient(circle_at_90%_80%,rgba(46,125,90,0.18),transparent_40%)]" />
          <div className="relative flex h-full flex-col px-16 pb-20 pt-24">
            <div className="flex items-center gap-5">
              <Image
                src="/jade.png"
                alt=""
                width={96}
                height={96}
                className="size-24 object-contain"
                unoptimized
              />
              <div>
                <p className="font-mono text-2xl uppercase tracking-[0.28em] text-[#5C6B5E]">
                  Jade Mahjong
                </p>
                <p className="mt-2 font-mono text-xl uppercase tracking-[0.18em] text-[#8A6A1F]">
                  Vol. 01 · Win card
                </p>
              </div>
            </div>

            <p className="mt-16 font-mono text-3xl uppercase tracking-[0.2em] text-[#5C6B5E]">
              Hand {String(hand.handNo).padStart(2, "0")} · {hand.method}
            </p>
            <h1 className="mt-6 text-[7.5rem] leading-[0.9] tracking-tight">
              {hand.winnerName}
            </h1>
            <p className="mt-8 font-mono text-7xl text-[#2E7D5A]">
              {formatSignedPoints(hand.points)}
            </p>
            <p className="mt-3 font-mono text-3xl uppercase tracking-[0.14em] text-[#5C6B5E]">
              {formatPlainPoints(hand.points)} pts · {hand.sessionTitle}
            </p>

            <div className="mt-14 flex flex-wrap gap-3">
              {[...hand.combos]
                .filter((c) => c.label !== "Draw")
                .sort((a, b) => b.fan - a.fan)
                .map((combo) => (
                  <span
                    key={`${combo.label}-${combo.fan}`}
                    className="border-[3px] border-[#1A1A1A] bg-white px-5 py-3 font-mono text-3xl uppercase tracking-[0.14em]"
                  >
                    {combo.label}
                    {combo.fan > 0 ? ` · ${combo.fan}f` : ""}
                  </span>
                ))}
            </div>

            <div className="mt-16 flex flex-wrap gap-3">
              {hand.tileIds.map((id, index) => {
                const tile = TILE_BY_ID[id]
                if (!tile) return null
                const winning = id === hand.winningTileId
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${id}-${index}`}
                    src={tileImageSrc(tile.imagePath)}
                    alt={tile.label}
                    width={84}
                    height={112}
                    className={cn(
                      "h-[112px] w-[84px] rounded-md border-[3px] border-[#1A1A1A] bg-white object-cover object-center",
                      winning && "ring-8 ring-[#C9A227]",
                    )}
                  />
                )
              })}
            </div>

            <div className="mt-auto flex items-end justify-between gap-6 border-t-[3px] border-[#1A1A1A] pt-10">
              <p className="max-w-[28rem] font-mono text-2xl uppercase tracking-[0.16em] text-[#5C6B5E]">
                Bandar Lampung · House HKOS
              </p>
              {isPro ? (
                <span className="border-[3px] border-[#C9A227] bg-[#2E7D5A] px-5 py-3 font-mono text-2xl uppercase tracking-[0.18em] text-[#F4F0E6]">
                  Pro
                </span>
              ) : (
                <p className="rotate-[-8deg] font-mono text-4xl uppercase tracking-[0.2em] text-[#1A1A1A]/30">
                  Mahjong Go
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
