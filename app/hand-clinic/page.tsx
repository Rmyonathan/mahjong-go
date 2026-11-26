"use client"

import { useCallback, useEffect, useState } from "react"
import { MessageSquareHeart, Sparkles } from "lucide-react"

import { JadePageLoader } from "@/components/jade-page-loader"
import { TileStrip } from "@/components/jade/tile-strip"
import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import type {
  HandClinicItem,
  SubmittableLostHand,
} from "@/lib/hand-clinic/service"
import { formatPlainPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

export default function HandClinicPage() {
  const [items, setItems] = useState<HandClinicItem[]>([])
  const [lockedCount, setLockedCount] = useState(0)
  const [isPro, setIsPro] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [myLostHands, setMyLostHands] = useState<SubmittableLostHand[]>([])
  const [selectedKey, setSelectedKey] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proOpen, setProOpen] = useState(false)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyingId, setReplyingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/hand-clinic")
      const ct = res.headers.get("content-type") ?? ""
      if (!res.ok || !ct.includes("application/json")) return
      const data = (await res.json()) as {
        items?: HandClinicItem[]
        lockedCount?: number
        isPro?: boolean
        isAdmin?: boolean
        myLostHands?: SubmittableLostHand[]
      }
      setItems(data.items ?? [])
      setLockedCount(data.lockedCount ?? 0)
      setIsPro(Boolean(data.isPro))
      setIsAdmin(Boolean(data.isAdmin))
      const hands = data.myLostHands ?? []
      setMyLostHands(hands)
      if (hands.length > 0 && !selectedKey) {
        setSelectedKey(hands[0]!.key)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedKey])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function submitHand(event: React.FormEvent) {
    event.preventDefault()
    const picked = myLostHands.find((h) => h.key === selectedKey)
    if (!picked || !notes.trim()) {
      setError("Pick a hand and write what you want the coach to review.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/hand-clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: picked.sessionId,
          handNumber: picked.handNumber,
          notes,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Could not submit hand")
        return
      }
      setNotes("")
      await refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function postCoachReview(id: string) {
    const coachNote = replyDrafts[id]?.trim()
    if (!coachNote) return
    setReplyingId(id)
    try {
      const res = await fetch(`/api/hand-clinic/${encodeURIComponent(id)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachNote }),
      })
      if (res.ok) {
        setReplyDrafts((prev) => ({ ...prev, [id]: "" }))
        await refresh()
      }
    } finally {
      setReplyingId(null)
    }
  }

  if (loading) {
    return <JadePageLoader kanji="診" label="Loading Hand Clinic…" />
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Coaching staff · Hand Clinic
      </p>
      <h1 className="mt-2 font-serif text-4xl uppercase leading-[0.92] tracking-tight sm:text-6xl">
        Hand Clinic
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Submit tough lost hands from your Game Log for the Jade Coaching Staff
        to break down, and study real table decisions.
      </p>

      <div className="jade-divider mt-6" />

      {/* Submit form (Pro) or Upgrade CTA (Free) */}
      <section className="jade-card mt-6 p-5">
        {isPro ? (
          <form onSubmit={submitHand} className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-2xl">Submit a lost hand</h2>
              <span className="rounded-full bg-jade-gold/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-ink">
                Pro perk
              </span>
            </div>

            {myLostHands.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No finished lost hands in your Game Log yet. Play a session
                first to submit hands for review.
              </p>
            ) : (
              <>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Choose hand from your Game Log
                  </span>
                  <select
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#102A20]/15 bg-white px-3 text-sm outline-none"
                  >
                    {myLostHands.map((h) => (
                      <option key={h.key} value={h.key}>
                        {h.sessionTitle} · Hand #{h.handNumber} (-
                        {formatPlainPoints(h.pointsLost)})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Your question for the coach
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g., Should I have folded the 7-dots here or pushed for Half Flush?"
                    className="mt-1.5 w-full rounded-xl border border-[#102A20]/15 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-jade-accent/30"
                  />
                </label>

                {error ? (
                  <p className="font-mono text-xs text-jade-red">{error}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="tap-press inline-flex h-11 items-center gap-2 rounded-full bg-jade-accent px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <MessageSquareHeart className="size-4" aria-hidden />
                  {submitting ? "Submitting…" : "Submit to Hand Clinic"}
                </button>
              </>
            )}
          </form>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-jade-gold">
                <Sparkles className="size-3" aria-hidden />
                Pro Feature
              </p>
              <h2 className="mt-1 font-serif text-2xl">
                Submit your lost hands for Coach review
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Free members can read 1 coach breakdown. Jade Pro unlocks
                unlimited breakdowns and hand submissions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProOpen(true)}
              className="tap-press shrink-0 rounded-full bg-jade-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
              Upgrade to Pro · Rp 29k/mo
            </button>
          </div>
        )}
      </section>

      {/* Feed */}
      <section className="mt-8 space-y-4">
        <h2 className="font-serif text-2xl uppercase">Coach Breakdowns</h2>

        {items.length === 0 ? (
          <div className="jade-card p-6 text-sm text-muted-foreground">
            No hands submitted to the clinic yet.
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="jade-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                        item.status === "REVIEWED"
                          ? "bg-jade-soft text-jade-accent"
                          : "bg-jade-gold/20 text-jade-ink",
                      )}
                    >
                      {item.status === "REVIEWED"
                        ? "Coach reviewed"
                        : "Awaiting coach"}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {item.playerName} · {item.sessionTitle} · Hand #
                      {item.handNumber}
                    </span>
                  </div>
                  {item.pointsLost > 0 ? (
                    <span className="font-mono text-xs text-jade-red">
                      -{formatPlainPoints(item.pointsLost)}
                    </span>
                  ) : null}
                </div>

                {item.tileIds.length > 0 ? (
                  <div className="mt-3">
                    <TileStrip
                      ids={item.tileIds}
                      winningId={item.winningTileId}
                      size="xs"
                    />
                  </div>
                ) : null}

                <p className="mt-3 text-sm leading-relaxed text-jade-ink">
                  “{item.notes}”
                </p>

                {item.coachNote ? (
                  <div className="mt-4 rounded-xl border border-jade-accent/25 bg-jade-soft/50 p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent">
                      Coach {item.coachName ?? "Staff"}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-jade-ink">
                      {item.coachNote}
                    </p>
                  </div>
                ) : null}

                {isAdmin ? (
                  <div className="mt-4 flex gap-2">
                    <input
                      value={replyDrafts[item.id] ?? ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="Write coach breakdown…"
                      className="h-9 flex-1 rounded-full border border-[#102A20]/15 bg-white px-3 text-sm outline-none"
                    />
                    <button
                      type="button"
                      disabled={replyingId === item.id}
                      onClick={() => void postCoachReview(item.id)}
                      className="tap-press rounded-full bg-jade-ink px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-white disabled:opacity-50"
                    >
                      {replyingId === item.id ? "Saving…" : "Post reply"}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {lockedCount > 0 ? (
          <div className="jade-card border-dashed p-5 text-center">
            <p className="font-serif text-xl">
              +{lockedCount} more coach breakdowns locked
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upgrade to Jade Pro to read every clinic breakdown and submit
              your own hands.
            </p>
            <button
              type="button"
              onClick={() => setProOpen(true)}
              className="tap-press mt-3 inline-flex h-10 items-center rounded-full bg-jade-accent px-5 text-xs font-semibold text-white"
            >
              Unlock Hand Clinic · Rp 29k/mo
            </button>
          </div>
        ) : null}
      </section>

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
      />
    </main>
  )
}
