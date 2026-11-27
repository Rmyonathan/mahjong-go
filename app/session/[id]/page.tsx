import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormSquares } from "@/components/jade/form-squares"
import { GameLog } from "@/components/jade/game-log"
import { ScoreRaceChart } from "@/components/jade/score-race-chart"
import { SessionActions } from "@/components/jade/session-actions"
import { PlayerAvatar } from "@/components/players/player-avatar"
import { FinishedSessionNewspaper } from "@/components/share/finished-session-share"
import {
  getActiveSeason,
  getDbSessionDetail,
  getPlayersByIds,
  getRecentSessions,
} from "@/lib/data/board"
import {
  formatPlainPoints,
  formatSignedPoints,
  type SessionDetail,
} from "@/lib/mock/jade-board"
import type { JadePlayer } from "@/lib/mock/jade-data"
import { sessionDetailToLiveShare } from "@/lib/share/from-session-detail"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

interface SessionPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: SessionPageProps): Promise<Metadata> {
  const { id } = await params
  const session = await getDbSessionDetail(id)
  if (session) {
    return {
      title: `${session.title} — Jade Mahjong`,
      description: `Session ${id} at Jade Mahjong.`,
    }
  }
  const recent = (await getRecentSessions()).find((entry) => entry.id === id)
  return {
    title: `${recent?.title ?? `Session ${id}`} — Jade Mahjong`,
    description: `Session ${id} at Jade Mahjong.`,
  }
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params
  const [session, recentSessions, season] = await Promise.all([
    getDbSessionDetail(id),
    getRecentSessions(),
    getActiveSeason(),
  ])
  const recent = recentSessions.find((entry) => entry.id === id)

  if (!session && !recent) notFound()

  if (!session || session.hands.length === 0) {
    const card = session
      ? {
          id: session.id,
          title: session.title,
          venueName: session.venueName,
        }
      : recent!
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/leaderboard"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          ← Leaderboard
        </Link>
        <h1 className="mt-3 font-serif text-3xl sm:mt-4 sm:text-5xl">
          {card.title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Session #{card.id} at {card.venueName} is on the board, but the full
          hand ledger is not filed yet. Open a session with a complete score race
          from the leaderboard.
        </p>
      </main>
    )
  }

  const playerIds = [
    ...session.playerIds,
    session.highlights.biggestHand.playerId,
    session.highlights.biggestPayout.playerId,
    session.highlights.mostWins.playerId,
    session.highlights.longestDeal.playerId,
    session.highlights.mostDealtIn.playerId,
    ...session.hands.flatMap((hand) => [
      hand.winnerId,
      ...(hand.dealtById ? [hand.dealtById] : []),
      ...Object.keys(hand.deltas),
    ]),
  ]
  const players = await getPlayersByIds(playerIds)

  return (
    <SessionDetailView
      session={session}
      seasonLabel={season?.label ?? "Season"}
      players={players}
    />
  )
}

