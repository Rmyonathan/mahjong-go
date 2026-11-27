import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ChevronRight } from "lucide-react"

import { BoardFilters } from "@/components/jade/board-filters"
import { FormSquares } from "@/components/jade/form-squares"
import { ArchiveUpgradeTeaser } from "@/components/leaderboard/archive-upgrade-teaser"
import { LeaderboardTvCast } from "@/components/leaderboard/tv-cast"
import { PlayerAvatar } from "@/components/players/player-avatar"
import { getSessionUser } from "@/lib/auth"
import {
  getActiveSeason,
  getDbBoardStandings,
  getPlayersByIds,
  getRecentSessions,
  getSeasonKpi,
  getWinMethodsSeason,
} from "@/lib/data/board"
import { prisma } from "@/lib/db"
import {
  FREE_SESSION_ARCHIVE_LIMIT,
  isProMembership,
} from "@/lib/membership"
import { countFinishedSessions } from "@/lib/session/service"
import {
  formatPlainPoints,
  formatSignedPoints,
  winRateLabel,
  type BoardStandingRow,
  type BoardTier,
} from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Leaderboard — Jade Mahjong",
  description:
    "Every scored hand in Nov–Dec 2026 at the Jade Mahjong tables, tallied to zero.",
}

interface LeaderboardPageProps {
  searchParams: Promise<{
    q?: string | string[]
    board?: string | string[]
    tv?: string | string[]
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

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const params = await searchParams
  const query = readParam(params.q)
  const tvMode = readParam(params.tv) === "1"
  const finishedCount = await countFinishedSessions()
  const usingLiveStats = finishedCount > 0
  const board = readBoard(readParam(params.board), usingLiveStats)

  const [
    season,
    seasonKpi,
    winMethods,
    standings,
    recentSessions,
    session,
  ] = await Promise.all([
    getActiveSeason(),
    getSeasonKpi(),
    getWinMethodsSeason(),
    getDbBoardStandings(tvMode ? "all" : board),
    getRecentSessions(),
    getSessionUser(),
  ])

  const viewerUser =
    session != null
      ? await prisma.user.findUnique({
          where: { id: session.id },
          select: {
            name: true,
            role: true,
            membershipTier: true,
            proExpiresAt: true,
          },
        })
      : null
  const canViewProfiles = Boolean(session)
  const viewerIsPro = viewerUser ? isProMembership(viewerUser) : false
  const visibleSessions = viewerIsPro
    ? recentSessions
    : recentSessions.slice(0, FREE_SESSION_ARCHIVE_LIMIT)
  // Guests browse the board only — no Pro upsell / archive gate noise
  const archiveLocked =
    canViewProfiles &&
    !viewerIsPro &&
    recentSessions.length > FREE_SESSION_ARCHIVE_LIMIT

  if (tvMode && season) {
    return (
      <LeaderboardTvCast
        seasonLabel={season.label}
        standings={standings}
        usingLiveStats={usingLiveStats}
      />
    )
  }

  if (!season || !seasonKpi) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        <h1 className="font-serif text-5xl">Leaderboard</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          No active season in Postgres yet. Run `npm run db:seed`.
        </p>
      </main>
    )
  }

  const boardRows = standings.filter((row) => {
    if (!query) return true
    const hay = [
      row.player.name,
      row.player.nickname,
      row.player.district,
      row.skillTier.name,
    ]
      .join(" ")
      .toLowerCase()
    return hay.includes(query.toLowerCase())
  })

  // Live search: also match club Players who sat finished tables but aren't on
  // the current board filter — pull their standing from the "all" board.
  let searchExtra: BoardStandingRow[] = []
  if (query && usingLiveStats && board !== "all" && boardRows.length === 0) {
    const allRows = await getDbBoardStandings("all")
    searchExtra = allRows.filter((row) => {
      const hay = [row.player.name, row.player.nickname, row.player.district]
        .join(" ")
        .toLowerCase()
      return hay.includes(query.toLowerCase())
    })
  }
  const displayRows = boardRows.length > 0 ? boardRows : searchExtra
  const topRankRows = query ? displayRows : displayRows.slice(0, 10)
  const topRecentSessions = visibleSessions.slice(0, 3)

  const allRankParams = new URLSearchParams()
  if (query) allRankParams.set("q", query)
  const rawBoardParam = readParam(params.board)
  if (rawBoardParam) allRankParams.set("board", rawBoardParam)
  const allRanksHref = allRankParams.toString()
    ? `/leaderboard/all?${allRankParams.toString()}`
    : "/leaderboard/all"

  const playerMap = await getPlayersByIds([
    seasonKpi.biggestHand.playerId,
    seasonKpi.hotStreak.playerId,
    ...recentSessions.map((session) => session.winnerId),
  ])

  const leader = displayRows[0]
  const second = displayRows[1]
  const third = displayRows[2]
  const biggest = playerMap.get(seasonKpi.biggestHand.playerId)
  const hot = playerMap.get(seasonKpi.hotStreak.playerId)
  const winTotal = winMethods.selfDraw + winMethods.discard

  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 top-0 hidden select-none font-serif text-[12rem] leading-none text-jade-ink/[0.06] sm:block sm:text-[16rem]"
      >
        玉
      </span>

      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Vol. 01 · {season.rangeLabel}
        </p>
        <h1 className="mt-2 font-serif text-4xl uppercase leading-[0.92] tracking-tight sm:mt-3 sm:text-7xl">
          Leaderboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-4">
          Every scored hand in {season.rangeLabel} at the Jade Mahjong tables,
          tallied to zero. {season.sessionsPlayed} sessions,{" "}
          {season.gamesPlayed} games, {season.hoursAtTable}h at the table.
        </p>

        {!canViewProfiles ? (
          <p className="mt-5 max-w-xl rounded-2xl border border-[#102A20]/10 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
            Guest view — names aren&apos;t links yet.{" "}
            <Link
              href="/login"
              className="font-semibold text-jade-accent underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            to open player profiles and book seats.
          </p>
        ) : null}

        <div className="mt-8">
          <Suspense
            fallback={
              <div className="h-10 rounded-full border border-[#102A20]/10 bg-white" aria-hidden />
            }
          >
            <BoardFilters seasonLabel={season.label} />
          </Suspense>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3 lg:grid-cols-3">
        <KpiCard letter="A" label="Sessions played" value={String(seasonKpi.sessionsPlayed)} />
        <KpiCard letter="B" label="Games played" value={String(seasonKpi.gamesPlayed)} />
        <KpiCard
          letter="C"
          label="At the table"
          value={`${seasonKpi.hoursAtTable} HRS`}
        />
        <KpiCard
          letter="D"
          label="Biggest hand"
          value={formatPlainPoints(seasonKpi.biggestHand.points)}
          valueClassName="text-jade-gold"
          subtitle={`${biggest?.name ?? "—"} · ${seasonKpi.biggestHand.combo}`}
        />
        <KpiCard
          letter="E"
          label="Top combo"
          value={seasonKpi.topCombo.name}
          valueClassName="text-jade-accent"
          subtitle={`${seasonKpi.topCombo.count} times this season`}
        />
        <KpiCard
          letter="F"
          label="Hot streak"
          value={`${seasonKpi.hotStreak.streak}`}
          valueClassName="text-jade-red"
          subtitle={`${hot?.name ?? "—"} in a row`}
        />
      </dl>

      <section className="mt-8 sm:mt-10" aria-label="On top">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
          <h2 className="font-serif text-2xl uppercase sm:text-3xl">On top</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Board · {board}
          </p>
        </div>
        {!leader ? (
          <div className="jade-card px-4 py-8">
            <p className="font-serif text-2xl">No players on this board yet.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <article className="jade-card-accent relative overflow-hidden p-4 sm:p-5">
              <span className="absolute right-3 top-3 border border-jade-accent bg-jade-accent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-parchment sm:right-4 sm:top-4">
                Leader
              </span>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="shrink-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Rank
                  </p>
                  <p className="font-mono text-3xl text-jade-gold sm:text-4xl">1</p>
                </div>
                <PlayerAvatar
                  initials={leader.player.initials}
                  name={leader.player.name}
                  avatarUrl={leader.player.avatarUrl}
                  frameId={leader.player.frameId}
                  size="md"
                />
                <div className="min-w-0 flex-1 pr-14 sm:pr-16">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-2xl leading-none sm:text-4xl">
                      <PlayerName
                        playerId={leader.playerId}
                        name={leader.player.name}
                        canViewProfiles={canViewProfiles}
                        className="hover:underline"
                      />
                    </h3>
                    {leader.isPro ? <ProBadge /> : null}
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:mt-2">
                    {leader.player.nickname} · {leader.skillTier.name}
                  </p>
                  <p className="mt-3 font-mono text-3xl text-jade-accent sm:mt-4 sm:text-5xl">
                    {formatSignedPoints(leader.points)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 border-t border-jade-accent/40 pt-3 sm:mt-6 sm:border-t-[2px] sm:pt-4">
                <StatCell label="Win rate" value={winRateLabel(leader.winRate)} />
                <StatCell
                  label="Biggest"
                  value={formatPlainPoints(leader.biggestHand)}
                  className="border-x border-jade-accent/40 px-2 sm:px-3"
                />
                <StatCell
                  label="Per session"
                  value={formatPlainPoints(
                    Math.round(leader.points / Math.max(season.sessionsPlayed, 1)),
                  )}
                  className="pl-2 sm:pl-3"
                />
              </div>
            </article>

            <div className="flex flex-col gap-4">
              {second ? (
                <PodiumSide
                  row={second}
                  place={2}
                  canViewProfiles={canViewProfiles}
                />
              ) : null}
              {third ? (
                <PodiumSide
                  row={third}
                  place={3}
                  canViewProfiles={canViewProfiles}
                />
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 scroll-mt-24 sm:mt-10" aria-label="Jade rank">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 sm:mb-4">
          <h2 className="font-serif text-2xl uppercase sm:text-3xl">Jade rank</h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#102A20]/15 bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
          >
            <span className="size-1.5 rounded-full bg-jade-accent" aria-hidden />
            Follow live
          </button>
        </div>

        {displayRows.length === 0 ? (
          <div className="jade-card px-4 py-8">
            <p className="font-serif text-2xl">No matching players.</p>
          </div>
        ) : (
          <>
            <div className="jade-card hidden overflow-x-auto md:block">
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
                  {topRankRows.map((row) => (
                    <tr
                      key={row.playerId}
                      className={cn(
                        "border-b border-jade-ink/25 last:border-b-0",
                        row.isPro && "bg-gradient-to-r from-jade-gold/25 via-transparent to-jade-accent/10",
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
                              "border-[2px] border-jade-gold shadow-[3px_3px_0_0_var(--jade-accent)] px-2 py-1",
                          )}
                        >
                          <PlayerAvatar
                            initials={row.player.initials}
                            name={row.player.name}
                            avatarUrl={row.player.avatarUrl}
                            frameId={row.player.frameId}
                            size="xs"
                          />
                          <PlayerName
                            playerId={row.playerId}
                            name={row.player.name}
                            canViewProfiles={canViewProfiles}
                            className="font-serif text-lg leading-none hover:underline"
                          />
                          {row.isPro ? <ProBadge /> : null}
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

            <ol className="flex flex-col gap-2 md:hidden">
              {topRankRows.map((row) => (
                <li
                  key={row.playerId}
                  className={cn(
                    "jade-card px-3 py-2.5",
                    row.isPro &&
                      "border-jade-gold shadow-[4px_4px_0_0_var(--jade-accent)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className="w-7 shrink-0 font-mono text-[11px] text-muted-foreground">
                        #{String(row.rank).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PlayerAvatar
                            initials={row.player.initials}
                            name={row.player.name}
                            avatarUrl={row.player.avatarUrl}
                            frameId={row.player.frameId}
                            size="xs"
                          />
                          <PlayerName
                            playerId={row.playerId}
                            name={row.player.name}
                            canViewProfiles={canViewProfiles}
                            className="truncate font-serif text-base leading-none hover:underline"
                          />
                          {row.isPro ? <ProBadge /> : null}
                        </div>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                          {winRateLabel(row.winRate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className="font-mono text-sm">
                        {formatSignedPoints(row.points)}
                      </p>
                      <FormSquares form={row.form} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {!query && displayRows.length > 10 ? (
              <div className="mt-4">
                <Link
                  href={allRanksHref}
                  className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-jade-soft"
                >
                  See all ({displayRows.length}) →
                </Link>
              </div>
            ) : null}
          </>
        )}
      </section>

      <div className="mt-8 grid gap-8 sm:mt-10 lg:grid-cols-2 lg:gap-6">
        <section aria-label="Recent sessions">
          <h2 className="font-serif text-2xl uppercase sm:text-3xl">
            Recent sessions
          </h2>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:mt-2">
            {!canViewProfiles
              ? "Guest · preview only"
              : viewerIsPro
                ? "Pro archive · full history"
                : `Free · last ${FREE_SESSION_ARCHIVE_LIMIT} sessions`}
          </p>
          <div className="jade-divider mt-3" />
          <ol className="mt-3 flex flex-col gap-2.5 sm:mt-4 sm:gap-3">
            {visibleSessions.length === 0 ? (
              <li className="jade-card px-4 py-8 text-center text-sm text-muted-foreground">
                No finished tables yet — end a live session to appear here.
              </li>
            ) : null}
            {topRecentSessions.map((entry) => {
              const winner = playerMap.get(entry.winnerId)
              const body = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-jade-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-jade-accent">
                        {entry.games} games
                      </span>
                      <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {entry.venueName}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate font-serif text-lg leading-tight sm:text-xl">
                      {entry.title}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                      Win · {winner?.nickname ?? "—"}
                    </p>
                  </div>
                  {canViewProfiles ? (
                    <ChevronRight className="size-4 shrink-0 text-jade-ink/40" />
                  ) : null}
                </>
              )
              return (
                <li key={entry.id}>
                  {canViewProfiles ? (
                    <Link
                      href={`/session/${entry.id}`}
                      className="jade-card flex items-center gap-3 px-3.5 py-3 transition active:scale-[0.99] sm:px-4"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="jade-card flex items-center gap-3 px-3.5 py-3 sm:px-4">
                      {body}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {visibleSessions.length > 3 ? (
            <div className="mt-4">
              <Link
                href="/leaderboard/sessions"
                className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-jade-soft"
              >
                See all ({visibleSessions.length}) →
              </Link>
            </div>
          ) : null}
          {archiveLocked ? (
            <ArchiveUpgradeTeaser accountName={viewerUser?.name} />
          ) : null}
        </section>

        <section aria-label="Win methods">
          <h2 className="font-serif text-2xl uppercase sm:text-3xl">
            Win methods
          </h2>
          <div className="jade-divider mt-3" />
          <div className="jade-card mt-3 space-y-4 p-3.5 sm:mt-4 sm:space-y-5 sm:p-4">
            <WinBar
              label="Self-draw"
              value={winMethods.selfDraw}
              total={winTotal}
              tone="accent"
            />
            <WinBar
              label="Discard"
              value={winMethods.discard}
              total={winTotal}
              tone="ink"
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function KpiCard({
  letter,
  label,
  value,
  subtitle,
  valueClassName,
}: {
  letter: string
  label: string
  value: string
  subtitle?: string
  valueClassName?: string
}) {
  return (
    <div className="jade-card relative px-3 py-3 sm:px-4 sm:py-4">
      <span className="absolute right-2.5 top-2 font-mono text-[10px] text-muted-foreground sm:right-3">
        {letter}
      </span>
      <dt className="pr-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("mt-2 font-mono text-xl sm:mt-3 sm:text-3xl", valueClassName)}>
        {value}
      </dd>
      {subtitle ? (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:mt-2 sm:text-xs">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

function StatCell({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  )
}

function ProBadge() {
  return (
    <span className="inline-flex border-[2px] border-jade-gold bg-jade-accent px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-parchment">
      Pro
    </span>
  )
}

function PlayerName({
  playerId,
  name,
  canViewProfiles,
  className,
}: {
  playerId: string
  name: string
  canViewProfiles: boolean
  className?: string
}) {
  if (!canViewProfiles) {
    return <span className={className}>{name}</span>
  }
  return (
    <Link href={`/players/${playerId}`} className={className}>
      {name}
    </Link>
  )
}

function PodiumSide({
  row,
  place,
  canViewProfiles,
}: {
  row: BoardStandingRow
  place: 2 | 3
  canViewProfiles: boolean
}) {
  const className = cn(
    "jade-card flex items-center gap-2.5 p-3 sm:gap-3 sm:p-4",
    canViewProfiles && "transition active:scale-[0.99]",
    row.isPro && "border-jade-gold shadow-[4px_4px_0_0_var(--jade-accent)]",
  )
  const content = (
    <>
      <p className="w-5 shrink-0 font-mono text-2xl text-muted-foreground sm:text-3xl">
        {place}
      </p>
      <PlayerAvatar
        initials={row.player.initials}
        name={row.player.name}
        avatarUrl={row.player.avatarUrl}
        frameId={row.player.frameId}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate font-serif text-lg leading-none sm:text-xl">
            {row.player.name}
          </p>
          {row.isPro ? <ProBadge /> : null}
          {canViewProfiles ? (
            <ChevronRight
              className="size-4 shrink-0 text-jade-accent"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:mt-2">
          {winRateLabel(row.winRate)} · {row.skillTier.name}
        </p>
      </div>
      <p className="shrink-0 font-mono text-sm">
        {formatSignedPoints(row.points)}
      </p>
    </>
  )
  if (!canViewProfiles) {
    return <div className={className}>{content}</div>
  }
  return (
    <Link href={`/players/${row.playerId}`} className={className}>
      {content}
    </Link>
  )
}

function WinBar({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone: "accent" | "ink"
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em]">
        <span>{label}</span>
        <span>
          {value} · {pct}%
        </span>
      </div>
      <div className="h-3 border-[2px] border-jade-ink bg-parchment">
        <div
          className={cn(
            "h-full",
            tone === "accent" ? "bg-jade-accent" : "bg-jade-ink",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
