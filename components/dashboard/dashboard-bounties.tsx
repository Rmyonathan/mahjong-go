"use client"

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

export function DashboardBounties() {
  const [weekKey, setWeekKey] = useState("")
  const [bounties, setBounties] = useState<BountyRow[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const response = await fetch("/api/bounty")
    if (!response.ok) return
    const data = (await response.json()) as {
      weekKey: string
      loggedIn: boolean
      bounties: BountyRow[]
    }
    setWeekKey(data.weekKey)
    setBounties(data.bounties)
    setLoggedIn(data.loggedIn)
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

  const claimed = bounties.filter((b) => b.claimed).length
  const total = Math.max(bounties.length, 1)

  return (
    <section className="jade-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Weekly bounties · {weekKey || "…"}
          </p>
          <h3 className="mt-1 font-serif text-2xl leading-none">
            {claimed}/{bounties.length || 3} completed
          </h3>
        </div>
      </div>
      <div className="mt-3 h-2 border border-jade-ink bg-parchment">
        <div
          className="h-full bg-jade-accent transition-all"
          style={{ width: `${Math.round((claimed / total) * 100)}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {bounties.map((bounty) => {
          const canClaim = bounty.eligible && !bounty.claimed
          return (
            <li
              key={bounty.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#102A20]/08 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{bounty.title}</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  +{bounty.xp} XP ·{" "}
                  {bounty.claimed
                    ? "Claimed"
                    : bounty.eligible
                      ? "Ready"
                      : bounty.reason}
                </p>
              </div>
              <button
                type="button"
                disabled={!canClaim || pendingKey === bounty.key}
                onClick={() => claim(bounty.key)}
                className={cn(
                  "shrink-0 rounded-full border border-jade-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-50",
                  bounty.claimed
                    ? "bg-jade-accent text-white"
                    : canClaim
                      ? "bg-jade-gold"
                      : "bg-card",
                )}
              >
                {bounty.claimed
                  ? "Done"
                  : pendingKey === bounty.key
                    ? "…"
                    : canClaim
                      ? "Claim"
                      : "Locked"}
              </button>
            </li>
          )
        })}
      </ul>
      {error ? (
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
          {error}
        </p>
      ) : null}
    </section>
  )
}
