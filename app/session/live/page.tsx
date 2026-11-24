"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, Share2 } from "lucide-react"

import { FormSquares } from "@/components/jade/form-squares"
import { TileStrip } from "@/components/jade/tile-strip"
import { HandLogModal } from "@/components/session/hand-log-modal"
import {
  CameraScanModal,
  type ConfirmedScanHand,
} from "@/components/session/camera-scan-modal"
import { SessionNewspaperButton } from "@/components/share/session-newspaper"
import { ShareWinCardButton } from "@/components/share/win-story-card"
import {
  formatPlainPoints,
  formatSignedPoints,
} from "@/lib/mock/jade-board"
import { computeSessionAwards } from "@/lib/share/awards"
import {
  WIND_META,
  formatElapsed,
  roundBadge,
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
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Loading table…
          </p>
        </main>
      }
    >
      <LiveSessionInner />
    </Suspense>
  )
}

function LiveSessionInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("id")
  const [session, setSession] = useState<LiveSession | null>(null)
  const [ready, setReady] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [handLogOpen, setHandLogOpen] = useState(false)
  const [cameraScanOpen, setCameraScanOpen] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [isCaptain, setIsCaptain] = useState(false)

  const refresh = useCallback(async (id: string) => {
    const response = await fetch(`/api/sessions/${id}`)
    const data = (await response.json()) as {
      error?: string
      session?: LiveSession & { captainUserId?: string }
      viewer?: { id: string; isCaptain?: boolean } | null
    }
    if (response.status === 401) {
      router.replace(
        `/login?next=${encodeURIComponent(`/session/live?id=${id}`)}`,
      )
      throw new Error("Login required")
    }
    if (!response.ok || !data.session) {
      throw new Error(data.error ?? "Session not found")
    }
    setSession(data.session)
    setIsCaptain(Boolean(data.viewer?.isCaptain))
    return data.session
  }, [router])

  useEffect(() => {
    if (!sessionId) {
      router.replace("/schedule?create=1")
      return
    }
    void refresh(sessionId)
      .then(() => setReady(true))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : ""
        if (message === "Login required") return
        router.replace("/schedule?create=1")
      })
  }, [sessionId, refresh, router])

  useEffect(() => {
    if (!session || session.status !== "live") return
    const tick = () => {
      const now = Date.now()
      setElapsedMs(now - new Date(session.startedAt).getTime())
      if (session.expiresAt) {
        const left = new Date(session.expiresAt).getTime() - now
        setRemainingMs(Math.max(0, left))
        // Soft refresh when the Free/Pro clock hits zero so server can auto-finish
        if (left <= 0 && sessionId) {
          void refresh(sessionId).catch(() => undefined)
        }
      } else {
        setRemainingMs(null)
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [session, sessionId, refresh])

  useEffect(() => {
    let cancelled = false
    void fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return
        const data = (await response.json()) as {
          user?: { isPro?: boolean; role?: string } | null
        }
        if (cancelled) return
        setIsPro(Boolean(data.user?.isPro || data.user?.role === "ADMIN"))
      })
      .catch(() => {
        if (!cancelled) setIsPro(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function postHand(hand: {
    winnerSeatIndex: number
    method: "self-draw" | "discard" | "draw"
    dealtBySeatIndex: number | null
    tileIds: string[]
    winningTileId: string
    combos: { label: string; fan: number }[]
    points: number
    deltas?: number[]
    demoHandId?: string
  }) {
    if (!sessionId) return false
    setBusy(true)
    setActionError(null)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/hands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hand),
      })
      const data = (await response.json()) as {
        error?: string
        session?: LiveSession
      }
      if (!response.ok || !data.session) {
        setActionError(data.error ?? "Could not log hand")
        return false
      }
      setSession(data.session)
      setHandLogOpen(false)
      setCameraScanOpen(false)
      return true
    } catch {
      setActionError("Network error logging hand")
      return false
    } finally {
      setBusy(false)
    }
  }

  function logConfirmed(hand: ConfirmedScanHand) {
    void postHand({
      winnerSeatIndex: hand.winnerSeatIndex,
      method: hand.method,
      dealtBySeatIndex: hand.dealtBySeatIndex,
      tileIds: hand.tileIds,
      winningTileId: hand.winningTileId,
      combos: hand.combos,
      points: hand.points,
      deltas: hand.deltas,
      demoHandId: hand.demoHandId,
    })
  }

  function onDraw() {
    if (!session || session.status !== "live" || busy) return
    void postHand({
      winnerSeatIndex: -1,
      method: "draw",
      dealtBySeatIndex: null,
      tileIds: [],
      winningTileId: "",
      combos: [{ label: "Draw", fan: 0 }],
      points: 0,
      deltas: session.seats.map(() => 0),
    })
  }

  async function onEnd() {
    if (!sessionId || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/finish`, {
        method: "POST",
      })
      const data = (await response.json()) as {
        error?: string
        session?: LiveSession
      }
      if (!response.ok || !data.session) {
        setActionError(data.error ?? "Could not end session")
        return
      }
      setSession(data.session)
    } catch {
      setActionError("Network error ending session")
    } finally {
      setBusy(false)
    }
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
    return (
      <FinalStandings
        session={session}
        isPro={isPro}
        onShare={shareStandings}
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/live"
        className="tap-press mb-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-jade-accent"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Live tables
      </Link>
      <div className="jade-card flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-2 border-[2px] border-jade-accent bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-jade-accent">
            <span className="jade-live-pulse size-2 rounded-full bg-jade-accent" />
            Live · Postgres
          </span>
          <span className="font-mono text-sm tabular-nums">
            {formatElapsed(elapsedMs)}
          </span>
          {session.durationTier === "club" ? (
            <span className="border border-jade-gold/40 bg-jade-gold/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
              Club · no auto-end
            </span>
          ) : remainingMs != null ? (
            <span
              className={cn(
                "border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
                remainingMs < 15 * 60 * 1000
                  ? "border-jade-red bg-card text-jade-red"
                  : "border-jade-ink bg-parchment",
              )}
            >
              {session.durationTier === "pro" ? "Pro" : "Free"} ·{" "}
              {formatElapsed(remainingMs)} left
              {session.maxHours ? ` / ${session.maxHours}h` : ""}
            </span>
          ) : null}
          <span className="border border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
            {roundBadge(session)}
          </span>
          <span className="border border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
            Hand #{session.handNumber}
          </span>
          <span className="border border-jade-ink bg-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
            {session.scoringRuleset === "chicken"
              ? "Chicken Hand"
              : "Jade HK"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto font-serif text-xl sm:mr-2">{session.title}</p>
          <button
            type="button"
            disabled={busy || !isCaptain}
            onClick={() => void onEnd()}
            className="border-[2px] border-jade-red px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red disabled:opacity-40"
          >
            End session
          </button>
        </div>
      </div>

      {actionError ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red">
          {actionError}
        </p>
      ) : null}

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
        <div className="relative inline-flex min-w-[16rem] flex-1 sm:flex-none">
          <button
            type="button"
            disabled={busy || !isCaptain}
            onClick={() => setHandLogOpen(true)}
            className="scan-cta-accent inline-flex h-12 w-full items-center justify-center rounded-none px-4 font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
          >
            🀄 Log hand · HKOS calculator
          </button>
        </div>
        <button
          type="button"
          disabled={busy || !isCaptain}
          onClick={() => setCameraScanOpen(true)}
          className="inline-flex h-12 items-center justify-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
        >
          📷 Camera scan
        </button>
        <button
          type="button"
          disabled={busy || !isCaptain}
          onClick={onDraw}
          className="inline-flex h-12 items-center justify-center border-[2px] border-jade-ink bg-parchment px-4 font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
        >
          Draw / no winner
        </button>
      </section>

      {!isCaptain ? (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          View only — table captain logs hands
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <LiveGameLog session={session} isPro={isPro} />
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

      <HandLogModal
        open={handLogOpen}
        seats={session.seats}
        ruleset={session.scoringRuleset ?? "jade-hk"}
        onClose={() => setHandLogOpen(false)}
        onConfirm={logConfirmed}
      />
      <CameraScanModal
        open={cameraScanOpen}
        seats={session.seats}
        ruleset={session.scoringRuleset ?? "jade-hk"}
        onClose={() => setCameraScanOpen(false)}
        onConfirm={(hand) => {
          setCameraScanOpen(false)
          logConfirmed(hand)
        }}
      />
    </main>
  )
}

function LiveGameLog({
  session,
  isPro,
}: {
  session: LiveSession
  isPro: boolean
}) {
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
          No hands yet. Open the HKOS calculator to log a win.
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
                  <div className="flex flex-col items-end gap-2">
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
                    {winner ? (
                      <ShareWinCardButton
                        isPro={isPro}
                        hand={{
                          sessionTitle: session.title,
                          handNo: hand.handNo,
                          winnerName: winner.name,
                          method: hand.method,
                          points: hand.points,
                          combos: hand.combos,
                          tileIds: hand.tileIds,
                          winningTileId: hand.winningTileId,
                        }}
                      />
                    ) : null}
                  </div>
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
  isPro,
  onShare,
}: {
  session: LiveSession
  isPro: boolean
  onShare: () => void
}) {
  const ranked = [...session.seats]
    .map((seat, index) => ({ seat, index }))
    .sort((a, b) => b.seat.net - a.seat.net)
  const awards = computeSessionAwards(session)

  const placeLabel = (place: number) =>
    place === 1 ? "1st" : place === 2 ? "2nd" : place === 3 ? "3rd" : "4th"

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Session closed · Leaderboard updated
      </p>
      <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] sm:text-6xl">
        Final standings
      </h1>
      <p className="mt-3 font-serif text-2xl text-jade-accent">{session.title}</p>
      <div className="jade-divider mt-6" />

      {awards.length > 0 ? (
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {awards.map((award) => (
            <article key={award.id} className="jade-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-gold">
                {award.title}
              </p>
              <p className="mt-2 font-serif text-2xl leading-none">
                {award.playerName}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {award.detail}
              </p>
            </article>
          ))}
        </section>
      ) : null}

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
        <SessionNewspaperButton session={session} />
        <Link
          href={`/session/${session.id}`}
          className="scan-cta inline-flex h-11 items-center px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          Full ledger · hand posts →
        </Link>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex h-11 items-center gap-2 border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          <Share2 className="size-4" />
          Share text standings
        </button>
        <Link
          href="/schedule?create=1"
          className="inline-flex h-11 items-center border-[2px] border-jade-ink bg-parchment px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          New session
        </Link>
      </div>

      <div className="mt-8">
        <LiveGameLog session={session} isPro={isPro} />
      </div>
    </main>
  )
}
