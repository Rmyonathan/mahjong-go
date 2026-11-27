import type { Metadata } from "next"
import Link from "next/link"

import { BoardFilters } from "@/components/jade/board-filters"
import { FormSquares } from "@/components/jade/form-squares"
import { PlayerAvatar } from "@/components/players/player-avatar"
import { getSessionUser } from "@/lib/auth"
import { getActiveSeason, getDbBoardStandings } from "@/lib/data/board"
import {
  formatPlainPoints,
  formatSignedPoints,
  winRateLabel,
  type BoardTier,
} from "@/lib/mock/jade-board"
import { countFinishedSessions } from "@/lib/session/service"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "All Rankings — Jade Mahjong",
  description: "Full season rankings at Jade Mahjong (20 per page).",
}

interface AllRankingsPageProps {
  searchParams: Promise<{
    q?: string | string[]
    board?: string | string[]
    page?: string | string[]
  }>
}

function readParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
}

function readBoard(value: string, live: boolean): BoardTier | "all" {
  if (value === "beginner" || value === "advanced" || value === "mcr") return value
  if (value === "all") return "all"
  return live ? "all" : "advanced"
}

export default async function AllRankingsPage({
  searchParams,
}: AllRankingsPageProps) {
  const params = await searchParams
  const query = readParam(params.q)
  const finishedCount = await countFinishedSessions()
  const usingLiveStats = finishedCount > 0
  const board = readBoard(readParam(params.board), usingLiveStats)

  const [season, standings, session] = await Promise.all([
    getActiveSeason(),
    getDbBoardStandings(board),
    getSessionUser(),
  ])
  const canViewProfiles = Boolean(session)

  const filtered = query
    ? standings.filter((row) =>
        `${row.player.name} ${row.player.nickname} ${row.experienceLevel.name} ${row.skillTier.name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : standings

  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(
    totalPages,
    Math.max(1, Number(readParam(params.page)) || 1),
  )
  const pagedRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function pageHref(nextPage: number) {
    const sp = new URLSearchParams()
    if (query) sp.set("q", query)
    const rawBoard = readParam(params.board)
    if (rawBoard) sp.set("board", rawBoard)
    if (nextPage > 1) sp.set("page", String(nextPage))
    const qs = sp.toString()
    return qs ? `/leaderboard/all?${qs}` : "/leaderboard/all"
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/leaderboard"
        className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-jade-soft"
      >
        ← Back to Leaderboard
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {season ? `${season.rangeLabel} · ` : ""}
            {filtered.length} players · 20 per page
          </p>
          <h1 className="mt-2 font-serif text-4xl uppercase leading-none sm:text-5xl">
            All Jade Rank
          </h1>
        </div>
        <BoardFilters
          seasonLabel={season?.label ?? "Season"}
          currentBoard={board}
          currentQuery={query}
          showSearch={false}
        />
      </div>

      {pagedRows.length === 0 ? (
        <div className="jade-card mt-6 px-4 py-8">
          <p className="font-serif text-2xl">No matching players.</p>
        </div>
      ) : (
        <>
          <div className="jade-card mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <thead className="bg-jade-ink font-mono text-[10px] uppercase tracking-[0.14em] text-parchment">
                <tr>
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Player</th>
                  <th className="px-3 py-3 text-right">Win%</th>
                  <th className="px-3 py-3 text-right">Pts/Win</th>
                  <th className="px-3 py-3 text-right">Bonus</th>
                  <th className="px-3 py-3 text-right">Pen</th>
                  <th className="px-3 py-3">Form</th>
                  <th className="px-3 py-3 text-right">Net pts</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr
                    key={row.playerId}
                    className={cn(
                      "border-b border-jade-ink/25 last:border-b-0",
                      row.isPro &&
                        "bg-gradient-to-r from-jade-gold/25 via-transparent to-jade-accent/10",
                    )}
                  >
                    <td className="px-3 py-3 font-mono text-sm">
                      {String(row.rank).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-3">
                      <div
                        className={cn(
                          "inline-flex max-w-full flex-wrap items-center gap-2",
                          row.isPro &&
                            "border-[2px] border-jade-gold px-2 py-1 shadow-[3px_3px_0_0_var(--jade-accent)]",
                        )}
                      >
                        <PlayerAvatar
                          initials={row.player.initials}
                          name={row.player.name}
                          avatarUrl={row.player.avatarUrl}
                          frameId={row.player.frameId}
                          size="xs"
                        />
                        {canViewProfiles ? (
                          <Link
                            href={`/players/${row.playerId}`}
                            className="font-serif text-lg leading-none hover:underline"
                          >
                            {row.player.name}
                          </Link>
                        ) : (
                          <span className="font-serif text-lg leading-none">
                            {row.player.name}
                          </span>
                        )}
                        {row.isPro ? (
                          <span className="inline-flex border-[2px] border-jade-gold bg-jade-accent px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-parchment">
                            Pro
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {row.player.nickname} · {row.experienceLevel.name}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm">
                      {winRateLabel(row.winRate)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm">
                      {formatPlainPoints(row.ptsPerWin)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-jade-accent">
                      {formatPlainPoints(row.bonus)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-jade-red">
                      {formatPlainPoints(row.pen)}
                    </td>
                    <td className="px-3 py-3">
                      <FormSquares form={row.form} />
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm">
                      {formatSignedPoints(row.points)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ol className="mt-5 flex flex-col gap-2 md:hidden">
            {pagedRows.map((row) => (
              <li
                key={row.playerId}
                className={cn(
                  "jade-card px-3 py-2.5",
                  row.isPro &&
                    "border-jade-gold bg-gradient-to-r from-jade-gold/25 via-transparent to-jade-accent/10 shadow-[4px_4px_0_0_var(--jade-accent)]",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 shrink-0 font-mono text-sm text-muted-foreground">
                    {String(row.rank).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {canViewProfiles ? (
                        <Link
                          href={`/players/${row.playerId}`}
                          className="truncate font-serif text-lg leading-none hover:underline"
                        >
                          {row.player.name}
                        </Link>
                      ) : (
                        <span className="truncate font-serif text-lg leading-none">
                          {row.player.name}
                        </span>
                      )}
                      {row.isPro ? (
                        <span className="inline-flex border-[2px] border-jade-gold bg-jade-accent px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-parchment">
                          Pro
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {row.player.nickname} · {winRateLabel(row.winRate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(
                        "font-mono text-sm",
                        row.points > 0 && "text-jade-accent",
                        row.points < 0 && "text-jade-red",
                      )}
                    >
                      {formatSignedPoints(row.points)}
                    </span>
                    <FormSquares form={row.form} />
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/leaderboard"
              className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-jade-soft"
            >
              ← Back to Leaderboard
            </Link>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className="inline-flex h-9 items-center border-[2px] border-jade-ink bg-card px-3 hover:bg-jade-soft"
                  >
                    ← Prev
                  </Link>
                ) : null}
                <span className="px-2 text-muted-foreground">
                  Page {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={pageHref(page + 1)}
                    className="inline-flex h-9 items-center border-[2px] border-jade-ink bg-card px-3 hover:bg-jade-soft"
                  >
                    Next →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}
    </main>
  )
}
