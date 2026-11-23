import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PlayerProfileEditor } from "@/components/players/player-profile-editor"
import { PlayerProTeaser } from "@/components/players/player-pro-teaser"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getPlayerProfile } from "@/lib/data/player-profile"
import { isProMembership } from "@/lib/membership"
import { formatPlainPoints, formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

interface PlayerPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PlayerPageProps): Promise<Metadata> {
  const { id } = await params
  const profile = await getPlayerProfile(id)
  return {
    title: profile
      ? `${profile.player.name} — Jade Mahjong`
      : "Player — Jade Mahjong",
  }
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params
  const [profile, session] = await Promise.all([
    getPlayerProfile(id),
    getSessionUser(),
  ])
  if (!profile) notFound()

  const viewer =
    session != null
      ? await prisma.user.findUnique({
          where: { id: session.id },
          select: {
            name: true,
            role: true,
            membershipTier: true,
            proExpiresAt: true,
          },
        })
      : null
  const viewerIsPro = viewer ? isProMembership(viewer) : false

  const { player } = profile
  const isOwnProfile = session?.playerId === id

  return (
    <main className="relative mx-auto w-full max-w-5xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 top-0 select-none font-serif text-[12rem] leading-none text-jade-ink/[0.07]"
      >
        牌
      </span>

      <Link
        href="/leaderboard"
        className="relative font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        ← Leaderboard
      </Link>

      <article className="jade-card relative mt-6 overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="grid size-20 shrink-0 place-items-center border-[2px] border-jade-ink bg-jade-gold font-mono text-xl shadow-[4px_4px_0_0_var(--jade-ink)]">
            {player.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isOwnProfile ? (
                <span className="border-[2px] border-jade-accent bg-jade-accent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                  Your profile
                </span>
              ) : null}
              <span className="border-[2px] border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                {profile.experienceLevel.name}
              </span>
              <span className="border border-jade-accent bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                {profile.skillTierName}
              </span>
              <span className="border border-jade-ink bg-muted px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                {profile.playstyle.name}
              </span>
            </div>
            <h1 className="mt-3 font-serif text-4xl leading-none sm:text-5xl">
              {player.name}
            </h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {player.nickname} · {player.district} · since {player.memberSince}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {profile.playstyle.summary}
            </p>
            {isOwnProfile ? (
              <PlayerProfileEditor
                playerId={player.id}
                initialName={player.name}
                initialNickname={player.nickname}
              />
            ) : null}
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 border-t-[2px] border-jade-ink/30 pt-5 sm:grid-cols-4">
          <Stat label="Skill rating" value={String(profile.skillRating)} />
          <Stat label="Win %" value={profile.winRateLabel} />
          <Stat label="Games" value={String(profile.games)} />
          <Stat label="Season net" value={formatSignedPoints(profile.seasonPoints)} />
          <Stat label="Wins" value={String(profile.wins)} />
          <Stat label="Self-draw" value={String(profile.selfDraw)} />
          <Stat label="Dealt in" value={String(profile.dealtIn)} />
          <Stat
            label="XP · LV"
            value={`${profile.experienceXp} · ${profile.experienceLevelNumber}`}
          />
          <Stat label="Band" value={profile.experienceBandTitle} />
        </dl>
      </article>

      <div className="relative mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="jade-card overflow-hidden">
          <div className="border-b-[2px] border-jade-ink px-4 py-3">
            <h2 className="font-serif text-2xl">Recent hands</h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              From finished live tables
            </p>
          </div>
          {profile.recentHands.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              No scored hands on file yet. Sit a live table to fill this ledger.
            </p>
          ) : (
            <ol className="divide-y divide-jade-ink/30">
              {profile.recentHands.map((hand) => (
                <li key={hand.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Hand {String(hand.handNumber).padStart(2, "0")} ·{" "}
                        {hand.method}
                      </p>
                      <Link
                        href={`/session/${hand.sessionId}`}
                        className="mt-1 inline-block font-serif text-xl leading-none underline-offset-2 hover:underline"
                      >
                        {hand.sessionTitle}
                      </Link>
                    </div>
                    <span
                      className={cn(
                        "border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
                        hand.role === "win" &&
                          "border-jade-accent bg-card text-jade-accent",
                        hand.role === "dealt-in" &&
                          "border-jade-red bg-card text-jade-red",
                        hand.role === "played" && "border-jade-ink bg-muted",
                      )}
                    >
                      {hand.role}
                    </span>
                  </div>
                  {hand.points > 0 ? (
                    <p className="mt-2 font-mono text-sm text-jade-accent">
                      {formatPlainPoints(hand.points)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <PlayerProTeaser
          insights={profile.proInsights}
          unlocked={viewerIsPro}
          accountName={viewer?.name}
        />
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-jade-ink/30 bg-parchment px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-lg">{value}</dd>
    </div>
  )
}
