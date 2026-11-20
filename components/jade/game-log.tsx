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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[2px] border-jade-ink px-4 py-3">
        <h2 className="font-serif text-2xl">Game log</h2>
        <div className="flex border-[2px] border-jade-ink" role="tablist">
          {(
            [
              ["hands", "Hands"],
              ["scoreboard", "Scoreboard"],
            ] as const
          ).map(([id, label], index) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em]",
                index > 0 && "border-l-[2px] border-jade-ink",
                tab === id
                  ? "bg-jade-ink text-parchment"
                  : "bg-card text-jade-ink",
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
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm tracking-wider">
              {String(hand.handNo).padStart(2, "0")}
            </span>
            <span className="font-serif text-xl leading-none">{winner.name}</span>
            <span className="border border-jade-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">
              {hand.method === "self-draw"
                ? "Self-draw"
                : `Off ${dealtBy?.nickname ?? "—"}`}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hand.combos.map((combo) => (
              <span
                key={`${hand.id}-${combo.label}`}
                className="border border-jade-ink bg-parchment px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]"
              >
                {combo.label} {combo.fan}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={shareHand}
          className="inline-flex items-center gap-1.5 border-[2px] border-jade-ink bg-card px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]"
        >
          <Share2 className="size-3" />
          Share this hand
        </button>
      </div>

      <div className="mt-3">
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

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-jade-ink/25 pt-3 sm:grid-cols-4">
        {playerIds.map((playerId) => {
          const player = getPlayer(playerId)
          const delta = hand.deltas[playerId] ?? 0
          return (
            <div key={playerId} className="font-mono text-[10px] uppercase tracking-[0.12em]">
              <p className="text-muted-foreground">{player.nickname}</p>
              <p
                className={cn(
                  "mt-0.5 text-sm",
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
