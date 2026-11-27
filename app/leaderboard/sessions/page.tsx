import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { ArchiveUpgradeTeaser } from "@/components/leaderboard/archive-upgrade-teaser"
import { getSessionUser } from "@/lib/auth"
import { getPlayersByIds, getRecentSessions } from "@/lib/data/board"
import { prisma } from "@/lib/db"
import {
  FREE_SESSION_ARCHIVE_LIMIT,
  isProMembership,
} from "@/lib/membership"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "All Recent Sessions — Jade Mahjong",
  description: "Finished club sessions archive (10 per page).",
}

interface AllSessionsPageProps {
  searchParams: Promise<{
    page?: string | string[]
  }>
}

function readParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
}

export default async function AllSessionsPage({
  searchParams,
}: AllSessionsPageProps) {
  const params = await searchParams
  const [recentSessions, session] = await Promise.all([
    getRecentSessions(),
    getSessionUser(),
  ])

  const viewerUser =
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

  const canViewProfiles = Boolean(session)
  const viewerIsPro = viewerUser ? isProMembership(viewerUser) : false
  const visibleSessions = viewerIsPro
    ? recentSessions
    : recentSessions.slice(0, FREE_SESSION_ARCHIVE_LIMIT)
  const archiveLocked =
    canViewProfiles &&
    !viewerIsPro &&
    recentSessions.length > FREE_SESSION_ARCHIVE_LIMIT

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(visibleSessions.length / pageSize))
  const page = Math.min(
    totalPages,
    Math.max(1, Number(readParam(params.page)) || 1),
  )
  const pagedSessions = visibleSessions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  )

  const playerMap = await getPlayersByIds(
    pagedSessions.map((entry) => entry.winnerId),
  )

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/leaderboard"
        className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-jade-soft"
      >
        ← Back to Leaderboard
      </Link>

      <div className="mt-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {!canViewProfiles
            ? "Guest · preview only"
            : viewerIsPro
              ? `Pro archive · ${visibleSessions.length} sessions · 10 per page`
              : `Free · last ${FREE_SESSION_ARCHIVE_LIMIT} sessions`}
        </p>
        <h1 className="mt-2 font-serif text-4xl uppercase leading-none sm:text-5xl">
          Recent Sessions
        </h1>
      </div>

      <ol className="mt-6 flex flex-col gap-3">
        {pagedSessions.length === 0 ? (
          <li className="jade-card px-4 py-8 text-center text-sm text-muted-foreground">
            No finished tables yet — end a live session to appear here.
          </li>
        ) : null}
        {pagedSessions.map((entry) => {
          const winner = playerMap.get(entry.winnerId)
          const body = (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-jade-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-jade-accent">
                    {entry.games} games
                  </span>
                  <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {entry.venueName}
                  </span>
                </div>
                <p className="mt-1.5 truncate font-serif text-lg leading-tight sm:text-xl">
                  {entry.title}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                  Win · {winner?.nickname ?? "—"}
                </p>
              </div>
              {canViewProfiles ? (
                <ChevronRight className="size-4 shrink-0 text-jade-ink/40" />
              ) : null}
            </>
          )
          return (
            <li key={entry.id}>
              {canViewProfiles ? (
                <Link
                  href={`/session/${entry.id}`}
                  className="jade-card flex items-center gap-3 px-3.5 py-3 transition active:scale-[0.99] sm:px-4"
                >
                  {body}
                </Link>
              ) : (
                <div className="jade-card flex items-center gap-3 px-3.5 py-3 sm:px-4">
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/leaderboard"
          className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-card px-4 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-jade-soft"
        >
          ← Back to Leaderboard
        </Link>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            {page > 1 ? (
              <Link
                href={page - 1 > 1 ? `/leaderboard/sessions?page=${page - 1}` : "/leaderboard/sessions"}
                className="inline-flex h-9 items-center border-[2px] border-jade-ink bg-card px-3 hover:bg-jade-soft"
              >
                ← Prev
              </Link>
            ) : null}
            <span className="px-2 text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/leaderboard/sessions?page=${page + 1}`}
                className="inline-flex h-9 items-center border-[2px] border-jade-ink bg-card px-3 hover:bg-jade-soft"
              >
                Next →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {archiveLocked ? (
        <ArchiveUpgradeTeaser accountName={viewerUser?.name} />
      ) : null}
    </main>
  )
}
