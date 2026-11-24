import Link from "next/link"
import { redirect } from "next/navigation"

import { DashboardBounties } from "@/components/dashboard/dashboard-bounties"
import { DashboardPuzzleCard } from "@/components/dashboard/dashboard-puzzle-card"
import { SessionHistoryList } from "@/components/session/session-history-list"
import { getSessionUser } from "@/lib/auth"
import { getPlayerProfile } from "@/lib/data/player-profile"
import {
  getLiveSessionsForUser,
  getNextBookedMeet,
  getPersonalSessionHistory,
} from "@/lib/data/session-history"
import { prisma } from "@/lib/db"
import { isProMembership, membershipLabelForUser } from "@/lib/membership"
import { formatSignedPoints } from "@/lib/mock/jade-board"
import { boardLabel } from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Home — Jade Mahjong",
}

export default async function DashboardPage() {
  const session = await getSessionUser()
  if (!session) redirect("/login?next=/dashboard")

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      role: true,
      membershipTier: true,
      proExpiresAt: true,
      playerId: true,
    },
  })
  if (!user) redirect("/login")

  const isPro = isProMembership(user)
  const isClubLeader = user.role === "ADMIN"
  const membershipLabel = membershipLabelForUser(user)
  const firstName = user.name.split(" ")[0] ?? user.name

  const [profile, history, liveSessions, nextMeet] = await Promise.all([
    user.playerId ? getPlayerProfile(user.playerId) : Promise.resolve(null),
    getPersonalSessionHistory(user.id, { isPro }),
    getLiveSessionsForUser(user.id),
    getNextBookedMeet(user.id),
  ])

  const live = liveSessions[0] ?? null
  const seasonPoints = profile?.seasonPoints ?? 0
  const winRate = profile?.winRateLabel ?? "—"
  const games = profile?.games ?? 0
  // Simple streak: consecutive finished sessions with net >= 0 from newest
  const streak = history.visible.reduce((count, row) => {
    if (count === -1) return count
    if (row.netPoints >= 0) return count + 1
    return -1
  }, 0)
  const streakLabel = streak < 0 ? 0 : streak

  return (
    <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      {/* Hero */}
      <section className="jade-card overflow-hidden p-4 sm:p-6">
        <div className="flex w-full min-w-0 flex-col gap-4">
          <div className="w-full min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Member home
            </p>
            <h1 className="mt-2 font-serif text-3xl leading-tight break-words sm:text-5xl">
              Welcome back, {firstName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
                  isClubLeader
                    ? "border-jade-ink bg-jade-ink text-white"
                    : isPro
                      ? "border-jade-gold bg-jade-gold/25 text-jade-ink"
                      : "border-[#102A20]/15 bg-white",
                )}
              >
                {membershipLabel}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {profile ? (
                <>
                  <span className="rounded-full border border-jade-ink bg-parchment px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                    LV {profile.experienceLevelNumber} ·{" "}
                    {profile.experienceBandTitle}
                  </span>
                  <span className="rounded-full border border-jade-accent/40 bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                    {profile.skillTierName} · {profile.skillRating}
                  </span>
                </>
              ) : (
                <Link
                  href="/me"
                  className="rounded-full border border-jade-ink px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  Link player profile →
                </Link>
              )}
            </div>

            {profile ? (
              <div className="mt-4 max-w-md">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    XP · level up
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] sm:text-right">
                    {profile.xpIntoLevel}/{profile.xpForNextLevel} XP
                    {profile.experienceLevelNumber < 100
                      ? ` → LV ${profile.experienceLevelNumber + 1}`
                      : " · max"}
                  </p>
                </div>
                <div className="mt-1.5 h-2.5 border-[2px] border-jade-ink bg-parchment">
                  <div
                    className="h-full bg-jade-accent transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, profile.pctToNextLevel))}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {profile.experienceXp} XP total ·{" "}
                  <Link href="/levels" className="underline underline-offset-2">
                    all ranks
                  </Link>
                </p>
              </div>
            ) : null}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              href="/schedule"
              className="inline-flex h-10 items-center justify-center rounded-full bg-jade-accent px-3 text-center text-xs font-semibold text-white sm:px-4 sm:text-sm"
            >
              Book next seat
            </Link>
            <Link
              href="/schedule?create=1"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#102A20]/15 bg-white px-3 text-center text-xs font-semibold sm:px-4 sm:text-sm"
            >
              Open table
            </Link>
            <Link
              href="/scan"
              className="col-span-2 inline-flex h-10 items-center justify-center rounded-full border border-[#102A20]/15 bg-white px-3 text-center text-xs font-semibold sm:col-span-1 sm:px-4 sm:text-sm"
            >
              Scan hand
            </Link>
          </div>
        </div>
      </section>

      {/* Active / next up */}
      <section className="mt-5">
        {live ? (
          <Link
            href={`/session/live?id=${encodeURIComponent(live.id)}`}
            className="jade-card-accent tap-press flex flex-wrap items-center justify-between gap-3 p-5"
          >
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                ● Live now
              </p>
              <h2 className="mt-1 font-serif text-3xl leading-none">
                {live.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {boardLabel(live.boardType)} · seat wind {live.wind}
              </p>
            </div>
            <span className="inline-flex h-11 items-center rounded-full bg-jade-ink px-4 text-sm font-semibold text-white">
              Resume live table →
            </span>
          </Link>
        ) : nextMeet ? (
          <Link
            href="/schedule"
            className="jade-card tap-press flex flex-wrap items-center justify-between gap-3 p-5"
          >
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Next booked meet
              </p>
              <h2 className="mt-1 font-serif text-3xl leading-none">
                {nextMeet.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {new Date(nextMeet.startsAt).toLocaleString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {nextMeet.seatNumber
                  ? ` · Seat #${nextMeet.seatNumber}`
                  : ""}{" "}
                · {nextMeet.location}
              </p>
            </div>
            <span className="inline-flex h-11 items-center rounded-full border border-[#102A20]/15 bg-white px-4 text-sm font-semibold">
              View schedule →
            </span>
          </Link>
        ) : (
          <div className="jade-card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Next up
              </p>
              <h2 className="mt-1 font-serif text-3xl leading-none">
                No seat booked
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Grab the next open club session before it fills.
              </p>
            </div>
            <Link
              href="/schedule"
              className="inline-flex h-11 items-center rounded-full bg-jade-accent px-4 text-sm font-semibold text-white"
            >
              Browse schedule →
            </Link>
          </div>
        )}
      </section>

      {/* Quick stats */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Season net"
          value={formatSignedPoints(seasonPoints)}
          tone={seasonPoints >= 0 ? "good" : "bad"}
        />
        <StatCard label="Win rate" value={winRate} />
        <StatCard label="Games played" value={String(games)} />
        <StatCard label="Current streak" value={`${streakLabel}`} />
      </section>

      {/* Daily engagement */}
      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <DashboardPuzzleCard />
        <DashboardBounties />
      </section>

      {/* Session history */}
      <div className="mt-8">
        <SessionHistoryList
          history={history}
          accountName={user.name}
          seeAllHref={
            user.playerId ? `/players/${user.playerId}/sessions` : undefined
          }
        />
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "good" | "bad"
}) {
  return (
    <div className="jade-card px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-xl font-semibold",
          tone === "good" && "text-jade-accent",
          tone === "bad" && "text-jade-red",
        )}
      >
        {value}
      </p>
    </div>
  )
}
