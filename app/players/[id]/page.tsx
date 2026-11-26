import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { MentorApplicationCard } from "@/components/players/mentor-application-card"
import { PlayerEloChart } from "@/components/players/player-elo-chart"
import { PlayerMembershipCard } from "@/components/players/player-membership-card"
import { PlayerProfileEditor } from "@/components/players/player-profile-editor"
import { PlayerProTeaser } from "@/components/players/player-pro-teaser"
import { RecentHandsList } from "@/components/players/recent-hands-list"
import { SessionHistoryList } from "@/components/session/session-history-list"
import { MonthlyWrappedCard } from "@/components/share/monthly-wrapped-card"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getMonthlyJadeWrapped } from "@/lib/data/monthly-wrapped"
import { getPlayerProfile } from "@/lib/data/player-profile"
import { getPersonalSessionHistory } from "@/lib/data/session-history"
import { getPlayerEloHistory } from "@/lib/elo/snapshots"
import { isProMembership, membershipLabelForUser } from "@/lib/membership"
import { getMentorStatusForUser } from "@/lib/mentors/service"
import { formatSignedPoints } from "@/lib/mock/jade-board"

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
  const [profile, session, eloHistory] = await Promise.all([
    getPlayerProfile(id),
    getSessionUser(),
    getPlayerEloHistory(id),
  ])
  if (!profile) notFound()

  const [viewer, profileUser] = await Promise.all([
    session != null
      ? prisma.user.findUnique({
          where: { id: session.id },
          select: {
            name: true,
            role: true,
            membershipTier: true,
            proExpiresAt: true,
          },
        })
      : Promise.resolve(null),
    prisma.user.findUnique({
      where: { playerId: id },
      select: {
        id: true,
        name: true,
        role: true,
        membershipTier: true,
        proExpiresAt: true,
      },
    }),
  ])
  const viewerIsPro = viewer ? isProMembership(viewer) : false
  const ownerIsPro = profileUser ? isProMembership(profileUser) : false
  const isOwnProfile = session?.playerId === id

  // Free tier history limit applies to the profile owner
  const [history, wrapped, mentorStatus] = profileUser
    ? await Promise.all([
        getPersonalSessionHistory(profileUser.id, {
          isPro: ownerIsPro,
        }),
        getMonthlyJadeWrapped(profileUser.id),
        getMentorStatusForUser(profileUser.id),
      ])
    : [null, null, null]

  const { player } = profile

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
              {mentorStatus?.isCertifiedMentor ? (
                <span className="border-[2px] border-jade-ink bg-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-gold">
                  COACH
                </span>
              ) : null}
              <span className="border-[2px] border-jade-ink bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                LV {profile.experienceLevelNumber} ·{" "}
                {profile.experienceBandTitle}
              </span>
              <span className="border border-jade-accent bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                {profile.skillTierName} · {profile.skillRating}
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

      {isOwnProfile && viewer ? (
        <PlayerMembershipCard
          tierLabel={membershipLabelForUser(viewer)}
          isPro={viewerIsPro}
          isAdmin={viewer.role === "ADMIN"}
          proExpiresAt={viewer.proExpiresAt?.toISOString() ?? null}
          accountName={viewer.name}
        />
      ) : null}

      {isOwnProfile && mentorStatus ? (
        <MentorApplicationCard initialStatus={mentorStatus} />
      ) : null}

      <PlayerEloChart
        history={eloHistory}
        currentRating={profile.skillRating}
        unlocked={viewerIsPro}
        accountName={viewer?.name}
      />

      {wrapped ? (
        <MonthlyWrappedCard
          playerName={player.name}
          nickname={player.nickname}
          wrapped={wrapped}
          unlocked={viewerIsPro}
          accountName={viewer?.name}
        />
      ) : null}

      <div className="relative mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {history ? (
            <SessionHistoryList
              history={{
                ...history,
                // Upsell teaser only on own Free profile
                locked: isOwnProfile ? history.locked : false,
              }}
              accountName={viewer?.name ?? profileUser?.name}
              seeAllHref={`/players/${id}/sessions`}
            />
          ) : null}

          <RecentHandsList
            hands={profile.recentHands}
            seeAllHref={`/players/${id}/hands`}
          />
        </div>

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
