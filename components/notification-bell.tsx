"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Bell, CheckCheck, Sparkles } from "lucide-react"

import type { NotificationItem } from "@/lib/notifications/service"
import { WIND_META, type LiveWind } from "@/lib/session/live-demo"
import { cn } from "@/lib/utils"

type PendingInvite = {
  id: string
  sessionId: string
  sessionTitle: string
  boardType: string
  seatId: string
  wind: LiveWind
  inviterName: string
  createdAt: string
}

export function NotificationBell({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null)
  const [toast, setToast] = useState<NotificationItem | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const bootedRef = useRef(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  useEffect(() => {
    if (!loggedIn) {
      setItems([])
      setInvites([])
      setUnread(0)
      return
    }
    let cancelled = false

    async function load() {
      try {
        const [notifRes, inviteRes] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/session-invites").catch(() => null),
        ])

        const notifCt = notifRes.headers.get("content-type") ?? ""
        if (notifRes.ok && notifCt.includes("application/json")) {
          const data = (await notifRes.json()) as {
            notifications?: NotificationItem[]
            unreadCount?: number
          }
          if (cancelled) return
          const next = data.notifications ?? []
          setItems(next)
          setUnread(data.unreadCount ?? 0)

          if (!bootedRef.current) {
            bootedRef.current = true
            next.forEach((n) => seenIdsRef.current.add(n.id))
            const firstUnread = next.find((n) => !n.readAt)
            if (firstUnread) setToast(firstUnread)
          } else {
            const brandNew = next.find(
              (n) => !n.readAt && !seenIdsRef.current.has(n.id),
            )
            next.forEach((n) => seenIdsRef.current.add(n.id))
            if (brandNew) setToast(brandNew)
          }
        }

        if (inviteRes && inviteRes.ok) {
          const invCt = inviteRes.headers.get("content-type") ?? ""
          if (invCt.includes("application/json")) {
            const invData = (await inviteRes.json()) as {
              invites?: PendingInvite[]
            }
            if (!cancelled) {
              setInvites(invData.invites ?? [])
            }
          }
        }
      } catch {
        /* silent */
      }
    }

    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load()
    }, 20_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [loggedIn, pathname])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 5500)
    return () => window.clearTimeout(id)
  }, [toast])

  async function markAllRead() {
    setUnread(0)
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    )
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => undefined)
  }

  async function respondInvite(
    invite: PendingInvite,
    action: "accept" | "decline",
  ) {
    setBusyInviteId(invite.id)
    try {
      const res = await fetch(
        `/api/session-invites/${encodeURIComponent(invite.id)}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      )
      const data = (await res.json().catch(() => ({}))) as {
        sessionId?: string
      }
      if (!res.ok) return
      setInvites((prev) => prev.filter((item) => item.id !== invite.id))
      if (action === "accept") {
        setOpen(false)
        router.push(
          `/session/live?id=${encodeURIComponent(data.sessionId ?? invite.sessionId)}`,
        )
        router.refresh()
      }
    } finally {
      setBusyInviteId(null)
    }
  }

  if (!loggedIn) return null

  const totalBadge = unread + invites.length

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tap-press relative grid size-8 place-items-center rounded-full border border-[#102A20]/10 bg-white text-jade-ink shadow-sm hover:bg-jade-soft sm:size-10"
          aria-label="Notifications & table invites"
        >
          <Bell className="size-4" />
          {totalBadge > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-jade-accent px-1 font-mono text-[9px] font-semibold leading-4 text-white">
              {totalBadge > 9 ? "9+" : totalBadge}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="fixed inset-x-3 top-[4.5rem] z-50 rounded-2xl border border-[#102A20]/12 bg-white p-3 shadow-[0_16px_40px_-12px_rgba(16,42,32,0.28)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.55rem)] sm:w-80">
            <div className="flex items-center justify-between border-b border-[#102A20]/10 pb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Notifications
              </p>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-accent hover:underline"
                >
                  <CheckCheck className="size-3" aria-hidden />
                  Read all
                </button>
              ) : null}
            </div>

            <div className="mt-2 max-h-[65vh] space-y-3 overflow-y-auto">
              {invites.length > 0 ? (
                <div>
                  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-jade-accent">
                    Table Invites · {invites.length}
                  </p>
                  <ul className="space-y-2">
                    {invites.map((invite) => {
                      const wind =
                        invite.wind in WIND_META
                          ? WIND_META[invite.wind]
                          : WIND_META.east
                      const busy = busyInviteId === invite.id
                      return (
                        <li
                          key={invite.id}
                          className="rounded-xl border border-jade-accent/25 bg-jade-soft/50 p-2.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="jade-live-pulse size-1.5 shrink-0 rounded-full bg-jade-accent" />
                            <p className="truncate text-xs font-semibold text-jade-ink">
                              {invite.sessionTitle}
                            </p>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {invite.inviterName} invited you as {wind.badge}{" "}
                            {wind.label}
                          </p>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void respondInvite(invite, "accept")
                              }
                              className="tap-press flex-1 rounded-full bg-jade-accent py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                            >
                              {busy ? "Joining…" : "Accept & Join"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void respondInvite(invite, "decline")
                              }
                              className="tap-press rounded-full border border-[#102A20]/15 bg-white px-3 py-1.5 text-[11px] font-medium text-jade-ink disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              <div>
                {invites.length > 0 && items.length > 0 ? (
                  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Milestones &amp; Streaks
                  </p>
                ) : null}
                {items.length === 0 && invites.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No notifications yet. Table invites, win streaks, and rank
                    promotions appear here.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map((item) => {
                      const inner = (
                        <div
                          className={cn(
                            "rounded-xl px-3 py-2 text-left transition hover:bg-jade-soft/60",
                            !item.readAt && "bg-jade-soft/50",
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {!item.readAt ? (
                              <span className="size-1.5 shrink-0 rounded-full bg-jade-accent" />
                            ) : null}
                            <p className="text-xs font-semibold text-jade-ink">
                              {item.title}
                            </p>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            {item.body}
                          </p>
                        </div>
                      )

                      return (
                        <li key={item.id}>
                          {item.href ? (
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className="block"
                            >
                              {inner}
                            </Link>
                          ) : (
                            inner
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-[85] max-w-xs rounded-2xl border border-jade-gold/50 bg-jade-ink p-3.5 text-white shadow-xl md:bottom-6"
        >
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-jade-gold" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-jade-gold">
                Milestone unlocked
              </p>
              <p className="mt-0.5 font-serif text-base leading-tight">
                {toast.title}
              </p>
              <p className="mt-1 text-xs text-white/80">{toast.body}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs text-white/60 hover:text-white"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
