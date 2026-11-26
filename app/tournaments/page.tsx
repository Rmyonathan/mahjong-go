"use client"

import Link from "next/link"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"

import { JadePageLoader } from "@/components/jade-page-loader"
import { CreateTournamentModal } from "@/components/tournaments/create-tournament-modal"
import { TournamentRulesPdfPanel } from "@/components/tournaments/tournament-rules-pdf-panel"
import {
  formatTournamentFeeIdr,
  tournamentFormatLabel,
  tournamentStatusLabel,
  type ApiTournamentListItem,
  type ApiTournamentStatus,
} from "@/lib/tournaments/types"
import { cn } from "@/lib/utils"

type AuthUser = { role?: "ADMIN" | "MEMBER" }

function TournamentsPageInner() {
  const [tournaments, setTournaments] = useState<ApiTournamentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [rulesOpenId, setRulesOpenId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch("/api/tournaments")
      const data = (await response.json()) as {
        tournaments?: ApiTournamentListItem[]
        error?: string
      }
      if (!response.ok) {
        setError(data.error ?? "Could not load tournaments")
        return
      }
      setTournaments(data.tournaments ?? [])
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    void fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return null
        const data = (await response.json()) as { user?: AuthUser | null }
        return data.user ?? null
      })
      .then(setUser)
      .catch(() => setUser(null))
  }, [refresh])

  const isAdmin = user?.role === "ADMIN"

  const grouped = useMemo(() => {
    const order: ApiTournamentStatus[] = [
      "REGISTRATION",
      "LIVE",
      "COMPLETED",
    ]
    return order.map((status) => ({
      status,
      items: tournaments.filter((t) => t.status === status),
    }))
  }, [tournaments])

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            House events
          </p>
          <h1 className="mt-2 font-serif text-4xl uppercase leading-[0.92] tracking-tight sm:text-5xl">
            Tournaments
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Registration, live boards, and revival slots — Zung Jung style rules
            PDF on every event.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="tap-press inline-flex h-11 items-center rounded-full bg-jade-accent px-5 text-sm font-semibold text-white"
          >
            + Create tournament
          </button>
        ) : null}
      </div>

      <div className="jade-divider mt-6" />

      {loading ? (
        <JadePageLoader
          kanji="盃"
          label="Loading tournaments…"
          className="py-12"
        />
      ) : null}
      {error ? (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.16em] text-jade-red">
          {error}
        </p>
      ) : null}

      {!loading && tournaments.length === 0 ? (
        <div className="jade-card mt-8 px-5 py-10">
          <p className="font-serif text-3xl">No tournaments yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAdmin
              ? "Create the first house open with rules PDF and prize pool."
              : "Check back — club opens registration before each major."}
          </p>
        </div>
      ) : null}

      {grouped.map(
        (section) =>
          section.items.length > 0 && (
            <section key={section.status} className="mt-8">
              <h2 className="font-serif text-2xl uppercase">
                {tournamentStatusLabel(section.status)}
              </h2>
              <ul className="mt-4 grid gap-4 lg:grid-cols-2">
                {section.items.map((t) => (
                  <li key={t.id} className="jade-card flex flex-col p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#102A20]/12 bg-[#F6F4EE] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                        {tournamentFormatLabel(t.format)}
                      </span>
                      <span className="rounded-full border border-jade-accent/30 bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                        {formatTournamentFeeIdr(t.entryFeeIdr)}
                      </span>
                      {t.revivalEnabled ? (
                        <span className="rounded-full border border-jade-gold/40 bg-jade-gold/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                          Revival · {formatTournamentFeeIdr(t.revivalFeeIdr)}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 font-serif text-2xl leading-tight">
                      {t.title}
                    </h3>
                    {t.subtitle ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Prize ·{" "}
                      </span>
                      {t.prizePoolText || "TBA"}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {t.entryCount} / {t.maxPlayers} registered ·{" "}
                      {t.tableCount} tables · round {t.currentRound}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <Link
                        href={`/tournaments/${t.id}`}
                        className="rounded-full bg-jade-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white"
                      >
                        Open hub
                      </Link>
                      {t.rulesPdfUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setRulesOpenId(rulesOpenId === t.id ? null : t.id)
                          }
                          className="rounded-full border border-[#102A20]/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]"
                        >
                          {rulesOpenId === t.id ? "Hide rules" : "Rules PDF"}
                        </button>
                      ) : null}
                      {t.status === "REGISTRATION" ? (
                        <span className="rounded-full bg-jade-soft px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-accent">
                          Register — soon
                        </span>
                      ) : null}
                    </div>
                    {rulesOpenId === t.id && t.rulesPdfUrl ? (
                      <div className="mt-4 border-t border-[#102A20]/10 pt-4">
                        <TournamentRulesPdfPanel
                          rulesPdfUrl={t.rulesPdfUrl}
                          rulesPdfName={t.rulesPdfName}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}

      <CreateTournamentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void refresh()}
      />
    </main>
  )
}

export default function TournamentsPage() {
  return (
    <Suspense
      fallback={
        <JadePageLoader kanji="盃" label="Loading tournaments…" />
      }
    >
      <TournamentsPageInner />
    </Suspense>
  )
}