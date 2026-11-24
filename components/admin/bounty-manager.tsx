"use client"

import { useCallback, useEffect, useState } from "react"

import { cn } from "@/lib/utils"

type Quest = {
  key: string
  title: string
  blurb: string
  xp: number
  howTo: string
}

type CatalogItem = {
  key: string
  title: string
  xpMin: number
  xpMax: number
}

export function BountyManager() {
  const [weekKey, setWeekKey] = useState("")
  const [source, setSource] = useState<"default" | "shuffle" | "ai">("default")
  const [bounties, setBounties] = useState<Quest[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [pending, setPending] = useState<"shuffle" | "reset" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/bounties")
    if (!response.ok) return
    const data = (await response.json()) as {
      weekKey: string
      source: "default" | "shuffle" | "ai"
      bounties: Quest[]
      catalog: CatalogItem[]
    }
    setWeekKey(data.weekKey)
    setSource(data.source)
    setBounties(data.bounties)
    setCatalog(data.catalog ?? [])
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function run(action: "shuffle" | "reset") {
    setPending(action)
    setError(null)
    try {
      const response = await fetch("/api/admin/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = (await response.json()) as {
        error?: string
        bounties?: Quest[]
        source?: "default" | "shuffle" | "ai"
        weekKey?: string
      }
      if (!response.ok) {
        setError(data.error ?? "Request failed")
        return
      }
      if (data.weekKey) setWeekKey(data.weekKey)
      if (data.source) setSource(data.source)
      if (data.bounties) setBounties(data.bounties)
      await refresh()
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Weekly quests · {weekKey || "…"} · {source}
          </p>
          <h2 className="mt-1 font-serif text-3xl">Bounty desk</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            No AI needed — shuffle picks 3 from the verifiable catalog (free,
            instant). Reset restores the default trio. Quests only unlock from
            real finished tables.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending != null}
            onClick={() => void run("shuffle")}
            className="scan-cta-accent inline-flex h-10 items-center px-4 font-mono text-[11px] uppercase tracking-[0.14em] disabled:opacity-50"
          >
            {pending === "shuffle" ? "Shuffling…" : "Shuffle week"}
          </button>
          <button
            type="button"
            disabled={pending != null}
            onClick={() => void run("reset")}
            className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[11px] uppercase tracking-[0.14em] disabled:opacity-50"
          >
            {pending === "reset" ? "Resetting…" : "Reset to default"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
          {error}
        </p>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-3">
        {bounties.map((bounty) => (
          <li key={bounty.key} className="jade-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {bounty.key} · +{bounty.xp} XP
            </p>
            <p className="mt-2 font-serif text-xl leading-none">{bounty.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{bounty.blurb}</p>
          </li>
        ))}
      </ul>

      <div className="jade-card p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Catalog · shuffle picks 3 of these
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {catalog.map((item) => (
            <li
              key={item.key}
              className={cn(
                "border border-jade-ink/20 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em]",
              )}
            >
              {item.key} · {item.title} · {item.xpMin}–{item.xpMax} XP
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
