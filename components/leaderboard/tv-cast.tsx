"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { FormSquares } from "@/components/jade/form-squares"
import {
  formatPlainPoints,
  formatSignedPoints,
  winRateLabel,
  type BoardStandingRow,
} from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

const POLL_MS = 12_000

export function LeaderboardTvCast({
  seasonLabel,
  standings,
  usingLiveStats,
}: {
  seasonLabel: string
  standings: BoardStandingRow[]
  usingLiveStats: boolean
}) {
  const router = useRouter()
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const tick = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [router])

  const top = standings.slice(0, 12)
  const leader = top[0]

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[#0F1A14] px-8 py-8 text-[#F4F0E6] sm:px-12 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(201,162,39,0.18),transparent_40%),radial-gradient(circle_at_90%_100%,rgba(46,125,90,0.2),transparent_45%)]"
      />

      <header className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.28em] text-[#A8B5AA]">
            Jade Mahjong · Live TV · {seasonLabel}
          </p>
          <h1 className="mt-3 font-serif text-6xl uppercase leading-none tracking-tight sm:text-7xl">
            Club board
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[#A8B5AA]">
            {usingLiveStats ? "Club standings" : "Demo board"} · auto-refresh{" "}
            {Math.round(POLL_MS / 1000)}s
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-4xl tabular-nums sm:text-5xl">
            {clock.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
          <Link
            href="/leaderboard"
            className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.16em] text-[#A8B5AA] opacity-40 hover:opacity-100"
          >
            Exit TV
          </Link>
        </div>
      </header>

      {leader ? (
        <section className="relative mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <article className="border-[3px] border-[#C9A227] bg-[#16241C] p-8 shadow-[8px_8px_0_0_#C9A227]">
            <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#C9A227]">
              On top
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-6xl leading-none sm:text-7xl">
                {leader.player.name}
              </h2>
              {leader.isPro ? (
                <span className="border-[2px] border-[#C9A227] bg-[#2E7D5A] px-2 py-1 font-mono text-xs uppercase tracking-[0.16em]">
                  Pro
                </span>
              ) : null}
            </div>
            <p className="mt-4 font-mono text-sm uppercase tracking-[0.16em] text-[#A8B5AA]">
              {leader.player.nickname} · {leader.skillTier.name} ·{" "}
              {winRateLabel(leader.winRate)}
            </p>
            <p className="mt-8 font-mono text-7xl text-[#7DCEA0] sm:text-8xl">
              {formatSignedPoints(leader.points)}
            </p>
            <div className="mt-6 flex flex-wrap gap-8 font-mono text-sm uppercase tracking-[0.14em]">
              <span>Wins {leader.wins}</span>
              <span>Games {leader.games}</span>
              <span>Biggest {formatPlainPoints(leader.biggestHand)}</span>
            </div>
            <FormSquares form={leader.form} className="mt-6" />
          </article>

          <ol className="grid content-start gap-3">
            {top.slice(1, 4).map((row) => (
              <li
                key={row.playerId}
                className={cn(
                  "flex items-center justify-between gap-4 border-[2px] border-[#F4F0E6]/25 bg-[#16241C] px-5 py-4",
                  row.isPro && "border-[#C9A227]",
                )}
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#A8B5AA]">
                    #{String(row.rank).padStart(2, "0")}
                    {row.isPro ? " · Pro" : ""}
                  </p>
                  <p className="mt-1 truncate font-serif text-3xl leading-none">
                    {row.player.name}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-2xl">
                  {formatSignedPoints(row.points)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="relative mt-16 font-serif text-4xl">No standings yet.</p>
      )}

      <section className="relative mt-10">
        <div className="overflow-hidden border-[2px] border-[#F4F0E6]/20">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#F4F0E6] font-mono text-xs uppercase tracking-[0.16em] text-[#0F1A14]">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-right">Win%</th>
                <th className="px-4 py-3 text-right">Pts/Win</th>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {top.map((row) => (
                <tr
                  key={row.playerId}
                  className="border-t border-[#F4F0E6]/15 font-mono"
                >
                  <td className="px-4 py-3 text-lg">
                    {String(row.rank).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-serif text-2xl leading-none text-[#F4F0E6]">
                      {row.player.name}
                    </span>
                    {row.isPro ? (
                      <span className="ml-2 align-middle font-mono text-[10px] uppercase tracking-[0.14em] text-[#C9A227]">
                        Pro
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right text-lg">
                    {winRateLabel(row.winRate)}
                  </td>
                  <td className="px-4 py-3 text-right text-lg">
                    {formatPlainPoints(row.ptsPerWin)}
                  </td>
                  <td className="px-4 py-3">
                    <FormSquares form={row.form} />
                  </td>
                  <td className="px-4 py-3 text-right text-xl">
                    {formatSignedPoints(row.points)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
