import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ChevronRight } from "lucide-react"

import { BoardFilters } from "@/components/jade/board-filters"
import { FormSquares } from "@/components/jade/form-squares"
import { ArchiveUpgradeTeaser } from "@/components/leaderboard/archive-upgrade-teaser"
import { LeaderboardTvCast } from "@/components/leaderboard/tv-cast"
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

function readBoard(value: string): BoardTier | "all" {
  if (value === "beginner" || value === "advanced" || value === "mcr") return value
  return "advanced"
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const params = await searchParams
  const query = readParam(params.q)
  const board = readBoard(readParam(params.board))
  const tvMode = readParam(params.tv) === "1"

  const [
    season,
    seasonKpi,
    winMethods,
    standings,
    recentSessions,
    finishedCount,
    session,
  ] = await Promise.all([
    getActiveSeason(),
    getSeasonKpi(),
    getWinMethodsSeason(),
    getDbBoardStandings(tvMode ? "all" : board),
    getRecentSessions(),
    countFinishedSessions(),
    getSessionUser(),
  ])
  const usingLiveStats = finishedCount > 0

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

  const playerMap = await getPlayersByIds([
    seasonKpi.biggestHand.playerId,
    seasonKpi.hotStreak.playerId,
    ...recentSessions.map((session) => session.winnerId),
  ])

  const leader = boardRows[0]
  const second = boardRows[1]
  const third = boardRows[2]
  const biggest = playerMap.get(seasonKpi.biggestHand.playerId)
  const hot = playerMap.get(seasonKpi.hotStreak.playerId)
  const winTotal = winMethods.selfDraw + winMethods.discard

  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 top-0 select-none font-serif text-[12rem] leading-none text-jade-ink/[0.06] sm:text-[16rem]"
      >
        玉
      </span>

      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Vol. 01 · {season.rangeLabel}
        </p>
        <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl">
          Leaderboard
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every scored hand in {season.rangeLabel} at the Jade Mahjong tables,
          tallied to zero. {season.sessionsPlayed} sessions,{" "}
          {season.gamesPlayed} games, {season.hoursAtTable}h at the table.
        </p>

        {!canViewProfiles ? (
          <p className="mt-5 max-w-xl rounded-2xl border border-[#102A20]/10 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
            Browsing as guest — standings only.{" "}
            <Link
              href="/login"
              className="font-semibold text-jade-accent underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            to open player profiles, schedule, ranks, combos, and club pages.
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

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
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

      <section className="mt-10" aria-label="On top">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-serif text-3xl uppercase">On top</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Board · {board}
          </p>
        </div>
        {!leader ? (
          <div className="jade-card px-4 py-8">
            <p className="font-serif text-2xl">No players on this board yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <article className="jade-card-accent relative overflow-hidden p-5">
              <span className="absolute right-4 top-4 border border-jade-accent bg-jade-accent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-parchment">
                Leader
              </span>
              <div className="flex items-start gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Rank
                  </p>
                  <p className="font-mono text-4xl text-jade-gold">1</p>
                </div>
                <LevelBadge label={leader.experienceLevel.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-3xl leading-none sm:text-4xl">
                      <PlayerName
                        playerId={leader.playerId}
                        name={leader.player.name}
                        canViewProfiles={canViewProfiles}
                        className="hover:underline"
                      />
                    </h3>
                    {leader.isPro ? <ProBadge /> : null}
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {leader.player.nickname} · {leader.skillTier.name}
                  </p>
                  <p className="mt-4 font-mono text-4xl text-jade-accent sm:text-5xl">
                    {formatSignedPoints(leader.points)}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 border-t-[2px] border-jade-accent/40 pt-4">
                <StatCell label="Win rate" value={winRateLabel(leader.winRate)} />
                <StatCell
                  label="Biggest"
                  value={formatPlainPoints(leader.biggestHand)}
                  className="border-x border-jade-accent/40 px-3"
                />
                <StatCell
                  label="Per session"
                  value={formatPlainPoints(
                    Math.round(leader.points / Math.max(season.sessionsPlayed, 1)),
                  )}
                  className="pl-3"
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

      <section className="mt-10" aria-label="Jade rank">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-3xl uppercase">Jade rank</h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border-[2px] border-jade-ink bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
          >
            <span className="size-1.5 rounded-full bg-jade-accent" aria-hidden />
            Follow live
          </button>
        </div>

        {boardRows.length === 0 ? (
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
                  {boardRows.map((row) => (
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

            <ol className="flex flex-col gap-3 md:hidden">
              {boardRows.map((row) => (
                <li
                  key={row.playerId}
                  className={cn(
                    "jade-card px-3 py-3",
                    row.isPro &&
                      "border-jade-gold shadow-[4px_4px_0_0_var(--jade-accent)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        #{String(row.rank).padStart(2, "0")}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <PlayerName
                          playerId={row.playerId}
                          name={row.player.name}
                          canViewProfiles={canViewProfiles}
                          className="font-serif text-xl leading-none hover:underline"
                        />
                        {row.isPro ? <ProBadge /> : null}
                      </div>
                    </div>
                    <p className="font-mono text-sm">{formatSignedPoints(row.points)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-jade-ink/25 pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                      {winRateLabel(row.winRate)}
                    </span>
                    <FormSquares form={row.form} />
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section aria-label="Recent sessions">
          <h2 className="font-serif text-3xl uppercase">Recent sessions</h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {!canViewProfiles
              ? "Guest · preview only"
              : viewerIsPro
                ? "Pro archive · full history"
                : `Free · last ${FREE_SESSION_ARCHIVE_LIMIT} sessions`}
          </p>
          <div className="jade-divider mt-3" />
          <ol className="mt-4 flex flex-col gap-3">
            {visibleSessions.map((entry) => {
              const winner = playerMap.get(entry.winnerId)
              const body = (
                <>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      #{entry.id} · {entry.venueName} · {entry.games} games
                    </p>
                    <p className="mt-1 font-serif text-xl leading-none">
                      {entry.title}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                      Win · {winner?.nickname ?? "—"}
                    </p>
                  </div>
                  {canViewProfiles ? (
                    <ChevronRight className="size-4 shrink-0" />
                  ) : null}
                </>
              )
              return (
                <li key={entry.id}>
                  {canViewProfiles ? (
                    <Link
                      href={`/session/${entry.id}`}
                      className="jade-card flex items-center justify-between gap-3 px-4 py-3 transition hover:translate-x-px hover:translate-y-px hover:shadow-none"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="jade-card flex items-center justify-between gap-3 px-4 py-3">
                      {body}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {archiveLocked ? (
            <ArchiveUpgradeTeaser accountName={viewerUser?.name} />
          ) : null}
        </section>

        <section aria-label="Win methods">
          <h2 className="font-serif text-3xl uppercase">Win methods</h2>
          <div className="jade-divider mt-3" />
          <div className="jade-card mt-4 space-y-5 p-4">
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
    <div className="jade-card relative px-4 py-4">
      <span className="absolute right-3 top-2 font-mono text-[10px] text-muted-foreground">
        {letter}
      </span>
      <dt className="pr-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("mt-3 font-mono text-2xl sm:text-3xl", valueClassName)}>{value}</dd>
      {subtitle ? <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p> : null}
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

function LevelBadge({ label }: { label: string }) {
  return (
    <div
      className="grid size-12 shrink-0 place-items-center border-[2px] border-jade-ink bg-parchment font-mono text-[10px] uppercase tracking-[0.08em] shadow-[3px_3px_0_0_var(--jade-ink)]"
      title={label}
    >
      {label.slice(0, 3)}
    </div>
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
    "jade-card flex items-center gap-3 p-4",
    canViewProfiles &&
      "transition hover:translate-x-px hover:translate-y-px hover:shadow-none",
    row.isPro && "border-jade-gold shadow-[4px_4px_0_0_var(--jade-accent)]",
  )
  const content = (
    <>
      <p className="font-mono text-3xl text-muted-foreground">{place}</p>
      <LevelBadge label={row.experienceLevel.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate font-serif text-xl leading-none">
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
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {winRateLabel(row.winRate)} · {row.skillTier.name}
        </p>
      </div>
      <p className="font-mono text-sm">{formatSignedPoints(row.points)}</p>
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
