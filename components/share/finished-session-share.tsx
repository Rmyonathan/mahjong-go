"use client"

import { SessionNewspaperButton } from "@/components/share/session-newspaper"
import { ShareWinCardButton } from "@/components/share/win-story-card"
import type { LiveSession } from "@/lib/session/live-demo"

/** Newspaper CTA for finished archive pages. */
export function FinishedSessionNewspaper({
  session,
  className,
}: {
  session: LiveSession
  className?: string
}) {
  return <SessionNewspaperButton session={session} className={className} />
}

/** IG win-story share for one hand on the archive game log. */
export function FinishedHandShareButton({
  session,
  handIndex,
  isPro = false,
}: {
  session: LiveSession
  handIndex: number
  isPro?: boolean
}) {
  const hand = session.hands[handIndex]
  if (!hand || hand.winnerSeatIndex < 0) return null
  const winner = session.seats[hand.winnerSeatIndex]
  if (!winner) return null

  return (
    <ShareWinCardButton
      isPro={isPro}
      hand={{
        sessionTitle: session.title,
        handNo: hand.handNo,
        winnerName: winner.name,
        method: hand.method,
        points: hand.points,
        combos: hand.combos,
        tileIds: hand.tileIds,
        winningTileId: hand.winningTileId,
      }}
    />
  )
}
