import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { SessionHistoryList } from "@/components/session/session-history-list"
import { getSessionUser } from "@/lib/auth"
import { getPlayerProfile } from "@/lib/data/player-profile"
import { getPersonalSessionHistory } from "@/lib/data/session-history"
import { prisma } from "@/lib/db"
import { isProMembership } from "@/lib/membership"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const profile = await getPlayerProfile(id)
  return {
    title: profile
      ? `Sessions · ${profile.player.name} — Jade Mahjong`
      : "Sessions — Jade Mahjong",
  }
}

export default async function PlayerSessionsPage({ params }: PageProps) {
  const { id } = await params
  const [profile, session] = await Promise.all([
    getPlayerProfile(id),
    getSessionUser(),
  ])
  if (!profile) notFound()

  const [viewer, profileUser] = await Promise.all([
    session
      ? prisma.user.findUnique({
          where: { id: session.id },
          select: { name: true },
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

  if (!profileUser) notFound()

  const ownerIsPro = isProMembership(profileUser)
  const isOwnProfile = session?.playerId === id
  const history = await getPersonalSessionHistory(profileUser.id, {
    isPro: ownerIsPro,
  })

  return (
    <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/players/${id}`}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        ← {profile.player.name}
      </Link>
      <h1 className="mt-4 font-serif text-4xl leading-none sm:text-5xl">
        Session archive
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        {ownerIsPro
          ? "Full permanent archive, newest first."
          : "Free accounts keep the last 3 finished tables. Upgrade to Pro for the permanent archive."}
      </p>

      <div className="mt-8">
        <SessionHistoryList
          history={{
            ...history,
            locked: isOwnProfile ? history.locked : false,
          }}
          accountName={viewer?.name ?? profileUser.name}
          showAll
        />
      </div>
    </main>
  )
}
