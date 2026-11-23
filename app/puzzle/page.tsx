"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { TileStrip } from "@/components/jade/tile-strip"
import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import { cn } from "@/lib/utils"

type CommunityRow = {
  discardTileId: string
  count: number
  pct: number
}

type Breakdown = {
  shanten: number
  standardShanten: number
  special: { sevenPairs: number; thirteenOrphans: number }
  options: {
    discardId: string
    discardLabel: string
    shantenAfterDiscard: number
    standardShanten: number
  }[]
}

type PuzzlePayload = {
  puzzle: {
    id: string
    title: string
    tileIds: string[]
    coachName: string
  }
  community: CommunityRow[]
  totalVotes: number
  myVote: string | null
  isPro: boolean
  loggedIn: boolean
  reveal: {
    idealDiscardId: string | null
    coachNote: string | null
    breakdown: Breakdown | null
  } | null
}

export default function PuzzlePage() {
  const [data, setData] = useState<PuzzlePayload | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proOpen, setProOpen] = useState(false)
  const [accountName, setAccountName] = useState("")

  const refresh = useCallback(async () => {
    const response = await fetch("/api/puzzle/today")
    const json = (await response.json()) as PuzzlePayload
    setData(json)
    if (json.myVote) setSelected(json.myVote)
  }, [])

  useEffect(() => {
    void refresh()
    void fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return
        const me = (await r.json()) as { user?: { name?: string } | null }
        if (me.user?.name) setAccountName(me.user.name)
      })
      .catch(() => {})
  }, [refresh])

  async function submitVote() {
    if (!selected || !data) return
    if (!data.loggedIn) {
      window.location.href = `/login?next=${encodeURIComponent("/puzzle")}`
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/puzzle/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discardTileId: selected }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(json.error ?? "Vote failed")
        return
      }
      await refresh()
    } finally {
      setPending(false)
    }
  }

  if (!data) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Loading puzzle…
        </p>
      </main>
    )
  }

  const { puzzle, community, totalVotes, myVote, isPro, reveal } = data
  const uniqueTiles = [...new Set(puzzle.tileIds)]

  return (
    <main className="relative mx-auto w-full max-w-3xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Daily · {puzzle.id}
      </p>
      <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9]">
        What would you discard?
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {puzzle.title} — vote with the club. Pro unlocks shanten math +{" "}
        {puzzle.coachName}&apos;s note.
      </p>

      <section className="jade-card mt-8 p-4 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          14-tile closed hand
        </p>
        <div className="mt-4">
          <TileStrip ids={puzzle.tileIds} size="sm" />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-serif text-2xl">Your discard</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {uniqueTiles.map((id) => {
            const tile = TILE_BY_ID[id]
            if (!tile) return null
            const voted = myVote === id
            const active = selected === id
            return (
              <button
                key={id}
                type="button"
                disabled={Boolean(myVote)}
                onClick={() => setSelected(id)}
                className={cn(
                  "border-[2px] border-jade-ink px-3 py-3 text-left font-mono text-[11px] uppercase tracking-[0.12em]",
                  active || voted
                    ? "bg-jade-ink text-white"
                    : "bg-card hover:bg-muted",
                  myVote && !voted && "opacity-50",
                )}
              >
                {tile.label}
              </button>
            )
          })}
        </div>

        {!myVote ? (
          <button
            type="button"
            disabled={!selected || pending}
            onClick={submitVote}
            className="scan-cta-accent mt-4 inline-flex h-11 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50"
          >
            {pending ? "Saving…" : data.loggedIn ? "Lock vote" : "Login to vote"}
          </button>
        ) : (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
            Vote locked · community below
          </p>
        )}
        {error ? (
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
            {error}
          </p>
        ) : null}
      </section>

      {myVote ? (
        <section className="jade-card mt-8 p-4 sm:p-5">
          <h2 className="font-serif text-2xl">Club votes</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {totalVotes} ballots today
          </p>
          <ul className="mt-4 space-y-3">
            {community.map((row) => (
              <li key={row.discardTileId}>
                <div className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-[0.12em]">
                  <span>{TILE_BY_ID[row.discardTileId]?.label ?? row.discardTileId}</span>
                  <span>{row.pct}%</span>
                </div>
                <div className="mt-1 h-2 border border-jade-ink bg-parchment">
                  <div
                    className="h-full bg-jade-accent"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </li>
            ))}
            {community.length === 0 ? (
              <li className="text-sm text-muted-foreground">Be the first vote.</li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {myVote && isPro && reveal?.breakdown ? (
        <section className="jade-card-accent mt-6 p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
            Pro · {puzzle.coachName}
          </p>
          <h2 className="mt-2 font-serif text-2xl">Coach breakdown</h2>
          <p className="mt-3 text-sm leading-relaxed">{reveal.coachNote}</p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Ideal discard ·{" "}
            {TILE_BY_ID[reveal.idealDiscardId ?? ""]?.label ?? "—"}
          </p>
          <p className="mt-2 font-mono text-sm">
            Hand shanten {reveal.breakdown.shanten} · standard{" "}
            {reveal.breakdown.standardShanten}
          </p>
          <ul className="mt-4 space-y-2 border-t border-jade-accent/30 pt-4">
            {reveal.breakdown.options.map((opt) => (
              <li
                key={opt.discardId}
                className="flex justify-between gap-3 font-mono text-xs uppercase tracking-[0.12em]"
              >
                <span
                  className={cn(
                    opt.discardId === reveal.idealDiscardId && "text-jade-accent",
                  )}
                >
                  Discard {opt.discardLabel}
                </span>
                <span>shanten → {opt.shantenAfterDiscard}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {myVote && !isPro ? (
        <section className="jade-card mt-6 p-4">
          <h2 className="font-serif text-2xl">Pro unlock</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Shanten ladder + {puzzle.coachName}&apos;s note stay behind Pro —
            same math engine as Scan.
          </p>
          <button
            type="button"
            onClick={() => setProOpen(true)}
            className="scan-cta-accent mt-4 inline-flex h-11 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            Upgrade · Rp 29k/mo
          </button>
        </section>
      ) : null}

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <Link href="/dashboard" className="underline-offset-2 hover:underline">
          ← Dashboard
        </Link>
      </p>

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
      />
    </main>
  )
}
