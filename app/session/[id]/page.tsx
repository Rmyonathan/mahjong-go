import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormSquares } from "@/components/jade/form-squares"
import { GameLog } from "@/components/jade/game-log"
import { ScoreRaceChart } from "@/components/jade/score-race-chart"
import { SessionActions } from "@/components/jade/session-actions"
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/leaderboard"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          ← Leaderboard
        </Link>
        <h1 className="mt-4 font-serif text-5xl">{card.title}</h1>
        <p className="mt-3 max-w-xl text-sm">
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
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/leaderboard"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            ← Leaderboard
          </Link>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>{seasonLabel}</Pill>
            <Pill>
              {whenLabel} – {endTime}
            </Pill>
            <Pill>{session.seats}-seat table</Pill>
            <Pill className="border-jade-accent text-jade-accent">
              <span className="mr-1.5 inline-block size-1.5 rounded-full bg-jade-accent" />
              Finished
            </Pill>
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-none sm:text-5xl">
            {session.title}
          </h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            #{session.id} · {session.venueName}, {session.district}
          </p>
        </div>
        <SessionActions title={session.title} />
      </div>

      <div className="jade-card mt-6 grid grid-cols-2 overflow-hidden sm:grid-cols-5">
        <SummaryCell label="Games" value={String(session.games)} />
        <SummaryCell label="Hands won" value={String(session.handsWon)} />
        <SummaryCell label="Draws" value={String(session.draws)} />
        <SummaryCell
          label="Biggest hand"
          value={formatPlainPoints(session.biggestHand)}
          emphasize="gold"
        />
        <SummaryCell label="Duration" value={durationLabel} className="col-span-2 sm:col-span-1" />
      </div>

      <section className="mt-8" aria-label="Final standings">
        <h2 className="font-serif text-3xl uppercase">Final standings</h2>
        <div className="jade-divider mt-3" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {session.standings.map((standing) => {
            const player = playerOf(standing.playerId)
            const first = standing.rank === 1
            return (
              <article
                key={standing.playerId}
                className={cn(
                  "relative overflow-hidden p-4",
                  first ? "jade-card-gold" : "jade-card",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
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
                <div className="mt-6 flex items-center gap-3">
                  <div className="grid size-11 place-items-center border-[2px] border-jade-ink bg-parchment font-mono text-xs shadow-[3px_3px_0_0_var(--jade-ink)]">
                    {player.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-serif text-xl leading-none">{player.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {player.nickname}
                    </p>
                  </div>
                </div>
                <p
                  className={cn(
                    "mt-4 font-mono text-3xl",
                    standing.net > 0 && "text-jade-accent",
                    standing.net < 0 && "text-jade-red",
                  )}
                >
                  {formatSignedPoints(standing.net)}
                </p>
                <FormSquares form={standing.form} className="mt-3" />
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-jade-ink/25 pt-3 font-mono text-[10px] uppercase tracking-[0.12em]">
                  <div>
                    <p className="text-muted-foreground">Wins</p>
                    <p className="mt-0.5 text-sm">{standing.wins}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Self-draw</p>
                    <p className="mt-0.5 text-sm">{standing.selfDraw}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dealt in</p>
                    <p className="mt-0.5 text-sm">{standing.dealtIn}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="mt-8">
        <ScoreRaceChart playerIds={[...session.playerIds]} race={session.race} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <GameLog session={session} />

        <aside className="flex flex-col gap-4" aria-label="Highlights">
          <div className="jade-card p-4">
            <h2 className="font-serif text-2xl">Session</h2>
            <ul className="mt-3 space-y-3 border-t border-jade-ink/25 pt-3">
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

          <div className="jade-card p-4">
            <h2 className="font-serif text-2xl">Win methods</h2>
            <div className="mt-4 space-y-4">
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

          <div className="jade-card p-4">
            <h2 className="font-serif text-2xl">Most claimed combos</h2>
            <ul className="mt-3 space-y-2 border-t border-jade-ink/25 pt-3">
              {session.claimedCombos.map((combo) => (
                <li
                  key={combo.label}
                  className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-[0.12em]"
                >
                  <span>{combo.label}</span>
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
        "inline-flex items-center border-[2px] border-jade-ink bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
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
        "border-b border-jade-ink/20 px-3 py-3 sm:border-b-0 sm:border-r sm:last:border-r-0",
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-lg",
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
      <p className="mt-0.5 text-sm">{value}</p>
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
      <div className="h-2.5 border border-jade-ink bg-parchment">
        <div className={cn("h-full", className)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
