"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"

import { TournamentBracketTab } from "@/components/tournaments/tournament-bracket-tab"
import { TournamentStaffPanel } from "@/components/tournaments/tournament-staff-panel"
import {
  canAdministerTournament,
  canLogTournamentHands,
} from "@/lib/tournaments/staff"
import { TournamentHandHistoryTab } from "@/components/tournaments/tournament-hand-history-tab"
import { TournamentTablesTab } from "@/components/tournaments/tournament-tables-tab"
import { TournamentRulesReplace } from "@/components/tournaments/tournament-rules-replace"
import { TournamentStandingsTab } from "@/components/tournaments/tournament-standings-tab"
import {
  formatTournamentFeeIdr,
  tournamentFormatLabel,
  tournamentStatusLabel,
  type ApiTournamentDetail,
} from "@/lib/tournaments/types"
import { cn } from "@/lib/utils"

type TabId = "standings" | "tables" | "bracket" | "history" | "rules"

type AuthUser = { id: string; role?: "ADMIN" | "MEMBER" }

const TAB_QUERY_VALUES: TabId[] = [
  "standings",
  "tables",
  "bracket",
  "history",
  "rules",
]

function TournamentDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = typeof params.id === "string" ? params.id : ""
  const [tournament, setTournament] = useState<ApiTournamentDetail | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>("standings")
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const response = await fetch(`/api/tournaments/${id}`)
      const data = (await response.json()) as {
        tournament?: ApiTournamentDetail
        error?: string
      }
      if (!response.ok) {
        setError(data.error ?? "Could not load tournament")
        setTournament(null)
        return
      }
      setTournament(data.tournament ?? null)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const fromQuery = searchParams.get("tab")
    if (
      fromQuery &&
      TAB_QUERY_VALUES.includes(fromQuery as TabId)
    ) {
      setTab(fromQuery as TabId)
    }
  }, [searchParams])

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

  const canAdminister = Boolean(
    user &&
      tournament &&
      canAdministerTournament(
        user.id,
        user.role ?? "MEMBER",
        tournament.createdById,
        tournament.panitiaUserIds ?? [],
      ),
  )
  const canLogHands = Boolean(
    user &&
      tournament &&
      canLogTournamentHands(user.id, user.role ?? "MEMBER", {
        createdById: tournament.createdById,
        panitiaUserIds: tournament.panitiaUserIds ?? [],
        wasitUserIds: tournament.wasitUserIds ?? [],
      }),
  )

  async function handleRegister() {
    if (!id) return
    setActionPending(true)
    setActionError(null)
    try {
      const response = await fetch(`/api/tournaments/actions/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: id }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setActionError(data.error ?? "Registration failed")
        return
      }
      await refresh()
    } catch {
      setActionError("Network error")
    } finally {
      setActionPending(false)
    }
  }

  async function handleRevive(entryId: string) {
    if (!id) return
    setActionPending(true)
    setActionError(null)
    try {
      const response = await fetch(`/api/tournaments/actions/revive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: id, entryId }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setActionError(data.error ?? "Revival failed")
        return
      }
      await refresh()
    } catch {
      setActionError("Network error")
    } finally {
      setActionPending(false)
    }
  }

  const revivalSummary = tournament
    ? tournament.revivalEnabled
      ? `Revival open · ${formatTournamentFeeIdr(tournament.revivalFeeIdr)} · ${tournament.totalRevivalSlotsUsed} slot${tournament.totalRevivalSlotsUsed === 1 ? "" : "s"} · pool ${formatTournamentFeeIdr(tournament.revivalBuyInPoolIdr)}`
      : "Revivals off"
    : ""

  const tabs: {
    id: TabId
    label: string
    shortLabel: string
  }[] = [
    { id: "standings", label: "Standings & roster", shortLabel: "Roster" },
    { id: "tables", label: "Live tables", shortLabel: "Tables" },
    { id: "bracket", label: "Knockout / bracket", shortLabel: "Bracket" },
    {
      id: "history",
      label:
        tournament?.format === "KNOCKOUT" ||
        tournament?.format === "HYBRID_KO"
          ? "Sessions & hands"
          : "Hand history",
      shortLabel: "History",
    },
    { id: "rules", label: "Rules PDF", shortLabel: "Rules" },
  ]

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Loading tournament…
        </p>
      </main>
    )
  }

  if (error || !tournament) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-jade-red">
          {error ?? "Not found"}
        </p>
        <Link
          href="/tournaments"
          className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent"
        >
          ← All tournaments
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6 sm:py-10">
      <Link
        href="/tournaments"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent"
      >
        ← Tournaments
      </Link>

      <header className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[#102A20]/12 bg-[#F6F4EE] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
            {tournamentFormatLabel(tournament.format)}
          </span>
          <span className="rounded-full border border-jade-accent/30 bg-jade-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
            {tournamentStatusLabel(tournament.status)}
          </span>
        </div>
        <h1 className="font-serif text-3xl uppercase leading-[0.95] tracking-tight sm:text-5xl">
          {tournament.title}
        </h1>
        {tournament.subtitle ? (
          <p className="text-muted-foreground">{tournament.subtitle}</p>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="jade-card px-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Registration fee
            </dt>
            <dd className="mt-1 font-serif text-xl">
              {formatTournamentFeeIdr(tournament.entryFeeIdr)}
            </dd>
          </div>
          <div className="jade-card px-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Prize pool
            </dt>
            <dd className="mt-1 text-sm">
              {tournament.prizePoolText || "TBA"}
            </dd>
          </div>
          <div className="jade-card px-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Participants
            </dt>
            <dd className="mt-1 font-mono text-lg">
              {tournament.entryCount} / {tournament.maxPlayers}
            </dd>
          </div>
          <div className="jade-card px-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Revival pool
            </dt>
            <dd className="mt-1 text-xs leading-relaxed">{revivalSummary}</dd>
          </div>
        </dl>
      </header>

      <TournamentStaffPanel
        tournament={tournament}
        canEdit={canAdminister}
        onUpdated={() => void refresh()}
      />

      <div className="jade-divider mt-8" />

      <div
        role="tablist"
        className="mt-6 -mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto rounded-2xl border border-[#102A20]/10 bg-white p-1 px-1 sm:mx-0 sm:rounded-full"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-label={item.label}
            onClick={() => setTab(item.id)}
            className={cn(
              "snap-start shrink-0 rounded-full px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] sm:px-4 sm:text-[10px] sm:tracking-[0.12em]",
              tab === item.id
                ? "bg-jade-ink text-white"
                : "text-muted-foreground",
            )}
          >
            <span className="sm:hidden">{item.shortLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "standings" ? (
          <TournamentStandingsTab
            tournament={tournament}
            userId={user?.id ?? null}
            isAdmin={isAdmin}
            canAdminister={canAdminister}
            onRevive={handleRevive}
            onRegister={handleRegister}
            onRefresh={() => void refresh()}
            actionPending={actionPending}
            actionError={actionError}
          />
        ) : null}
        {tab === "tables" ? (
          <TournamentTablesTab
            tournament={tournament}
            canAdminister={canAdminister}
            canLogHands={canLogHands}
            onRefresh={() => void refresh()}
          />
        ) : null}
        {tab === "bracket" ? (
          <TournamentBracketTab tournament={tournament} />
        ) : null}
        {tab === "history" ? (
          <TournamentHandHistoryTab tournament={tournament} />
        ) : null}
        {tab === "rules" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Official{" "}
              <span className="font-semibold text-foreground">Zung Jung</span>{" "}
              tournament rules or your club&apos;s house PDF. Read before
              registration and revival buy-ins.
            </p>
            <TournamentRulesReplace
              tournamentId={tournament.id}
              rulesPdfUrl={tournament.rulesPdfUrl}
              rulesPdfName={tournament.rulesPdfName}
              canEdit={canAdminister}
              onUpdated={() => void refresh()}
            />
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default function TournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Loading…
          </p>
        </main>
      }
    >
      <TournamentDetailInner />
    </Suspense>
  )
}