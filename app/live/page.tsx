"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { JadePageLoader } from "@/components/jade-page-loader"
import { formatElapsed, WIND_META, type LiveWind } from "@/lib/session/live-demo"
import { formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

type LiveSeatSummary = {
  id: string
  wind: string
  name: string
  nickname: string
  netPoints: number
  userId: string | null
}

type LiveTableCard = {
  id: string
  title: string
  meetId: string | null
  boardType: string
  startedAt: string
  handCount: number
  seatCount: number
  captainUserId: string
  captainName: string
  isCaptain: boolean
  seats: LiveSeatSummary[]
}

type PendingInvite = {
  id: string
  sessionId: string
  sessionTitle: string
  boardType: string
  seatId: string
  wind: string
  inviterName: string
  createdAt: string
}

function boardLabel(boardType: string) {
  switch (boardType) {
    case "BEGINNER":
      return "Beginner"
    case "MCR":
      return "MCR"
    case "GUIDED":
      return "Guided"
    default:
      return "Advanced"
  }
}

function windKey(wind: string): LiveWind {
  const key = wind.toLowerCase() as LiveWind
  return key in WIND_META ? key : "east"
}

export default function LiveTablesPage() {
  const router = useRouter()
  const [tables, setTables] = useState<LiveTableCard[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{
    id: string
    name: string
    role: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [response, invitesRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/session-invites").catch(() => null),
      ])
      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent("/live")}`)
        return
      }
      const data = (await response.json()) as {
        viewer?: { id: string; name: string; role: string } | null
        liveSessions?: LiveTableCard[]
        error?: string
      }
      if (!response.ok) {
        setError(data.error ?? "Could not load live tables")
        return
      }
      if (!data.viewer) {
        router.replace(`/login?next=${encodeURIComponent("/live")}`)
        return
      }
      setViewer(data.viewer)
      setTables(data.liveSessions ?? [])

      if (invitesRes && invitesRes.ok) {
        const invCt = invitesRes.headers.get("content-type") ?? ""
        if (invCt.includes("application/json")) {
          const invData = (await invitesRes.json()) as {
            invites?: PendingInvite[]
          }
          setInvites(invData.invites ?? [])
        }
      }
    } catch {
      setError("Network error loading live tables")
    } finally {
      setLoading(false)
    }
  }, [router])

  async function respondInvite(
    invite: PendingInvite,
    action: "accept" | "decline",
  ) {
    setInviteBusyId(invite.id)
    setError(null)
    try {
      const response = await fetch(
        `/api/session-invites/${encodeURIComponent(invite.id)}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      )
      const data = (await response.json().catch(() => ({}))) as {
        sessionId?: string
        error?: string
      }
      if (!response.ok) {
        setError(data.error ?? "Could not update invite")
        return
      }
      setInvites((prev) => prev.filter((item) => item.id !== invite.id))
      if (action === "accept") {
        router.push(
          `/session/live?id=${encodeURIComponent(data.sessionId ?? invite.sessionId)}`,
        )
        router.refresh()
      }
    } catch {
      setError("Network error responding to invite")
    } finally {
      setInviteBusyId(null)
    }
  }

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (loading) {
    return <JadePageLoader kanji="卓" label="Loading live tables…" />
  }

  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 top-0 select-none font-serif text-[12rem] leading-none text-jade-ink/[0.07] sm:text-[16rem]"
      >
        卓
      </span>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Floor control · {viewer?.name}
          </p>
          <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl">
            Live tables
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed">
            Every table currently in play. Open any room to keep scoring —
            captains can run several tables at once.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 border-[2px] border-jade-accent bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
            <span className="jade-live-pulse size-2 rounded-full bg-jade-accent" />
            {tables.length} live
          </span>
          <Link
            href="/schedule?create=1"
            className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-jade-accent px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white shadow-[3px_3px_0_0_var(--jade-ink)]"
          >
            + Open new table
          </Link>
        </div>
      </div>

      <div className="jade-divider relative mt-6" />

      {error ? (
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
          {error}
        </p>
      ) : null}

      {invites.length > 0 ? (
        <section className="relative mt-6 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-accent">
            Pending table invites
          </p>
          <ul className="grid gap-3 lg:grid-cols-2">
            {invites.map((invite) => {
              const wind = windKey(invite.wind)
              const busy = inviteBusyId === invite.id
              return (
                <li
                  key={invite.id}
                  className="jade-card-accent flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-jade-accent px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white">
                        <span className="jade-live-pulse size-1.5 rounded-full bg-white" />
                        Invited
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {WIND_META[wind].badge} {WIND_META[wind].label}
                      </span>
                    </div>
                    <h2 className="mt-2 truncate font-serif text-2xl leading-none">
                      {invite.sessionTitle}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Invited by {invite.inviterName} · {boardLabel(invite.boardType)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void respondInvite(invite, "accept")}
                      className="tap-press inline-flex h-10 items-center rounded-full bg-jade-accent px-4 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "Joining…" : "Accept & Join"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void respondInvite(invite, "decline")}
                      className="tap-press inline-flex h-10 items-center rounded-full border border-[#102A20]/15 bg-white px-3.5 text-xs font-medium disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {tables.length === 0 ? (
        <div className="jade-card relative mt-8 px-5 py-10">
          <p className="font-serif text-3xl">No tables live right now.</p>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Launch a table from Schedule or start a new session. Finished
            games leave this list and update the leaderboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/schedule?create=1"
              className="scan-cta-accent inline-flex h-11 items-center px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              Start a table →
            </Link>
            <Link
              href="/schedule"
              className="inline-flex h-11 items-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              Schedule
            </Link>
          </div>
        </div>
      ) : (
        <ul className="relative mt-8 grid gap-5 lg:grid-cols-2">
          {tables.map((table) => {
            const elapsed = formatElapsed(now - new Date(table.startedAt).getTime())
            return (
              <li key={table.id} className="jade-card flex flex-col p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 border-[2px] border-jade-accent bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                      <span className="jade-live-pulse size-1.5 rounded-full bg-jade-accent" />
                      Live
                    </span>
                    <span className="border border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                      {boardLabel(table.boardType)}
                    </span>
                    <span className="border border-jade-ink bg-muted px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                      {table.seatCount}-seat
                    </span>
                    {table.isCaptain ? (
                      <span className="border border-jade-gold bg-jade-gold px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
                        Captain
                      </span>
                    ) : null}
                  </div>
                  <span className="font-mono text-sm tabular-nums">{elapsed}</span>
                </div>

                <h2 className="mt-4 font-serif text-3xl leading-none">
                  {table.title}
                </h2>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Captain {table.captainName} · Hand #{table.handCount + 1} ·{" "}
                  {table.handCount} filed
                </p>

                <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {table.seats.map((seat) => {
                    const wind = windKey(seat.wind)
                    return (
                      <li
                        key={seat.id}
                        className="border border-jade-ink/40 bg-parchment px-2 py-2"
                      >
                        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                          {WIND_META[wind].badge} {WIND_META[wind].label}
                        </p>
                        <p className="mt-0.5 truncate font-serif text-lg leading-none">
                          {seat.nickname}
                        </p>
                        <p
                          className={cn(
                            "mt-1 font-mono text-xs",
                            seat.netPoints > 0 && "text-jade-accent",
                            seat.netPoints < 0 && "text-jade-red",
                          )}
                        >
                          {formatSignedPoints(seat.netPoints)}
                        </p>
                      </li>
                    )
                  })}
                </ul>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/session/live?id=${encodeURIComponent(table.id)}`}
                    className="scan-cta-accent inline-flex h-11 flex-1 items-center justify-center px-4 font-mono text-[11px] uppercase tracking-[0.16em] sm:flex-none"
                  >
                    Open table →
                  </Link>
                  {table.meetId ? (
                    <Link
                      href="/schedule"
                      className="inline-flex h-11 items-center border-[2px] border-jade-ink bg-card px-3 font-mono text-[10px] uppercase tracking-[0.14em]"
                    >
                      Meet booking
                    </Link>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
