"use client"

import * as React from "react"
import { ArrowRight, Sparkles } from "lucide-react"

import {
  formatShantenLabel,
  type ShantenAnalysis,
} from "@/lib/mahjong/shanten"
import type { Tile } from "@/lib/mahjong/types"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import { cn } from "@/lib/utils"

interface AiSuggestionsProps {
  mainHand: Tile[]
  activeTarget: string | null
  activeTargetName?: string | null
  /** Analisis dari parent — wajib sinkron dengan activeTarget. */
  analysis: ShantenAnalysis
  variant?: "card" | "glass"
}

function shantenBadgeTone(shanten: number): string {
  if (shanten < 0) return "bg-emerald-600 text-white"
  if (shanten === 0) return "bg-sky-600 text-white"
  if (shanten === 1) return "bg-amber-500 text-white"
  return "bg-muted text-muted-foreground"
}

function TileChipList({
  tiles,
  isGlass,
  emptyLabel,
}: {
  tiles: { tile: Tile; remaining: number }[]
  isGlass: boolean
  emptyLabel: string
}) {
  if (tiles.length === 0) {
    return (
      <p
        className={cn(
          "mt-2 text-xs",
          isGlass ? "text-slate-500" : "text-muted-foreground",
        )}
      >
        {emptyLabel}
      </p>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tiles.map((u) => (
        <div
          key={u.tile.id}
          className="relative"
          title={`${u.tile.label} (${u.remaining} tersisa)`}
        >
          <MahjongTile tile={u.tile} size="sm" />
          {u.remaining > 1 ? (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {u.remaining}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function AiSuggestions({
  mainHand,
  activeTarget,
  activeTargetName,
  analysis,
  variant = "card",
}: AiSuggestionsProps) {
  const hasTiles = mainHand.length > 0
  const hasTarget = activeTarget !== null
  const isGlass = variant === "glass"
  const isTenpai = analysis.shanten === 0
  const isAgari = analysis.shanten < 0
  const showWinningOut = isTenpai && analysis.winningTiles.length > 0

  const body = (
    <>
      {!hasTiles ? (
        <p
          className={cn(
            "text-xs",
            isGlass ? "text-slate-400" : "text-muted-foreground",
          )}
        >
          Tambahkan ubin ke Tangan Utama untuk analisis shanten &amp; uke-ire.
        </p>
      ) : !hasTarget ? (
        <div
          className={cn(
            "rounded-lg border border-dashed px-4 py-6 text-center",
            isGlass
              ? "border-blue-500/25 bg-slate-950/40"
              : "border-border bg-muted/30",
          )}
        >
          <p
            className={cn(
              "text-sm",
              isGlass ? "text-slate-400" : "text-muted-foreground",
            )}
          >
            Konfirmasi strategi target untuk melihat rekomendasi buangan
          </p>
        </div>
      ) : (
        <div
          key={`${activeTarget}-${analysis.targetKey}`}
          className="flex flex-col gap-4 animate-in fade-in duration-300"
        >
          <div
            className={cn(
              "rounded-lg border p-4 text-center",
              isGlass
                ? "border-blue-500/20 bg-slate-950/50"
                : "border-border bg-muted/40",
            )}
          >
            <p
              className={cn(
                "text-xs font-medium",
                isGlass ? "text-slate-400" : "text-muted-foreground",
              )}
            >
              Shanten Saat Ini
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-100">
              {formatShantenLabel(analysis.shanten)}
            </p>
            <Badge
              className={cn(
                "mt-2 tabular-nums",
                shantenBadgeTone(analysis.shanten),
              )}
            >
              {isAgari
                ? "Agar"
                : isTenpai
                  ? "Tenpai"
                  : `${analysis.shanten}-Shanten`}
            </Badge>
          </div>

          {isAgari ? (
            <p
              className={cn(
                "rounded-lg border px-3 py-2 text-center text-sm",
                isGlass
                  ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-200"
                  : "border-emerald-500/30 bg-emerald-50 text-emerald-800",
              )}
            >
              Tangan siap menang! Tekan &quot;Hitung Menang&quot; untuk melihat
              Fan &amp; bayaran.
            </p>
          ) : showWinningOut ? (
            <div
              className={cn(
                "rounded-lg border p-3",
                isGlass
                  ? "border-sky-500/25 bg-sky-950/20"
                  : "border-sky-500/30 bg-sky-50/50",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs font-medium",
                    isGlass ? "text-sky-300" : "text-sky-700",
                  )}
                >
                  Winning Out
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "tabular-nums",
                    isGlass && "border-sky-500/30 bg-sky-950/50 text-sky-100",
                  )}
                >
                  {analysis.winningTiles.reduce((s, t) => s + t.remaining, 0)}{" "}
                  ubin
                </Badge>
              </div>
              <p
                className={cn(
                  "text-xs",
                  isGlass ? "text-slate-400" : "text-muted-foreground",
                )}
              >
                Ubin yang menyelesaikan tangan:
              </p>
              <TileChipList
                tiles={analysis.winningTiles}
                isGlass={isGlass}
                emptyLabel="Tidak ada winning tile tersisa di dek."
              />
            </div>
          ) : isTenpai ? (
            <p
              className={cn(
                "text-xs",
                isGlass ? "text-slate-400" : "text-muted-foreground",
              )}
            >
              Tenpai — semua winning tile sudah habis di dek yang terlihat.
            </p>
          ) : null}

          {!isAgari && analysis.recommendations.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {analysis.recommendations.map((rec, i) => {
                const isWinningDiscard =
                  rec.shantenAfterDiscard <= 0 &&
                  rec.ukeIreTiles.length > 0
                return (
                  <li
                    key={`${activeTarget}-${rec.discardId}`}
                    className={cn(
                      "rounded-lg border p-3",
                      isGlass
                        ? "border-blue-500/15 bg-slate-950/40"
                        : "border-border bg-card",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isGlass ? "text-slate-400" : "text-muted-foreground",
                        )}
                      >
                        #{i + 1} Buang
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "tabular-nums",
                          isGlass &&
                            "border-blue-500/20 bg-blue-950/50 text-blue-100",
                        )}
                      >
                        {isWinningDiscard
                          ? `${rec.ukeIreCount} winning out`
                          : `${rec.ukeIreCount} uke-ire`}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <MahjongTile tile={rec.discardTile} size="sm" />
                      <ArrowRight
                        className={cn(
                          "size-4 shrink-0",
                          isGlass ? "text-slate-500" : "text-muted-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs",
                          isGlass ? "text-slate-400" : "text-muted-foreground",
                        )}
                      >
                        {isWinningDiscard ? "Menang dengan" : "Menunggu"}{" "}
                        <span className="font-semibold text-slate-100">
                          {rec.ukeIreCount}
                        </span>{" "}
                        ubin:
                      </span>
                    </div>
                    <TileChipList
                      tiles={rec.ukeIreTiles}
                      isGlass={isGlass}
                      emptyLabel={
                        isWinningDiscard
                          ? "Tidak ada winning out tersisa di dek."
                          : "Tidak ada uke-ire fisik tersisa di dek."
                      }
                    />
                  </li>
                )
              })}
            </ul>
          ) : !isAgari && !isTenpai ? (
            <p
              className={cn(
                "text-xs",
                isGlass ? "text-slate-400" : "text-muted-foreground",
              )}
            >
              Tambahkan lebih banyak ubin suit/honor untuk mendapatkan
              rekomendasi buangan.
            </p>
          ) : null}
        </div>
      )}
    </>
  )

  if (isGlass) {
    return <div className="flex flex-col gap-3">{body}</div>
  }

  return (
    <Card className="gap-4 transition-opacity duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <Sparkles className="size-4" />
          </span>
          Saran AI
          {activeTargetName ? (
            <Badge variant="outline" className="ml-auto truncate font-normal">
              {activeTargetName}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Shanten &amp; uke-ire — buangan optimal berdasarkan target aktif.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{body}</CardContent>
    </Card>
  )
}
