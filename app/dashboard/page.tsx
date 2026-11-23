"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { cn } from "@/lib/utils"

type BountyRow = {
  key: string
  title: string
  blurb: string
  xp: number
  howTo: string
  bountyId: string
  claimed: boolean
  eligible: boolean
  reason: string
}

type XpProgressPayload = {
  xp: number
  level: number
  bandTitle: string
  bandRange: string
  experienceLevelName: string
  xpIntoLevel: number
  xpForNextLevel: number
  pctToNext: number
  nextBandTitle: string | null
  xpToNextBand: number | null
}

export default function DashboardPage() {
  const [weekKey, setWeekKey] = useState("")
  const [bounties, setBounties] = useState<BountyRow[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [name, setName] = useState("")
  const [progress, setProgress] = useState<XpProgressPayload | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [bountyRes, xpRes] = await Promise.all([
      fetch("/api/bounty"),
      fetch("/api/xp/me"),
    ])
    if (bountyRes.ok) {
      const data = (await bountyRes.json()) as {
        weekKey: string
        loggedIn: boolean
        bounties: BountyRow[]
      }
      setWeekKey(data.weekKey)
      setBounties(data.bounties)
      setLoggedIn(data.loggedIn)
    }
    if (xpRes.ok) {
      const data = (await xpRes.json()) as {
        user?: { name?: string } | null
        progress?: XpProgressPayload | null
      }
      if (data.user?.name) setName(data.user.name)
      setProgress(data.progress ?? null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function claim(key: string) {
    if (!loggedIn) {
      window.location.href = `/login?next=${encodeURIComponent("/dashboard")}`
      return
    }
    setPendingKey(key)
    setError(null)
    try {
      const response = await fetch("/api/bounty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Claim failed")
        return
      }
      await refresh()
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Weekdays · retention hub
      </p>
      <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9]">
        {name ? `Hey ${name.split(" ")[0]}` : "Dashboard"}
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Open Jade Mon–Thu: daily WWYD, coaching film, and weekly bounties that
        pay XP toward your house pangkat.
      </p>

      {progress ? (
        <section className="jade-card mt-8 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Rank · XP curve
              </p>
              <h2 className="mt-1 font-serif text-3xl leading-none">
                LV {progress.level} · {progress.bandTitle}
              </h2>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                {progress.experienceLevelName} · {progress.bandRange} ·{" "}
                {progress.xp} XP
              </p>
            </div>
            <Link
              href="/levels"
              className="font-mono text-[10px] uppercase tracking-[0.14em] underline-offset-2 hover:underline"
            >
              Full ladder →
            </Link>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em]">
              <span>
                {progress.level >= 100
                  ? "Max level"
                  : `${progress.xpIntoLevel} / ${progress.xpForNextLevel} XP to LV ${progress.level + 1}`}
              </span>
              <span>{progress.pctToNext}%</span>
            </div>
            <div className="h-3 border-[2px] border-jade-ink bg-parchment">
              <div
                className="h-full bg-jade-accent transition-all"
                style={{ width: `${progress.pctToNext}%` }}
              />
            </div>
            {progress.nextBandTitle && progress.xpToNextBand != null ? (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {progress.xpToNextBand} XP to {progress.nextBandTitle}
              </p>
            ) : null}
          </div>
        </section>
      ) : loggedIn ? (
        <section className="jade-card mt-8 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Link a player profile to track pangkat XP
          </p>
          <Link
            href="/me"
            className="mt-3 inline-flex font-mono text-[11px] uppercase tracking-[0.14em] underline-offset-2 hover:underline"
          >
            Complete profile →
          </Link>
        </section>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <DashLink href="/puzzle" label="Daily WWYD" hint="Vote · Pro coach note" />
        <DashLink href="/coaching" label="Coaching" hint="Reels · hand audit" />
        <DashLink href="/schedule" label="Book a table" hint="Early-bird seats" />
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl uppercase">Weekly bounty board</h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {weekKey || "…"} · auto-checked from finished tables
            </p>
          </div>
        </div>

        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {bounties.map((bounty, index) => {
            const canClaim = bounty.eligible && !bounty.claimed
            return (
              <li key={bounty.key} className="jade-card flex flex-col p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Quest {String(index + 1).padStart(2, "0")} · +{bounty.xp} XP
                </p>
                <h3 className="mt-2 font-serif text-2xl leading-none">
                  {bounty.title}
                </h3>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">
                  {bounty.blurb}
                </p>
                <p
                  className={cn(
                    "mt-3 font-mono text-[10px] uppercase tracking-[0.12em]",
                    bounty.eligible || bounty.claimed
                      ? "text-jade-accent"
                      : "text-muted-foreground",
                  )}
                >
                  {bounty.claimed
                    ? "Claimed this week"
                    : bounty.eligible
                      ? "Eligible · claim XP"
                      : bounty.reason}
                </p>
                <button
                  type="button"
                  disabled={!canClaim || pendingKey === bounty.key}
                  onClick={() => claim(bounty.key)}
                  className={cn(
                    "mt-4 inline-flex h-10 w-full items-center justify-center border-[2px] border-jade-ink font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-50",
                    bounty.claimed
                      ? "bg-jade-accent text-white"
                      : canClaim
                        ? "bg-jade-gold text-jade-ink"
                        : "bg-card",
                  )}
                >
                  {bounty.claimed
                    ? "Claimed"
                    : pendingKey === bounty.key
                      ? "Claiming…"
                      : canClaim
                        ? "Claim XP"
                        : "Locked"}
                </button>
              </li>
            )
          })}
        </ol>
        {error ? (
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
            {error}
          </p>
        ) : null}
      </section>

      <section className="jade-card-accent mt-10 p-5">
        <h2 className="font-serif text-2xl">Why Pro stays open midweek</h2>
        <ul className="mt-3 space-y-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <li>★ WWYD coach note + shanten ladder every morning</li>
          <li>★ Strategy clips in Coaching</li>
          <li>★ Full session archive for hand audits</li>
        </ul>
        <Link
          href="/puzzle"
          className="scan-cta-accent mt-4 inline-flex h-11 items-center justify-center rounded-none px-4 font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          Play today&apos;s puzzle
        </Link>
      </section>
    </main>
  )
}

function DashLink({
  href,
  label,
  hint,
}: {
  href: string
  label: string
  hint: string
}) {
  return (
    <Link
      href={href}
      className="jade-card block px-4 py-4 transition hover:translate-x-px hover:translate-y-px hover:shadow-none"
    >
      <p className="font-serif text-2xl leading-none">{label}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {hint}
      </p>
    </Link>
  )
}
