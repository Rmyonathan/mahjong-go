"use client"

import { useState } from "react"
import { Award } from "lucide-react"

import type { MentorStatusSnapshot } from "@/lib/mentors/service"
import { MENTOR_MIN_RATING } from "@/lib/mentors/service"

export function MentorApplicationCard({
  initialStatus,
}: {
  initialStatus: MentorStatusSnapshot
}) {
  const [status, setStatus] = useState(initialStatus)
  const [bio, setBio] = useState(initialStatus.application?.bio ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/mentors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      })
      const data = (await res.json().catch(() => ({}))) as
        | (MentorStatusSnapshot & { error?: string })
        | { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Could not submit application")
        return
      }
      if ("eligible" in data) {
        setStatus(data)
        setSaved(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-label="Certified Table Mentor"
      className="jade-card mt-6 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Certified Table Mentors · {status.tierName} ({status.skillRating})
          </p>
          <h2 className="mt-1 font-serif text-2xl">Coach &amp; Guided Tables</h2>
        </div>
        {status.isCertifiedMentor ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-jade-ink px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-gold">
            <Award className="size-3.5" aria-hidden />
            COACH
          </span>
        ) : null}
      </div>

      {status.isCertifiedMentor ? (
        <p className="mt-2 text-sm text-muted-foreground">
          You hold the <strong>COACH</strong> badge. You can host paid
          beginner Guided Tables from Schedule (+ My table).
        </p>
      ) : status.application?.status === "PENDING" ? (
        <div className="mt-3 rounded-xl border border-jade-gold/40 bg-jade-gold/10 px-4 py-3 text-sm text-jade-ink">
          Your Certified Mentor application is <strong>pending review</strong>{" "}
          by the club owner.
        </div>
      ) : !status.eligible ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Reach <strong>Platinum ({MENTOR_MIN_RATING}+ ELO)</strong> to apply
          for the <strong>COACH</strong> badge and host paid beginner Guided
          Tables.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          {status.application?.status === "REJECTED" ? (
            <p className="text-xs text-jade-red">
              Previous application was not approved — you can update your bio
              and reapply.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              You qualify (Platinum/Jade tier)! Apply to earn the{" "}
              <strong>COACH</strong> badge and host paid beginner Guided Tables.
            </p>
          )}
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            placeholder="Share your Mahjong teaching style & availability…"
            className="w-full rounded-xl border border-[#102A20]/15 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-jade-accent/30"
          />
          {error ? (
            <p className="font-mono text-xs text-jade-red">{error}</p>
          ) : null}
          {saved ? (
            <p className="font-mono text-xs text-jade-accent">
              Application submitted!
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="tap-press inline-flex h-10 items-center rounded-full bg-jade-accent px-5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Apply as Certified Mentor"}
          </button>
        </form>
      )}
    </section>
  )
}
