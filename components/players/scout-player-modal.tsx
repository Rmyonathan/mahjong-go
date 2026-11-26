"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Sparkles, X } from "lucide-react"

import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import { formatSignedPoints } from "@/lib/mock/jade-board"

type ScoutPayload = {
  isPro: boolean
  player: {
    id: string
    name: string
    nickname: string
    initials: string
    district: string
  }
  skillRating: number
  skillTierName: string
  experienceLevelNumber: number
  experienceBandTitle: string
  games: number
  winRateLabel: string
  playstyle: {
    id: string
    name: string
    summary: string
  }
  scouting: {
    selfDraw: number
    discardWins: number
    dealtIn: number
    selfDrawPct: number
    discardPct: number
    fanDna: { label: string; count: number; totalFan: number }[]
    nemesis: { name: string; points: number; hands: number } | null
    victim: { name: string; points: number; hands: number } | null
  } | null
}

export function ScoutPlayerModal({
  playerId,
  onClose,
  accountName,
}: {
  playerId: string | null
  onClose: () => void
  accountName?: string
}) {
  const [data, setData] = useState<ScoutPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proOpen, setProOpen] = useState(false)

  useEffect(() => {
    if (!playerId) {
      setData(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    void fetch(`/api/players/${encodeURIComponent(playerId)}/scout`)
      .then(async (res) => {
        const ct = res.headers.get("content-type") ?? ""
        if (!res.ok || !ct.includes("application/json")) {
          throw new Error("Could not load scouting report")
        }
        return (await res.json()) as ScoutPayload
      })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load scouting report",
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [playerId])

  if (!playerId) return null

  return (
    <>
      <div className="fixed inset-0 z-[78] flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          aria-label="Close scouting report"
          className="absolute inset-0 bg-jade-ink/55 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Opponent Scouting Report"
          className="relative z-10 flex max-h-[min(90dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[#102A20]/15 bg-parchment shadow-[0_24px_60px_-20px_rgba(16,42,32,0.45)] sm:rounded-2xl sm:border-[2px] sm:border-jade-ink sm:shadow-[8px_8px_0_0_var(--jade-ink)]"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#102A20]/10 px-4 py-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-jade-accent">
                Pre-game scouting
              </p>
              <h2 className="font-serif text-2xl">Opponent Report</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-9 place-items-center rounded-full border border-[#102A20]/15 bg-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
            {loading ? (
              <p className="py-8 text-center font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Scouting player…
              </p>
            ) : error || !data ? (
              <p className="rounded-xl bg-jade-red/10 px-3 py-2 text-sm text-jade-red">
                {error ?? "Scouting report unavailable"}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-2xl border border-[#102A20]/10 bg-white p-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-jade-ink bg-jade-gold font-mono text-sm font-semibold">
                    {data.player.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif text-2xl leading-none">
                      {data.player.name}
                    </h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {data.player.nickname} · LV {data.experienceLevelNumber} ·{" "}
                      {data.skillTierName} ({data.skillRating})
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#102A20]/10 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Playstyle
                    </span>
                    <span className="rounded-full bg-jade-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-accent">
                      {data.playstyle.name}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {data.playstyle.summary}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {data.games} games · Win rate {data.winRateLabel}
                  </p>
                </div>

                {data.scouting ? (
                  <>
                    <div className="rounded-2xl border border-[#102A20]/10 bg-white p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Win-method ratio
                      </p>
                      <div className="mt-2 flex h-3 overflow-hidden rounded-full border border-jade-ink/30 bg-parchment">
                        <div
                          className="bg-jade-accent"
                          style={{ width: `${data.scouting.selfDrawPct}%` }}
                        />
                        <div
                          className="bg-jade-ink"
                          style={{ width: `${data.scouting.discardPct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em]">
                        <span className="text-jade-accent">
                          Self-draw {data.scouting.selfDrawPct}% (
                          {data.scouting.selfDraw})
                        </span>
                        <span>
                          Discard {data.scouting.discardPct}% (
                          {data.scouting.discardWins})
                        </span>
                      </div>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red">
                        Dealt in: {data.scouting.dealtIn} times
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#102A20]/10 bg-white p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Fan DNA · Signature combos
                      </p>
                      {data.scouting.fanDna.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No winning hands logged yet.
                        </p>
                      ) : (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {data.scouting.fanDna.slice(0, 6).map((combo) => (
                            <li
                              key={combo.label}
                              className="rounded-full border border-jade-accent/25 bg-jade-soft/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-jade-ink"
                            >
                              {combo.label} ×{combo.count}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {data.scouting.nemesis || data.scouting.victim ? (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl border border-jade-red/30 bg-white p-3">
                          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-jade-red">
                            Their nemesis
                          </p>
                          <p className="mt-1 truncate font-serif text-base">
                            {data.scouting.nemesis?.name ?? "—"}
                          </p>
                          {data.scouting.nemesis ? (
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {formatSignedPoints(-data.scouting.nemesis.points)}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-jade-accent/30 bg-white p-3">
                          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-jade-accent">
                            Top victim
                          </p>
                          <p className="mt-1 truncate font-serif text-base">
                            {data.scouting.victim?.name ?? "—"}
                          </p>
                          {data.scouting.victim ? (
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {formatSignedPoints(data.scouting.victim.points)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-2xl border border-jade-gold/40 bg-jade-gold/10 p-4 text-center">
                    <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-jade-gold">
                      <Sparkles className="size-3" aria-hidden />
                      Pro Scouting Locked
                    </p>
                    <p className="mt-1.5 text-sm text-jade-ink">
                      Upgrade to Jade Pro to view opponents&apos; Fan DNA,
                      win-method ratios, and deal-in habits before sitting.
                    </p>
                    <button
                      type="button"
                      onClick={() => setProOpen(true)}
                      className="tap-press mt-3 inline-flex h-9 items-center rounded-full bg-jade-accent px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white"
                    >
                      Upgrade to Pro · Rp 29k/mo
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-[#102A20]/10 bg-[#F6F4EE]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
            {data ? (
              <Link
                href={`/players/${data.player.id}`}
                onClick={onClose}
                className="tap-press inline-flex h-10 w-full items-center justify-center rounded-full bg-jade-ink font-mono text-[11px] uppercase tracking-[0.16em] text-white"
              >
                Open full profile →
              </Link>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-full items-center justify-center rounded-full border border-[#102A20]/15 bg-white font-mono text-[11px] uppercase tracking-[0.16em]"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
      />
    </>
  )
}
