import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { RecentHandsList } from "@/components/players/recent-hands-list"
import { getPlayerProfile } from "@/lib/data/player-profile"

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
      ? `Hands · ${profile.player.name} — Jade Mahjong`
      : "Hands — Jade Mahjong",
  }
}

export default async function PlayerHandsPage({ params }: PageProps) {
  const { id } = await params
  const profile = await getPlayerProfile(id)
  if (!profile) notFound()

  return (
    <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/players/${id}`}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        ← {profile.player.name}
      </Link>
      <h1 className="mt-4 font-serif text-4xl leading-none sm:text-5xl">
        Hand ledger
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Scored hands from finished live tables, newest first.
      </p>

      <div className="mt-8">
        <RecentHandsList hands={profile.recentHands} showAll />
      </div>
    </main>
  )
}
