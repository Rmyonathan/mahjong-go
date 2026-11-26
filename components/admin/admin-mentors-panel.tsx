"use client"

import { useCallback, useEffect, useState } from "react"
import { Award } from "lucide-react"

import type { AdminMentorApplicationRow } from "@/lib/mentors/service"
import { cn } from "@/lib/utils"

export function AdminMentorsPanel() {
  const [apps, setApps] = useState<AdminMentorApplicationRow[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/mentors")
    if (!res.ok) return
    const data = (await res.json()) as {
      applications?: AdminMentorApplicationRow[]
    }
    setApps(data.applications ?? [])
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id)
    try {
      const res = await fetch("/api/admin/mentors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      })
      if (res.ok) await refresh()
    } finally {
      setBusyId(null)
    }
  }

  if (apps.length === 0) return null

  return (
    <section className="jade-card mt-8 p-5">
      <div className="flex items-center gap-2">
        <Award className="size-4 text-jade-gold" aria-hidden />
        <h3 className="font-serif text-2xl">Certified Mentor Applications</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {apps.map((app) => (
          <li
            key={app.id}
            className="flex flex-col gap-3 rounded-xl border border-[#102A20]/10 bg-parchment/60 p-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-serif text-lg text-jade-ink">{app.name}</p>
                <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">
                  {app.tierName} · {app.skillRating}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                    app.status === "APPROVED"
                      ? "bg-jade-soft text-jade-accent"
                      : app.status === "REJECTED"
                        ? "bg-jade-red/15 text-jade-red"
                        : "bg-jade-gold/20 text-jade-ink",
                  )}
                >
                  {app.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{app.bio}</p>
            </div>

            {app.status === "PENDING" ? (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyId === app.id}
                  onClick={() => void review(app.id, "approve")}
                  className="tap-press rounded-full bg-jade-accent px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white disabled:opacity-50"
                >
                  Approve COACH
                </button>
                <button
                  type="button"
                  disabled={busyId === app.id}
                  onClick={() => void review(app.id, "reject")}
                  className="tap-press rounded-full border border-[#102A20]/15 bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
