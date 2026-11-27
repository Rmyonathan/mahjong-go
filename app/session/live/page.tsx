"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, Share2 } from "lucide-react"

import { FormSquares } from "@/components/jade/form-squares"
import { TileStrip } from "@/components/jade/tile-strip"
import { PlayerAvatar } from "@/components/players/player-avatar"
import { ScoutPlayerModal } from "@/components/players/scout-player-modal"
import { HandLogModal } from "@/components/session/hand-log-modal"
import {
  ManageTableModal,
  type ManageableSession,
} from "@/components/session/manage-table-modal"
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

const RETIRED_RACE_COLORS = ["#6B7280", "#7C3AED", "#0284C7"]

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
  const [manageOpen, setManageOpen] = useState(false)
  const [startModalOpen, setStartModalOpen] = useState(false)
  const [roundPickerOpen, setRoundPickerOpen] = useState(false)
  const [accessDenied, setAccessDenied] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [isCaptain, setIsCaptain] = useState(false)
  const [canLogHands, setCanLogHands] = useState(false)
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0)
  const [pendingInviteNames, setPendingInviteNames] = useState<string[]>([])
  const [scoutPlayerId, setScoutPlayerId] = useState<string | null>(null)

  const refresh = useCallback(async (id: string) => {
    const response = await fetch(`/api/sessions/${id}`)
    const data = (await response.json()) as {
      error?: string
      session?: LiveSession & { captainUserId?: string }
      pendingInvitesCount?: number
      pendingInviteNames?: string[]
      viewer?: {
        id: string
        isCaptain?: boolean
        canLogHands?: boolean
      } | null
    }
    if (response.status === 401) {
      router.replace(
        `/login?next=${encodeURIComponent(`/session/live?id=${id}`)}`,
      )
      throw new Error("Login required")
    }
    if (response.status === 403) {
      setAccessDenied(
        data.error ??
          "Only seated players can view this live table — wait to be promoted from the waitlist",
      )
      return null
    }
    if (!response.ok || !data.session) {
      throw new Error(data.error ?? "Session not found")
    }
    setAccessDenied(null)
    setSession(data.session)
    setIsCaptain(Boolean(data.viewer?.isCaptain))
    setCanLogHands(Boolean(data.viewer?.canLogHands))
    setPendingInvitesCount(data.pendingInvitesCount ?? 0)
    setPendingInviteNames(data.pendingInviteNames ?? [])
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

  useEffect(() => {
    if (!session || session.status !== "live" || !sessionId) {
      return
    }
    const id = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !handLogOpen &&
        !cameraScanOpen &&
        !manageOpen &&
        !busy
      ) {
        void refresh(sessionId).catch(() => undefined)
      }
    }, 3000)
    return () => window.clearInterval(id)
  }, [
    session,
    sessionId,
    refresh,
    handLogOpen,
    cameraScanOpen,
    manageOpen,
    busy,
  ])

  function onDraw() {
    if (!session || session.status !== "live" || busy || pendingInvitesCount > 0) return
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
    const tournamentId =
      (session as LiveSession & { tournamentId?: string | null }).tournamentId ??
      null
    if (tournamentId) {
      const ok = window.confirm(
        "End this tournament table log?\n\n" +
          "Logged hands stay on tournament standings. Other tables in the round can still be playing.\n\n" +
          "You can reopen this table from the tournament hub if you ended by mistake.",
      )
      if (!ok) return
    }
    setBusy(true)
    setActionError(null)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/finish`, {
        method: "POST",
      })
      const data = (await response.json()) as {
        error?: string
        session?: LiveSession
        tournamentId?: string | null
      }
      if (!response.ok || !data.session) {
        setActionError(
          data.error ??
            (tournamentId
              ? "Could not close table log — try again from the tournament hub"
              : "Could not end session"),
        )
        return
      }
      setSession({
        ...data.session,
        tournamentId:
          data.tournamentId ??
          tournamentId ??
          (data.session as LiveSession & { tournamentId?: string | null })
            .tournamentId ??
          null,
      } as LiveSession & { tournamentId?: string | null })
    } catch {
      setActionError(
        tournamentId
          ? "Network error — return to the tournament hub and retry"
          : "Network error ending session",
      )
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

  if (accessDenied) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="jade-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-jade-gold">
            Seat required
          </p>
          <h1 className="mt-2 font-serif text-3xl">Table Locked</h1>
          <p className="mt-2 text-sm text-muted-foreground">{accessDenied}</p>
          <Link
            href="/schedule"
            className="tap-press mt-5 inline-flex h-10 items-center rounded-full bg-jade-accent px-5 text-sm font-semibold text-white"
          >
            Back to Schedule
          </Link>
        </div>
      </main>
    )
  }

  if (!ready || !session) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Loading table…
        </p>
      </main>
    )
  }

  const tournamentId =
    (session as LiveSession & { tournamentId?: string | null }).tournamentId ??
    null
  const canControlTable = isCaptain || canLogHands
  const waitingForInvites = pendingInvitesCount > 0
  const needsSessionStart = !session.sessionStarted && session.hands.length === 0
  const waitlistQueue =
    (session as ManageableSession).waitlistQueue ?? []

  if (session.status === "finished") {
    return (
      <FinalStandings
        session={session}
        isPro={isPro}
        tournamentId={tournamentId}
        onShare={shareStandings}
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={tournamentId ? `/tournaments/${tournamentId}` : "/live"}
        className="tap-press mb-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-jade-accent"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {tournamentId ? "Tournament hub" : "Live tables"}
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
          {isCaptain ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setRoundPickerOpen(true)}
              className="tap-press border-[2px] border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-jade-soft disabled:opacity-40"
              title="Change round wind"
            >
              {roundBadge(session)} ▾
            </button>
          ) : (
            <span className="border border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
              {roundBadge(session)}
            </span>
          )}
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
          {isCaptain ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setManageOpen(true)}
              className="border-[2px] border-jade-ink bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink hover:bg-jade-soft disabled:opacity-40"
            >
              Edit table
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || !isCaptain}
            onClick={() => void onEnd()}
            className="border-[2px] border-jade-red px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red disabled:opacity-40"
          >
            {tournamentId ? "End table log" : "End session"}
          </button>
        </div>
      </div>

      {actionError ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red">
          {actionError}
        </p>
      ) : null}

      {needsSessionStart ? (
        <div className="jade-card-accent mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-jade-accent">
              Before Hand #1
            </p>
            <p className="mt-1 font-serif text-xl leading-snug">
              Set who starts as Tong (Dealer), Nan, Xi{session.seats.length >= 4 ? ", and Pei" : ""}
            </p>
          </div>
          {isCaptain ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStartModalOpen(true)}
              className="scan-cta inline-flex h-12 shrink-0 items-center justify-center px-5 font-mono text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-40"
            >
              Start Session →
            </button>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Waiting for captain to start session…
            </span>
          )}
        </div>
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
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid size-10 place-items-center border-[2px] border-jade-ink font-serif text-xl",
                      dealer ? "bg-jade-gold" : "bg-parchment",
                    )}
                  >
                    {WIND_META[seat.wind].badge}
                  </span>
                  <PlayerAvatar
                    initials={seat.initials ?? seat.name.slice(0, 2).toUpperCase()}
                    name={seat.name}
                    avatarUrl={seat.avatarUrl}
                    frameId={seat.frameId}
                    size="sm"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {(() => {
                    const metaUserId = (
                      session as LiveSession & {
                        captainUserId?: string
                        seatsMeta?: Array<{ userId?: string | null }>
                      }
                    ).seatsMeta?.[index]?.userId
                    const captainId = (
                      session as LiveSession & { captainUserId?: string }
                    ).captainUserId
                    return metaUserId && captainId && metaUserId === captainId ? (
                      <span className="border border-jade-ink bg-jade-ink px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white">
                        Host
                      </span>
                    ) : null
                  })()}
                  {dealer ? (
                    <span className="border border-jade-gold bg-jade-gold px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-jade-ink">
                      Dealer
                    </span>
                  ) : null}
                </div>
              </div>
              <h2 className="mt-3 truncate font-serif text-2xl leading-none">
                {(() => {
                  const metaPlayerId = (
                    session as LiveSession & {
                      seatsMeta?: Array<{ playerId?: string | null }>
                    }
                  ).seatsMeta?.[index]?.playerId
                  return metaPlayerId ? (
                    <button
                      type="button"
                      onClick={() => setScoutPlayerId(metaPlayerId)}
                      className="truncate text-left underline-offset-4 hover:text-jade-accent hover:underline"
                      title="Scout player"
                    >
                      {seat.name}
                    </button>
                  ) : (
                    seat.name
                  )
                })()}
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

      {isCaptain && waitlistQueue.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-jade-gold/45 bg-jade-gold/12 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-jade-ink">
            <span className="rounded-full bg-jade-gold px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-jade-ink">
              Waitlist · {waitlistQueue.length}
            </span>
            <span>{waitlistQueue.map((w) => w.name).join(", ")}</span>
          </div>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="tap-press rounded-full border border-[#102A20]/15 bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-ink"
          >
            Edit table →
          </button>
        </div>
      ) : null}

      {waitingForInvites ? (
        <div
          role="status"
          className="mt-5 flex flex-col gap-2 rounded-2xl border border-jade-gold/50 bg-jade-gold/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="jade-live-pulse size-2 shrink-0 rounded-full bg-jade-gold" />
            <p className="text-sm text-jade-ink">
              Waiting for all invited players to join (
              <strong>{pendingInviteNames.join(", ")}</strong>) before
              starting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => sessionId && void refresh(sessionId)}
            className="tap-press shrink-0 self-start rounded-full border border-[#102A20]/15 bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] sm:self-auto"
          >
            Refresh
          </button>
        </div>
      ) : null}

      <section
        className="jade-card-accent mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center"
        aria-label="Primary actions"
      >
        <div className="relative inline-flex min-w-[16rem] flex-1 sm:flex-none">
          <button
            type="button"
            disabled={busy || !canControlTable || waitingForInvites || needsSessionStart}
            onClick={() => setHandLogOpen(true)}
            className="scan-cta-accent inline-flex h-12 w-full items-center justify-center rounded-none px-4 font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
          >
            🀄 Log hand · HKOS calculator
          </button>
        </div>
        <button
          type="button"
          disabled={busy || !canControlTable || waitingForInvites || needsSessionStart}
          onClick={() => setCameraScanOpen(true)}
          className="inline-flex h-12 items-center justify-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
        >
          📷 Camera scan
        </button>
        <button
          type="button"
          disabled={busy || !canControlTable || waitingForInvites || needsSessionStart}
          onClick={onDraw}
          className="inline-flex h-12 items-center justify-center border-[2px] border-jade-ink bg-parchment px-4 font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
        >
          Draw / no winner
        </button>
      </section>

      {!canControlTable ? (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          View only — wasit or table captain logs hands
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
        roundWind={session.roundWind ?? "east"}
        onClose={() => setHandLogOpen(false)}
        onConfirm={logConfirmed}
      />
      <CameraScanModal
        open={cameraScanOpen}
        seats={session.seats}
        ruleset={session.scoringRuleset ?? "jade-hk"}
        roundWind={session.roundWind ?? "east"}
        onClose={() => setCameraScanOpen(false)}
        onConfirm={(hand) => {
          setCameraScanOpen(false)
          logConfirmed(hand)
        }}
      />
      <StartSessionModal
        open={startModalOpen}
        session={session as ManageableSession}
        onClose={() => setStartModalOpen(false)}
        onStarted={() => {
          setStartModalOpen(false)
          if (sessionId) void refresh(sessionId).catch(() => undefined)
        }}
      />
      {roundPickerOpen ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close round picker"
            className="absolute inset-0 bg-jade-ink/55"
            onClick={() => setRoundPickerOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xs border-[2px] border-jade-ink bg-parchment p-4 shadow-[6px_6px_0_0_var(--jade-ink)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Change Round Wind
            </p>
            <h2 className="mt-1 font-serif text-2xl">Angin Meja / Ronde</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["east", "south", "west", "north"] as const).map((windKey) => {
                const meta = WIND_META[windKey]
                const active = (session.roundWind ?? "east") === windKey
                return (
                  <button
                    key={windKey}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!sessionId) return
                      setBusy(true)
                      void fetch(`/api/sessions/${sessionId}/manage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "set_round_wind",
                          roundWind: windKey,
                        }),
                      })
                        .then(() => refresh(sessionId))
                        .then(() => setRoundPickerOpen(false))
                        .catch(() => undefined)
                        .finally(() => setBusy(false))
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 border-[2px] py-3 font-mono text-xs uppercase tracking-[0.14em] transition",
                      active
                        ? "border-jade-accent bg-jade-accent text-white"
                        : "border-jade-ink bg-card text-jade-ink hover:bg-jade-soft",
                    )}
                  >
                    <span className="font-serif text-2xl leading-none">
                      {meta.badge}
                    </span>
                    <span>{meta.label}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setRoundPickerOpen(false)}
              className="mt-3 h-10 w-full border-[2px] border-jade-ink bg-card font-mono text-[10px] uppercase tracking-[0.14em]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <ScoutPlayerModal
        playerId={scoutPlayerId}
        onClose={() => setScoutPlayerId(null)}
      />
      <ManageTableModal
        open={manageOpen}
        session={session as ManageableSession}
        onClose={() => setManageOpen(false)}
        onUpdated={(next) => setSession(next)}
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
                        ? ` · ${hand.winnerName ?? winner.nickname} · ${hand.method}`
                        : " · Draw"}
                      {dealt
                        ? ` · dealt by ${hand.dealtName ?? dealt.nickname}`
                        : ""}
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
                        {hand.seatNames?.[index] ?? seat.nickname}{" "}
                        {formatSignedPoints(delta)}
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
  const retiredRaces = session.retiredRaces ?? []
  const handCount = Math.max(...series.map((s) => s.length - 1), 1)
  const allValues = [
    ...series.flat(),
    ...retiredRaces.flatMap((r) =>
      r.values.filter((v): v is number => v != null),
    ),
  ]
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
          {retiredRaces.map((retired, rIdx) => {
            const color = RETIRED_RACE_COLORS[rIdx % RETIRED_RACE_COLORS.length]
            const pts = retired.values
              .map((value, i) => ({ value, i }))
              .filter(
                (entry): entry is { value: number; i: number } =>
                  entry.value != null,
              )
            const d = pts
              .map(
                (entry, idx) =>
                  `${idx === 0 ? "M" : "L"} ${x(entry.i)} ${y(entry.value)}`,
              )
              .join(" ")
            return (
              <g key={`retired-${retired.label}-${rIdx}`}>
                {pts.length > 1 ? (
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                ) : null}
                {pts.map((entry) => (
                  <circle
                    key={entry.i}
                    cx={x(entry.i)}
                    cy={y(entry.value)}
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
          {retiredRaces.map((retired, rIdx) => (
            <span
              key={`legend-${retired.label}-${rIdx}`}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
            >
              <span
                className="size-2.5 border border-dashed border-jade-ink"
                style={{
                  background:
                    RETIRED_RACE_COLORS[rIdx % RETIRED_RACE_COLORS.length],
                }}
              />
              {retired.label}
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
  tournamentId,
  onShare,
}: {
  session: LiveSession
  isPro: boolean
  tournamentId: string | null
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
        {tournamentId
          ? "Table log closed · hands saved to tournament standings"
          : "Session closed · Leaderboard updated"}
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
        {tournamentId ? (
          <Link
            href={`/tournaments/${tournamentId}?tab=tables`}
            className="scan-cta inline-flex h-11 items-center px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            ← Back to tournament · Live tables
          </Link>
        ) : null}
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
        {!tournamentId ? (
          <Link
            href="/schedule?create=1"
            className="inline-flex h-11 items-center border-[2px] border-jade-ink bg-parchment px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            New session
          </Link>
        ) : null}
      </div>

      <div className="mt-8">
        <LiveGameLog session={session} isPro={isPro} />
      </div>
    </main>
  )
}

function StartSessionModal({
  open,
  session,
  onClose,
  onStarted,
}: {
  open: boolean
  session: ManageableSession
  onClose: () => void
  onStarted: () => void
}) {
  const seatRows = useMemo(
    () =>
      (session.seatsMeta ?? []).map((meta, idx) => ({
        seatId: meta.id,
        label: session.seats[idx]?.name ?? meta.guestName ?? `Seat #${idx + 1}`,
      })),
    [session],
  )
  const [order, setOrder] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setOrder(seatRows.map((s) => s.seatId))
    setError(null)
  }, [open, seatRows])

  if (!open) return null

  const WIND_SLOTS = [
    { label: "Tong (Dealer / 東)", badge: "東" },
    { label: "Nan (南)", badge: "南" },
    { label: "Xi (西)", badge: "西" },
    { label: "Pei (北)", badge: "北" },
  ]

  function updateSlot(slotIdx: number, nextSeatId: string) {
    setOrder((prev) => {
      const copy = [...prev]
      const existingIdx = copy.indexOf(nextSeatId)
      if (existingIdx >= 0 && existingIdx !== slotIdx) {
        copy[existingIdx] = copy[slotIdx]!
      }
      copy[slotIdx] = nextSeatId
      return copy
    })
  }

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/sessions/${session.id}/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_session",
          seatIdsInWindOrder: order,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not start session")
        return
      }
      onStarted()
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close start session"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md border-[2px] border-jade-ink bg-parchment p-5 shadow-[8px_8px_0_0_var(--jade-ink)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-accent">
          Start Session
        </p>
        <h2 className="mt-1 font-serif text-2xl">
          Set Tong, Nan, Xi{seatRows.length >= 4 ? ", Pei" : ""}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose who starts as Dealer (Tong), then the next seats in order.
        </p>

        <div className="mt-4 space-y-3">
          {seatRows.map((_, idx) => {
            const slot = WIND_SLOTS[idx] ?? { label: `Seat #${idx + 1}`, badge: `${idx + 1}` }
            return (
              <label key={slot.label} className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  {slot.badge} · {slot.label}
                </span>
                <select
                  value={order[idx] ?? ""}
                  onChange={(e) => updateSlot(idx, e.target.value)}
                  className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-card px-3 text-sm"
                >
                  {seatRows.map((seat) => (
                    <option key={seat.seatId} value={seat.seatId}>
                      {seat.label}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>

        {error ? (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full border-[2px] border-jade-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] sm:flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="scan-cta h-12 w-full font-mono text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-50 sm:flex-[1.5]"
          >
            {saving ? "Starting…" : "Start Session"}
          </button>
        </div>
      </div>
    </div>
  )
}
