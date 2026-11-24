import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Calculator, Layers, Puzzle } from "lucide-react"

import { getSessionUser } from "@/lib/auth"
import { getDbBoardStandings } from "@/lib/data/board"
import { formatSignedPoints, winRateLabel } from "@/lib/mock/jade-board"
import { boardLabel, formatFeeIdr } from "@/lib/schedule/types"
import { listUpcomingMeets } from "@/lib/schedule/meet-service"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Jade Mahjong — Bandar Lampung",
  description:
    "Bandar Lampung's Mahjong social house — weekly tables, house scoring, beginners welcome.",
}

export default async function Home() {
  const user = await getSessionUser()
  if (user) redirect("/dashboard")

  const [meets, standings] = await Promise.all([
    listUpcomingMeets(null),
    getDbBoardStandings("advanced"),
  ])

  const nextMeet = meets[0] ?? null
  const podium = standings.slice(0, 3)

  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 top-4 select-none font-serif text-[11rem] leading-none text-jade-ink/[0.06] sm:text-[15rem]"
      >
        玉
      </span>

      {/* Hero */}
      <section className="relative max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Bandar Lampung · Social house
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
          Jade Mahjong — Pull Up a Chair
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Weekly tables, house scoring, and a kedai wall that actually remembers
          who won. Browse freely — sign in when you want a seat.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/schedule"
            className="tap-press inline-flex h-12 items-center rounded-full bg-jade-accent px-6 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(22,121,76,0.7)]"
          >
            Browse Schedule
          </Link>
          <Link
            href="/login?tab=register"
            className="tap-press inline-flex h-12 items-center rounded-full border border-[#102A20]/15 bg-white/80 px-6 text-sm font-semibold text-jade-ink"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Next meet */}
      <section className="relative mt-14" aria-label="Next upcoming meet">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-serif text-3xl">Next table</h2>
          <Link
            href="/schedule"
            className="inline-flex items-center gap-1 text-sm font-semibold text-jade-accent"
          >
            Full schedule
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {nextMeet ? (
          <article className="rounded-[1.35rem] border border-[#102A20]/10 bg-white/90 p-5 shadow-[0_20px_50px_-28px_rgba(16,42,32,0.35)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {nextMeet.dateLabel} · {nextMeet.startTime}–{nextMeet.endTime}
                </p>
                <h3 className="mt-2 font-serif text-3xl leading-none">
                  {nextMeet.title}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  {nextMeet.location} · {boardLabel(nextMeet.boardType)} ·{" "}
                  {formatFeeIdr(nextMeet.feeIdr)}
                </p>
              </div>
              <div className="rounded-2xl bg-jade-soft px-4 py-3 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-jade-accent">
                  Seats
                </p>
                <p className="mt-1 font-mono text-2xl text-jade-ink">
                  {nextMeet.seatsFilled}/{nextMeet.maxSeats}
                </p>
              </div>
            </div>

            {nextMeet.roster.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {nextMeet.roster.slice(0, 8).map((player) => (
                  <li
                    key={player.bookingId}
                    className="rounded-full border border-[#102A20]/10 bg-[#F6F4EE] px-3 py-1 text-xs font-medium text-jade-ink"
                  >
                    {player.nickname}
                  </li>
                ))}
                {nextMeet.roster.length > 8 ? (
                  <li className="rounded-full px-3 py-1 text-xs text-muted-foreground">
                    +{nextMeet.roster.length - 8} more
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                No seats claimed yet — be the first.
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/login?next=${encodeURIComponent("/schedule")}`}
                className="tap-press inline-flex h-11 items-center rounded-full bg-jade-accent px-5 text-sm font-semibold text-white"
              >
                Sign in to book a seat
              </Link>
              <Link
                href="/schedule"
                className="tap-press inline-flex h-11 items-center rounded-full border border-[#102A20]/12 px-5 text-sm font-medium text-jade-ink"
              >
                See who&apos;s going
              </Link>
            </div>
          </article>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-[#102A20]/20 bg-white/60 px-5 py-8 text-sm text-muted-foreground">
            No open meets posted yet. Check back soon — hosts drop Friday and
            Saturday tables here.
          </div>
        )}
      </section>

      {/* Quick explore */}
      <section className="relative mt-14" aria-label="Explore">
        <h2 className="font-serif text-3xl">Try the house tools</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          No account needed — play a WWYD, score a hand, or skim the combo book.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <ExploreCard
            href="/puzzle"
            icon={Puzzle}
            title="Daily WWYD"
            subtitle="What would you discard today?"
          />
          <ExploreCard
            href="/scan"
            icon={Calculator}
            title="HKOS Calculator"
            subtitle="Build tiles and tally Fan"
          />
          <ExploreCard
            href="/combos"
            icon={Layers}
            title="Combos & ranks"
            subtitle="Patterns and the XP ladder"
          />
        </div>
      </section>

      {/* Top 3 */}
      <section className="relative mt-14 mb-6" aria-label="Club leaders">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-serif text-3xl">Club leaders</h2>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1 text-sm font-semibold text-jade-accent"
          >
            View full leaderboard
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {podium.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No standings yet — finish a scored session to light up the wall.
          </p>
        ) : (
          <ol className="grid gap-3 sm:grid-cols-3">
            {podium.map((row, index) => (
              <li
                key={row.playerId}
                className={cn(
                  "rounded-2xl border border-[#102A20]/10 bg-white/90 p-4",
                  index === 0 && "border-jade-gold/40 bg-gradient-to-br from-jade-gold/10 to-white",
                )}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  #{String(row.rank).padStart(2, "0")}
                </p>
                <p className="mt-2 truncate font-serif text-2xl leading-none">
                  {row.player.name}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {winRateLabel(row.winRate)} · {row.skillTier.name}
                </p>
                <p className="mt-3 font-mono text-lg text-jade-accent">
                  {formatSignedPoints(row.points)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}

function ExploreCard({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string
  icon: typeof Puzzle
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="tap-press group rounded-2xl border border-[#102A20]/10 bg-white/90 p-5 shadow-[0_12px_32px_-20px_rgba(16,42,32,0.35)] transition hover:-translate-y-0.5"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-jade-soft text-jade-accent">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 font-serif text-xl leading-none">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-jade-accent">
        Open
        <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