function SessionDetailView({
  session,
  seasonLabel,
  players,
}: {
  session: SessionDetail
  seasonLabel: string
  players: Map<string, JadePlayer>
}) {
  const playerOf = (id: string) =>
    players.get(id) ?? {
      id,
      name: id,
      nickname: id,
      initials: "??",
      city: "",
      district: "",
      house: "",
      experienceLevelId: "pemula" as const,
      memberSince: "",
    }

  const liveShare = sessionDetailToLiveShare(session, players)

  const started = new Date(session.startedAt)
  const ended = new Date(session.endedAt)
  const whenLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Jakarta",
  }).format(started)
  const endTime = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Jakarta",
  }).format(ended)
  const durationLabel =
    session.durationMinutes >= 60
      ? `${Math.floor(session.durationMinutes / 60)}h ${session.durationMinutes % 60}m`
      : `${session.durationMinutes}m`
  const winTotal = session.winMethods.selfDraw + session.winMethods.discard

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/leaderboard"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            ← Leaderboard
          </Link>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Pill>{seasonLabel}</Pill>
            <Pill className="shrink-0 whitespace-nowrap">
              {whenLabel} – {endTime}
            </Pill>
            <Pill className="shrink-0 whitespace-nowrap">
              {session.seats}-seat
            </Pill>
            <Pill className="shrink-0 border-jade-accent text-jade-accent">
              <span className="mr-1.5 inline-block size-1.5 rounded-full bg-jade-accent" />
              Finished
            </Pill>
          </div>
          <h1 className="mt-3 font-serif text-3xl leading-[1.05] sm:mt-4 sm:text-5xl">
            {session.title}
          </h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            #{session.id} · {session.venueName}
            {session.district ? `, ${session.district}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <SessionActions title={session.title} />
          <FinishedSessionNewspaper session={liveShare} />
        </div>
      </div>

      {/* Summary strip — scrolls on narrow phones */}
      <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:mt-6 sm:overflow-visible sm:px-0">
        <div className="jade-card grid min-w-[22rem] grid-cols-5 overflow-hidden sm:min-w-0 sm:grid-cols-5">
          <SummaryCell label="Games" value={String(session.games)} />
          <SummaryCell label="Hands" value={String(session.handsWon)} />
          <SummaryCell label="Draws" value={String(session.draws)} />
          <SummaryCell
            label="Biggest"
            value={formatPlainPoints(session.biggestHand)}
            emphasize="gold"
          />
          <SummaryCell label="Time" value={durationLabel} />
        </div>
      </div>

      <section className="mt-7 sm:mt-8" aria-label="Final standings">
        <h2 className="font-serif text-2xl uppercase sm:text-3xl">
          Final standings
        </h2>
        <div className="jade-divider mt-2 sm:mt-3" />
        <div className="mt-3 grid gap-2.5 sm:mt-4 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
          {session.standings.map((standing) => {
            const player = playerOf(standing.playerId)
            const first = standing.rank === 1
            return (
              <article
                key={standing.playerId}
                className={cn(
                  "relative overflow-hidden p-3.5 sm:p-4",
                  first ? "jade-card-gold" : "jade-card",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full font-mono text-[10px] uppercase tracking-[0.08em]",
                      first
                        ? "bg-jade-gold text-jade-ink"
                        : "bg-jade-ink text-parchment",
                    )}
                  >
                    {standing.rank === 1
                      ? "1st"
                      : standing.rank === 2
                        ? "2nd"
                        : standing.rank === 3
                          ? "3rd"
                          : "4th"}
                  </span>
                  <PlayerAvatar
                    initials={player.initials}
                    name={player.name}
                    avatarUrl={player.avatarUrl}
                    frameId={player.frameId}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-lg leading-none sm:text-xl">
                      {player.name}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {player.nickname}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 font-mono text-lg sm:text-xl",
                      standing.net > 0 && "text-jade-accent",
                      standing.net < 0 && "text-jade-red",
                    )}
                  >
                    {formatSignedPoints(standing.net)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-jade-ink/15 pt-3">
                  <FormSquares form={standing.form} />
                  <div className="flex gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <span>
                      W <strong className="text-jade-ink">{standing.wins}</strong>
                    </span>
                    <span>
                      SD{" "}
                      <strong className="text-jade-ink">
                        {standing.selfDraw}
                      </strong>
                    </span>
                    <span>
                      DI{" "}
                      <strong className="text-jade-ink">
                        {standing.dealtIn}
                      </strong>
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="mt-7 sm:mt-8">
        <ScoreRaceChart playerIds={[...session.playerIds]} race={session.race} />
      </div>

      <div className="mt-7 grid items-start gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <GameLog session={session} liveShare={liveShare} />

        <aside className="flex flex-col gap-3 sm:gap-4" aria-label="Highlights">
          <div className="jade-card p-3.5 sm:p-4">
            <h2 className="font-serif text-xl sm:text-2xl">Session</h2>
            <ul className="mt-3 space-y-3 border-t border-jade-ink/15 pt-3">
              <HighlightRow
                label="Biggest hand"
                value={`${playerOf(session.highlights.biggestHand.playerId).nickname} · ${formatPlainPoints(session.highlights.biggestHand.points)}`}
                note={session.highlights.biggestHand.combo}
              />
              <HighlightRow
                label="Biggest payout"
                value={`${playerOf(session.highlights.biggestPayout.playerId).nickname} · −${formatPlainPoints(session.highlights.biggestPayout.points)}`}
              />
              <HighlightRow
                label="Most wins"
                value={`${playerOf(session.highlights.mostWins.playerId).nickname} · ${session.highlights.mostWins.wins}`}
              />
              <HighlightRow
                label="Longest deal"
                value={`${playerOf(session.highlights.longestDeal.playerId).nickname} · ${session.highlights.longestDeal.hands} hands`}
              />
              <HighlightRow
                label="Most dealt in"
                value={`${playerOf(session.highlights.mostDealtIn.playerId).nickname} · ${session.highlights.mostDealtIn.count}`}
              />
            </ul>
          </div>

          <div className="jade-card p-3.5 sm:p-4">
            <h2 className="font-serif text-xl sm:text-2xl">Win methods</h2>
            <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
              <MiniBar
                label="Self-draw"
                value={session.winMethods.selfDraw}
                total={winTotal}
                className="bg-jade-accent"
              />
              <MiniBar
                label="Discard"
                value={session.winMethods.discard}
                total={winTotal}
                className="bg-jade-ink"
              />
            </div>
          </div>

          <div className="jade-card p-3.5 sm:p-4">
            <h2 className="font-serif text-xl sm:text-2xl">Most claimed combos</h2>
            <ul className="mt-3 space-y-2 border-t border-jade-ink/15 pt-3">
              {session.claimedCombos.map((combo) => (
                <li
                  key={combo.label}
                  className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-[0.12em]"
                >
                  <span className="truncate">{combo.label}</span>
                  <span className="text-jade-accent">{combo.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#102A20]/12 bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
        className,
      )}
    >
      {children}
    </span>
  )
}

function SummaryCell({
  label,
  value,
  emphasize,
  className,
}: {
  label: string
  value: string
  emphasize?: "gold"
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-r border-jade-ink/10 px-2.5 py-2.5 last:border-r-0 sm:px-3 sm:py-3",
        className,
      )}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground sm:text-[10px]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono text-sm sm:mt-1 sm:text-lg",
          emphasize === "gold" && "text-jade-gold",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function HighlightRow({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <li>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm leading-snug">{value}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </li>
  )
}

function MiniBar({
  label,
  value,
  total,
  className,
}: {
  label: string
  value: number
  total: number
  className?: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
        <span>{label}</span>
        <span>
          {value} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F6F4EE]">
        <div className={cn("h-full rounded-full", className)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
