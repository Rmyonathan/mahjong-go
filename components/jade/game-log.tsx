"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"

import { TileStrip } from "@/components/jade/tile-strip"
import { getPlayer } from "@/lib/mock/jade-data"
import {
  formatSignedPoints,
  type SessionDetail,
  type SessionHand,
} from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

export function GameLog({ session }: { session: SessionDetail }) {
  const [tab, setTab] = useState<"hands" | "scoreboard">("hands")

  return (
    <section className="jade-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#102A20]/10 px-3 py-3 sm:gap-3 sm:px-4">
        <h2 className="font-serif text-xl sm:text-2xl">Game log</h2>
        <div
          className="flex rounded-full bg-[#F6F4EE] p-0.5"
          role="tablist"
        >
          {(
            [
              ["hands", "Hands"],
              ["scoreboard", "Board"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition",
                tab === id
                  ? "bg-jade-accent text-white shadow-sm"
                  : "text-jade-ink/65",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "hands" ? (
        <ol className="divide-y divide-jade-ink/30">
          {session.hands.map((hand) => (
            <HandRow key={hand.id} hand={hand} playerIds={session.playerIds} />
          ))}
        </ol>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead className="bg-jade-ink font-mono text-[10px] uppercase tracking-[0.14em] text-parchment">
              <tr>
                <th className="px-3 py-2">Hand</th>
                {session.playerIds.map((id) => (
                  <th key={id} className="px-3 py-2 text-right">
                    {getPlayer(id).nickname}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {session.playerIds.map((id) => id).length
                ? Array.from(
                    { length: (session.race[session.playerIds[0]]?.length ?? 1) - 1 },
                    (_, handIndex) => (
                      <tr
                        key={handIndex}
                        className="border-b border-jade-ink/25 last:border-b-0"
                      >
                        <td className="px-3 py-2 font-mono text-xs">
                          {String(handIndex + 1).padStart(2, "0")}
                        </td>
                        {session.playerIds.map((playerId) => {
                          const series = session.race[playerId] ?? [0]
                          const prev = series[handIndex] ?? 0
                          const next = series[handIndex + 1] ?? prev
                          const delta = next - prev
                          return (
                            <td
                              key={playerId}
                              className={cn(
                                "px-3 py-2 text-right font-mono text-xs",
                                delta > 0 && "text-jade-accent",
                                delta < 0 && "text-jade-red",
                              )}
                            >
                              {formatSignedPoints(delta)}
                              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                {formatSignedPoints(next)}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ),
                  )
                : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function HandRow({
  hand,
  playerIds,
}: {
  hand: SessionHand
  playerIds: string[]
}) {
  const winner = getPlayer(hand.winnerId)
  const dealtBy = hand.dealtById ? getPlayer(hand.dealtById) : null

  async function shareHand() {
    const text = `Hand ${String(hand.handNo).padStart(2, "0")} · ${winner.nickname} · ${hand.combos.map((c) => c.label).join(", ")}`
    try {
      if (navigator.share) {
        await navigator.share({ title: "Jade hand", text })
        return
      }
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  return (
    <li className="px-3 py-3.5 sm:px-4 sm:py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="font-mono text-xs tracking-wider text-muted-foreground sm:text-sm">
              {String(hand.handNo).padStart(2, "0")}
            </span>
            <span className="truncate font-serif text-lg leading-none sm:text-xl">
              {winner.name}
            </span>
            <span className="rounded-full bg-jade-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-jade-accent">
              {hand.method === "self-draw"
                ? "Self-draw"
                : `Off ${dealtBy?.nickname ?? "—"}`}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hand.combos.map((combo) => (
              <span
                key={`${hand.id}-${combo.label}`}
                className="rounded-full border border-[#102A20]/10 bg-[#F6F4EE] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]"
              >
                {combo.label} {combo.fan}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={shareHand}
          className="tap-press inline-flex shrink-0 items-center gap-1 rounded-full border border-[#102A20]/12 bg-white px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] sm:text-[10px]"
          aria-label="Share this hand"
        >
          <Share2 className="size-3" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      <div className="mt-3 -mx-1 overflow-x-auto px-1">
        <TileStrip ids={hand.tileIds} winningId={hand.winningTileId} size="xs" />
        {hand.bonusTileIds.length > 0 ? (
          <div className="mt-2">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Bonus
            </p>
            <TileStrip ids={hand.bonusTileIds} size="xs" />
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-jade-ink/15 pt-3">
        {playerIds.map((playerId) => {
          const player = getPlayer(playerId)
          const delta = hand.deltas[playerId] ?? 0
          return (
            <div
              key={playerId}
              className="min-w-0 font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]"
            >
              <p className="truncate text-muted-foreground">{player.nickname}</p>
              <p
                className={cn(
                  "mt-0.5 text-xs sm:text-sm",
                  delta > 0 && "text-jade-accent",
                  delta < 0 && "text-jade-red",
                )}
              >
                {formatSignedPoints(delta)}
              </p>
            </div>
          )
        })}
      </div>
    </li>
  )
}
