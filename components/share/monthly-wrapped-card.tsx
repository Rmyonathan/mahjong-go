"use client"

import { useRef, useState } from "react"
import { Share2, Sparkles } from "lucide-react"

import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import type { MonthlyWrappedData } from "@/lib/data/monthly-wrapped"
import { formatPlainPoints, formatSignedPoints } from "@/lib/mock/jade-board"
import { shareOrDownloadImage } from "@/lib/share/capture"
import { cn } from "@/lib/utils"

export function MonthlyWrappedCard({
  playerName,
  nickname,
  wrapped,
  unlocked,
  accountName,
}: {
  playerName: string
  nickname: string
  wrapped: MonthlyWrappedData
  unlocked: boolean
  accountName?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [proOpen, setProOpen] = useState(false)

  async function onShare() {
    if (!cardRef.current || busy || !unlocked) return
    setBusy(true)
    try {
      await shareOrDownloadImage({
        node: cardRef.current,
        fileName: `jade-wrapped-${wrapped.monthLabel.toLowerCase().replace(/\s+/g, "-")}.png`,
        title: `${playerName} · Monthly Jade Wrapped`,
        text: `${playerName} · ${wrapped.monthLabel} · ${wrapped.totalWins} wins`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="jade-card relative mt-6 overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-jade-gold">
              Pro · {wrapped.monthLabel}
            </p>
            <h2 className="mt-1 font-serif text-2xl">Monthly Jade Wrapped</h2>
          </div>
          {unlocked ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onShare()}
              className="tap-press inline-flex h-10 items-center gap-2 rounded-full bg-jade-accent px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white shadow-sm disabled:opacity-50"
            >
              <Share2 className="size-3.5" aria-hidden />
              {busy ? "Rendering…" : "Share 9:16 Card"}
            </button>
          ) : null}
        </div>

        <div className="relative mt-4">
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-3",
              !unlocked && "select-none blur-[5px]",
            )}
          >
            <div className="rounded-xl border border-[#102A20]/10 bg-parchment/70 p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Total Wins
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-jade-ink">
                {wrapped.totalWins}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {wrapped.sessionsPlayed} sessions ·{" "}
                {formatSignedPoints(wrapped.netPoints)}
              </p>
            </div>

            <div className="rounded-xl border border-[#102A20]/10 bg-parchment/70 p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Biggest Hand
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-jade-gold">
                {wrapped.biggestHand
                  ? formatPlainPoints(wrapped.biggestHand.points)
                  : "—"}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {wrapped.biggestHand?.combos.join(" · ") ||
                  "No wins logged this month"}
              </p>
            </div>

            <div className="rounded-xl border border-[#102A20]/10 bg-parchment/70 p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Best Rival
              </p>
              <p className="mt-1 truncate font-serif text-xl text-jade-ink">
                {wrapped.bestRival?.name ?? "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {wrapped.bestRival
                  ? `${formatSignedPoints(wrapped.bestRival.netAgainst)} · ${wrapped.bestRival.hands} hands`
                  : "Play more hands"}
              </p>
            </div>
          </div>

          {!unlocked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-parchment/75 p-4 text-center backdrop-blur-[2px]">
              <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-jade-gold">
                <Sparkles className="size-3" aria-hidden />
                Pro Monthly Summary
              </p>
              <p className="mt-1 max-w-sm text-sm font-medium text-jade-ink">
                Unlock your Monthly Jade Wrapped 9:16 Instagram Story card.
              </p>
              <button
                type="button"
                onClick={() => setProOpen(true)}
                className="tap-press mt-3 inline-flex h-9 items-center rounded-full bg-jade-accent px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white"
              >
                Unlock with Pro · Rp 29k/mo
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Off-screen 9:16 IG Story Wrapped Card */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-[-10000px] top-0 z-[-1]"
      >
        <div
          ref={cardRef}
          style={{
            width: 360,
            height: 640,
            background: "linear-gradient(165deg, #102A20 0%, #163B2D 55%, #0F1A14 100%)",
            color: "#F6F4EE",
            padding: 28,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily: "var(--font-sans), sans-serif",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#D4A24A",
              }}
            >
              MONTHLY JADE WRAPPED · {wrapped.monthLabel.toUpperCase()}
            </p>
            <h3
              style={{
                fontFamily: "var(--font-serif), serif",
                fontSize: 34,
                lineHeight: 1.05,
                marginTop: 12,
                color: "#FFFFFF",
              }}
            >
              {playerName}
            </h3>
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#B7C5B5",
                marginTop: 6,
              }}
            >
              @{nickname} · JADE PRO
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(212,162,74,0.4)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#B7C5B5",
                }}
              >
                TOTAL WINS · {wrapped.sessionsPlayed} SESSIONS
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#3FA86A",
                  marginTop: 4,
                }}
              >
                {wrapped.totalWins}
              </p>
              <p style={{ fontSize: 12, color: "#E8DFC8", marginTop: 2 }}>
                Net {formatSignedPoints(wrapped.netPoints)} pts
              </p>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#B7C5B5",
                }}
              >
                BIGGEST HAND
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#D4A24A",
                  marginTop: 4,
                }}
              >
                {wrapped.biggestHand
                  ? formatPlainPoints(wrapped.biggestHand.points)
                  : "—"}
              </p>
              <p style={{ fontSize: 12, color: "#E8DFC8", marginTop: 2 }}>
                {wrapped.biggestHand?.combos.join(" · ") || "No winning hands"}
              </p>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#B7C5B5",
                }}
              >
                BEST RIVAL
              </p>
              <p
                style={{
                  fontFamily: "var(--font-serif), serif",
                  fontSize: 24,
                  color: "#FFFFFF",
                  marginTop: 4,
                }}
              >
                {wrapped.bestRival?.name ?? "—"}
              </p>
              <p style={{ fontSize: 12, color: "#E8DFC8", marginTop: 2 }}>
                {wrapped.bestRival
                  ? `${formatSignedPoints(wrapped.bestRival.netAgainst)} across ${wrapped.bestRival.hands} hands`
                  : "No rival data yet"}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(255,255,255,0.14)",
              paddingTop: 14,
              fontFamily: "var(--font-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#B7C5B5",
            }}
          >
            <span>JADE MAHJONG</span>
            <span>BANDAR LAMPUNG</span>
          </div>
        </div>
      </div>

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
      />
    </>
  )
}
