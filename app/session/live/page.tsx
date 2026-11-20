"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Share2 } from "lucide-react"

import { FormSquares } from "@/components/jade/form-squares"
import { TileStrip } from "@/components/jade/tile-strip"
import {
  CameraScanModal,
  type ConfirmedScanHand,
} from "@/components/session/camera-scan-modal"
import { ManualHandModal } from "@/components/session/manual-hand-modal"
import {
  formatPlainPoints,
  formatSignedPoints,
} from "@/lib/mock/jade-board"
import {
  WIND_META,
  applyDrawHand,
  applyHandToSession,
  endLiveSession,
  formatElapsed,
  loadLiveSession,
  roundBadge,
  saveLiveSession,
  type LiveHand,
  type LiveSession,
} from "@/lib/session/live-demo"
import { cn } from "@/lib/utils"

const RACE_COLORS = [
  "var(--jade-gold)",
  "var(--jade-accent)",
  "var(--jade-ink)",
  "var(--jade-red)",
]

export default function LiveSessionPage() {
  const router = useRouter()
  const [session, setSession] = useState<LiveSession | null>(null)
  const [ready, setReady] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [scanOpen, setScanOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)

  useEffect(() => {
    const loaded = loadLiveSession()
    if (!loaded) {
      router.replace("/session/new")
      return
    }
    setSession(loaded)
    setReady(true)
  }, [router])

  useEffect(() => {
    if (!session || session.status !== "live") return
    const tick = () => {
      setElapsedMs(Date.now() - new Date(session.startedAt).getTime())
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [session])

  function persist(next: LiveSession) {
    setSession(next)
    saveLiveSession(next)
  }

  function logConfirmed(hand: ConfirmedScanHand) {
    if (!session) return
    persist(
      applyHandToSession(session, {
        winnerSeatIndex: hand.winnerSeatIndex,
        method: hand.method,
        dealtBySeatIndex: hand.dealtBySeatIndex,
        tileIds: hand.tileIds,
        winningTileId: hand.winningTileId,
        combos: hand.combos,
        points: hand.points,
        deltas: hand.deltas,
        demoHandId: hand.demoHandId,
      }),
    )
    setScanOpen(false)
    setManualOpen(false)
  }

  function onDraw() {
    if (!session || session.status !== "live") return
    persist(applyDrawHand(session))
  }

  function onEnd() {
    if (!session) return
    persist(endLiveSession(session))
  }

  async function shareStandings() {
    if (!session) return
    const lines = [...session.seats]
      .sort((a, b) => b.net - a.net)
      .map(
        (seat, index) =>
          `${index + 1}. ${seat.name} ${formatSignedPoints(seat.net)}`,
      )
      .join("\n")
    const text = `${session.title}\n${lines}`
    try {
      if (navigator.share) {
        await navigator.share({ title: session.title, text })
      } else {
        await navigator.clipboard.writeText(text)
        alert("Standings copied to clipboard.")
      }
    } catch {
      /* user cancelled */
    }
  }

  const highlights = useMemo(() => {
    if (!session) return null
    const biggest = session.hands
      .filter((hand) => hand.winnerSeatIndex >= 0)
      .reduce<LiveHand | null>(
        (best, hand) => (!best || hand.points > best.points ? hand : best),
        null,
      )
    const hot = [...session.seats].sort((a, b) => b.wins - a.wins)[0]
    return { biggest, hot }
  }, [session])

  if (!ready || !session) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Loading table…
        </p>
      </main>
    )
  }

  if (session.status === "finished") {
    return <FinalStandings session={session} onShare={shareStandings} />
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="jade-card flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-2 border-[2px] border-jade-accent bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-jade-accent">
            <span className="jade-live-pulse size-2 rounded-full bg-jade-accent" />
            Live
          </span>
          <span className="font-mono text-sm tabular-nums">
            {formatElapsed(elapsedMs)}
          </span>
          <span className="border border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
            {roundBadge(session)}
          </span>
          <span className="border border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
            Hand #{session.handNumber}
          </span>
          <span className="border border-jade-ink bg-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
            {session.board}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto font-serif text-xl sm:mr-2">{session.title}</p>
          <button
            type="button"
            onClick={onEnd}
            className="border-[2px] border-jade-red px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red"
          >
            End session
          </button>
        </div>
      </div>

      <section
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Live seats"
      >
        {session.seats.map((seat, index) => {
          const dealer = index === session.dealerSeatIndex
          return (
            <article key={seat.wind} className="jade-card relative p-4">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "grid size-10 place-items-center border-[2px] border-jade-ink font-serif text-xl",
                    dealer ? "bg-jade-gold" : "bg-parchment",
                  )}
                >
                  {WIND_META[seat.wind].badge}
                </span>
                {dealer ? (
                  <span className="border border-jade-gold bg-jade-gold px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-jade-ink">
                    Dealer
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 truncate font-serif text-2xl leading-none">
                {seat.name}
              </h2>
              <p
                className={cn(
                  "mt-3 font-mono text-3xl tabular-nums",
                  seat.net > 0 && "text-jade-accent",
                  seat.net < 0 && "text-jade-red",
                )}
              >
                {formatSignedPoints(seat.net)}
              </p>
              <FormSquares form={seat.form} className="mt-3" />
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-jade-ink/25 pt-3 font-mono text-[10px] uppercase tracking-[0.12em]">
                <div>
                  <p className="text-muted-foreground">Wins</p>
                  <p className="mt-0.5 text-sm">{seat.wins}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dealt in</p>
                  <p className="mt-0.5 text-sm">{seat.dealtIn}</p>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <section
        className="jade-card-accent mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center"
        aria-label="Primary actions"
      >
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="scan-cta-accent inline-flex h-12 min-w-[16rem] flex-1 items-center justify-center rounded-none px-4 font-mono text-[11px] uppercase tracking-[0.16em] sm:flex-none"
        >
          📷 Scan winning hand (AI demo)
        </button>
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="inline-flex h-12 items-center justify-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          + Log hand manually
        </button>
        <button
          type="button"
          onClick={onDraw}
          className="inline-flex h-12 items-center justify-center border-[2px] border-jade-ink bg-parchment px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          Draw / no winner
        </button>
      </section>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <LiveGameLog session={session} />
        <aside className="flex flex-col gap-4">
          <LiveScoreRace session={session} />
          <div className="jade-card p-4">
            <h2 className="font-serif text-2xl">Table highlights</h2>
            <ul className="mt-3 space-y-3 border-t border-jade-ink/25 pt-3">
              <li>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Biggest hand
                </p>
                <p className="mt-0.5 text-sm">
                  {highlights?.biggest && highlights.biggest.winnerSeatIndex >= 0
                    ? `${session.seats[highlights.biggest.winnerSeatIndex]?.nickname} · ${formatPlainPoints(highlights.biggest.points)}`
                    : "—"}
                </p>
              </li>
              <li>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Hot streak
                </p>
                <p className="mt-0.5 text-sm">
                  {highlights?.hot
                    ? `${highlights.hot.nickname} · ${highlights.hot.wins} wins`
                    : "—"}
                </p>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <CameraScanModal
        open={scanOpen}
        seats={session.seats}
        onClose={() => setScanOpen(false)}
        onConfirm={logConfirmed}
      />
      <ManualHandModal
        open={manualOpen}
        seats={session.seats}
        onClose={() => setManualOpen(false)}
        onConfirm={logConfirmed}
      />
    </main>
  )
}

function LiveGameLog({ session }: { session: LiveSession }) {
  return (
    <section className="jade-card overflow-hidden">
      <div className="border-b-[2px] border-jade-ink px-4 py-3">
        <h2 className="font-serif text-2xl">Live game log</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {session.hands.length} hands filed
        </p>
      </div>
      {session.hands.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">
          No hands yet. Scan a winning hand or log one manually.
        </p>
      ) : (
        <ol className="divide-y divide-jade-ink/30">
          {session.hands.map((hand) => {
            const winner =
              hand.winnerSeatIndex >= 0
                ? session.seats[hand.winnerSeatIndex]
                : null
            const dealt =
              hand.dealtBySeatIndex != null
                ? session.seats[hand.dealtBySeatIndex]
                : null
            return (
              <li key={hand.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Hand {String(hand.handNo).padStart(2, "0")}
                      {winner
                        ? ` · ${winner.nickname} · ${hand.method}`
                        : " · Draw"}
                      {dealt ? ` · dealt by ${dealt.nickname}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {hand.combos.map((combo) => (
                        <span
                          key={`${hand.id}-${combo.label}`}
                          className="border border-jade-ink bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]"
                        >
                          {combo.label}
                          {combo.fan > 0 ? ` · ${combo.fan}f` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p
                    className={cn(
                      "font-mono text-sm",
                      hand.points > 0 && "text-jade-accent",
                    )}
                  >
                    {hand.points > 0
                      ? formatSignedPoints(hand.points)
                      : "0"}
                  </p>
                </div>
                {hand.tileIds.length > 0 ? (
                  <div className="mt-3">
                    <TileStrip
                      ids={hand.tileIds}
                      winningId={hand.winningTileId}
                      size="xs"
                    />
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.12em]">
                  {session.seats.map((seat, index) => {
                    const delta = hand.deltas[index] ?? 0
                    return (
                      <span
                        key={seat.wind}
                        className={cn(
                          delta > 0 && "text-jade-accent",
                          delta < 0 && "text-jade-red",
                        )}
                      >
                        {seat.nickname} {formatSignedPoints(delta)}
                      </span>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function LiveScoreRace({ session }: { session: LiveSession }) {
  const width = 420
  const height = 220
  const pad = { top: 14, right: 12, bottom: 24, left: 40 }
  const series = session.race
  const handCount = Math.max(...series.map((s) => s.length - 1), 1)
  const allValues = series.flat()
  const minY = Math.min(0, ...allValues)
  const maxY = Math.max(0, ...allValues)
  const spanY = maxY - minY || 1
  const x = (i: number) =>
    pad.left + (i / handCount) * (width - pad.left - pad.right)
  const y = (v: number) =>
    pad.top + (1 - (v - minY) / spanY) * (height - pad.top - pad.bottom)

  return (
    <div className="jade-card overflow-hidden">
      <div className="border-b-[2px] border-jade-ink px-4 py-3">
        <h2 className="font-serif text-2xl">Score race</h2>
      </div>
      <div className="p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Live score race"
        >
          <line
            x1={pad.left}
            y1={y(0)}
            x2={width - pad.right}
            y2={y(0)}
            stroke="var(--jade-ink)"
            strokeOpacity="0.25"
            strokeDasharray="4 4"
          />
          {series.map((values, seriesIndex) => {
            const d = values
              .map((value, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(value)}`)
              .join(" ")
            const color = RACE_COLORS[seriesIndex % RACE_COLORS.length]
            return (
              <g key={session.seats[seriesIndex]?.wind ?? seriesIndex}>
                <path d={d} fill="none" stroke={color} strokeWidth="2.5" />
                {values.map((value, i) => (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(value)}
                    r="3"
                    fill="var(--bg-card)"
                    stroke={color}
                    strokeWidth="2"
                  />
                ))}
              </g>
            )
          })}
        </svg>
        <div className="mt-2 flex flex-wrap gap-3 px-1">
          {session.seats.map((seat, index) => (
            <span
              key={seat.wind}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              <span
                className="size-2.5 border border-jade-ink"
                style={{ background: RACE_COLORS[index % RACE_COLORS.length] }}
              />
              {seat.nickname}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function FinalStandings({
  session,
  onShare,
}: {
  session: LiveSession
  onShare: () => void
}) {
  const ranked = [...session.seats]
    .map((seat, index) => ({ seat, index }))
    .sort((a, b) => b.seat.net - a.seat.net)

  const placeLabel = (place: number) =>
    place === 1 ? "1st" : place === 2 ? "2nd" : place === 3 ? "3rd" : "4th"

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Session closed
      </p>
      <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] sm:text-6xl">
        Final standings
      </h1>
      <p className="mt-3 font-serif text-2xl text-jade-accent">{session.title}</p>
      <div className="jade-divider mt-6" />

      <ol className="mt-8 grid gap-4 sm:grid-cols-2">
        {ranked.map(({ seat }, place) => (
          <li
            key={seat.wind}
            className={cn(
              "relative overflow-hidden p-5",
              place === 0 ? "jade-card-gold" : "jade-card",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-0 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
                place === 0
                  ? "bg-jade-gold text-jade-ink"
                  : "bg-jade-ink text-white",
              )}
            >
              {placeLabel(place + 1)}
            </span>
            <div className="mt-6 flex items-center gap-3">
              <span className="grid size-11 place-items-center border-[2px] border-jade-ink bg-parchment font-serif text-xl">
                {WIND_META[seat.wind].badge}
              </span>
              <div>
                <p className="font-serif text-2xl leading-none">{seat.name}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {seat.wins} wins · {seat.dealtIn} dealt in
                </p>
              </div>
            </div>
            <p
              className={cn(
                "mt-4 font-mono text-4xl",
                seat.net > 0 && "text-jade-accent",
                seat.net < 0 && "text-jade-red",
              )}
            >
              {formatSignedPoints(seat.net)}
            </p>
            <FormSquares form={seat.form} className="mt-3" />
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onShare}
          className="scan-cta-accent inline-flex h-11 items-center gap-2 rounded-none px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          <Share2 className="size-4" />
          Share standings card
        </button>
        <Link
          href="/leaderboard"
          className="inline-flex h-11 items-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          Back to leaderboard
        </Link>
        <Link
          href="/session/new"
          className="inline-flex h-11 items-center border-[2px] border-jade-ink bg-parchment px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          New session
        </Link>
      </div>
    </main>
  )
}
