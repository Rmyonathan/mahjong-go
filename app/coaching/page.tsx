"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { DynamicQris } from "@/components/payment/dynamic-qris"
import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import {
  COACHING_VIDEOS,
  HAND_AUDIT_MINUTES,
  HAND_AUDIT_PRICE_IDR,
  COACH_SPLIT_LABEL,
} from "@/lib/coaching/content"
import { formatQrisIdr } from "@/lib/qris"
import { whatsAppCoachingConfirmUrl } from "@/lib/pro-payment"
import { formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

type HistorySession = {
  id: string
  title: string
  startedAt: string
  netPoints: number
}

export default function CoachingPage() {
  const [isPro, setIsPro] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [accountName, setAccountName] = useState("")
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [sessionId, setSessionId] = useState("")
  const [preferredAt, setPreferredAt] = useState("")
  const [notes, setNotes] = useState("")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [proOpen, setProOpen] = useState(false)

  const refresh = useCallback(async () => {
    const meRes = await fetch("/api/auth/me")
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        user?: { isPro?: boolean; role?: string; name?: string } | null
      }
      setLoggedIn(Boolean(me.user))
      setIsPro(Boolean(me.user?.isPro || me.user?.role === "ADMIN"))
      if (me.user?.name) setAccountName(me.user.name)
    }

    const bookRes = await fetch("/api/coaching/book")
    if (bookRes.ok) {
      const data = (await bookRes.json()) as { sessions?: HistorySession[] }
      setSessions(data.sessions ?? [])
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function submitBooking() {
    if (!loggedIn) {
      window.location.href = `/login?next=${encodeURIComponent("/coaching")}`
      return
    }
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/coaching/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId || null,
          preferredAt: preferredAt || null,
          notes,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Booking failed")
        return
      }
      setMessage("Request saved — confirm on WhatsApp with your coach.")
      setNotes("")
    } finally {
      setPending(false)
    }
  }

  const sessionLabel =
    sessions.find((s) => s.id === sessionId)?.title ?? "Hand audit"
  const waUrl = whatsAppCoachingConfirmUrl({
    accountName,
    sessionLabel,
  })

  return (
    <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Retention · Pro justification
      </p>
      <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9]">
        Coaching
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Midweek film study + a 45-min hand audit with the club coach. Free
        teasers stay open; strategy clips and deeper reviews sit behind Pro /
        paid booking.
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-3xl uppercase">Video library</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {COACHING_VIDEOS.map((video) => {
            const locked = video.proOnly && !isPro
            return (
              <article key={video.id} className="jade-card overflow-hidden">
                <div className="relative aspect-video bg-jade-ink/90">
                  {locked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-jade-ink/80 p-4 text-center">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-jade-gold">
                        Pro locked
                      </p>
                      <button
                        type="button"
                        onClick={() => setProOpen(true)}
                        className="border-[2px] border-jade-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-gold"
                      >
                        Unlock · Rp 29k/mo
                      </button>
                    </div>
                  ) : (
                    <iframe
                      title={video.title}
                      src={`https://www.youtube.com/embed/${video.youtubeId}`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {video.proOnly ? "Pro" : "Free"} · {video.durationLabel}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl leading-none">
                    {video.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {video.summary}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <div className="jade-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-gold">
            1-on-1 · {HAND_AUDIT_MINUTES} min
          </p>
          <h2 className="mt-2 font-serif text-3xl">Hand audit / guided table</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a finished session from your archive. Coach reviews the ledger
            live ({COACH_SPLIT_LABEL}).
          </p>
          <p className="mt-3 font-mono text-sm">
            {formatQrisIdr(HAND_AUDIT_PRICE_IDR)}
          </p>

          <label className="mt-5 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Saved session
            </span>
            <select
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-parchment px-2"
            >
              <option value="">Any / general review</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title} · {formatSignedPoints(session.netPoints)} ·{" "}
                  {new Date(session.startedAt).toLocaleDateString("id-ID")}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Preferred time
            </span>
            <input
              type="datetime-local"
              value={preferredAt}
              onChange={(event) => setPreferredAt(event.target.value)}
              className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-card px-3 font-mono"
            />
          </label>

          <label className="mt-3 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Notes for coach
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full border-[2px] border-jade-ink bg-card px-3 py-2 text-sm"
              placeholder="Hands you're unsure about, seat wind, etc."
            />
          </label>

          {error ? (
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-jade-accent">
              {message}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={pending}
              onClick={submitBooking}
              className={cn(
                "scan-cta-accent inline-flex h-11 flex-1 items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50",
              )}
            >
              {pending ? "Saving…" : "Request audit"}
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 flex-1 items-center justify-center border-[2px] border-jade-ink bg-card font-mono text-[11px] uppercase tracking-[0.16em]"
            >
              WhatsApp coach
            </a>
          </div>
        </div>

        <div>
          <DynamicQris
            amount={HAND_AUDIT_PRICE_IDR}
            size={200}
            label="Hand audit QRIS"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Pay via QRIS, then ping WhatsApp so the host can schedule the call.
          </p>
        </div>
      </section>

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <Link href="/dashboard" className="underline-offset-2 hover:underline">
          ← Dashboard
        </Link>
        {" · "}
        <Link href="/puzzle" className="underline-offset-2 hover:underline">
          Today&apos;s WWYD
        </Link>
      </p>

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
      />
    </main>
  )
}
