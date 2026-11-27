"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

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

function TableInviteBannerInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeLiveId = searchParams.get("id")

  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hiddenRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/hk")

  const fetchInvites = useCallback(async () => {
    if (hiddenRoute) return
    try {
      const response = await fetch("/api/session-invites")
      const ct = response.headers.get("content-type") ?? ""
      if (!response.ok || !ct.includes("application/json")) return
      const data = (await response.json()) as { invites?: PendingInvite[] }
      setInvites(data.invites ?? [])
    } catch {
      /* silent — banner poll should never break the page */
    }
  }, [hiddenRoute])

  useEffect(() => {
    if (hiddenRoute) {
      setInvites([])
      return
    }
    void fetchInvites()
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchInvites()
      }
    }, 20_000)
    return () => window.clearInterval(timer)
  }, [fetchInvites, pathname, hiddenRoute])

  async function respond(invite: PendingInvite, action: "accept" | "decline") {
    setBusyId(invite.id)
    setError(null)
    try {
      const response = await fetch("/api/session-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId: invite.id, action }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        sessionId?: string
        error?: string
      }
      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          setInvites((prev) => prev.filter((item) => item.id !== invite.id))
        }
        setError(data.error ?? "Could not update invite")
        return
      }
      setInvites((prev) => prev.filter((item) => item.id !== invite.id))
      if (action === "accept") {
        router.push(
          `/session/live?id=${encodeURIComponent(data.sessionId ?? invite.sessionId)}`,
        )
        router.refresh()
      }
    } catch {
      setError("Network error responding to invite")
    } finally {
      setBusyId(null)
    }
  }

  const visibleInvites = invites.filter(
    (invite) =>
      !(pathname === "/session/live" && activeLiveId === invite.sessionId),
  )

  if (hiddenRoute || visibleInvites.length === 0) return null

  return (
    <aside
      aria-label="Live table invites"
      className="border-b border-jade-accent/25 bg-jade-soft/95 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-2.5 sm:px-6">
        {visibleInvites.map((invite) => {
          const wind =
            invite.wind in WIND_META ? WIND_META[invite.wind] : WIND_META.east
          const busy = busyId === invite.id
          return (
            <div
              key={invite.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-jade-accent px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                  <span className="jade-live-pulse size-1.5 rounded-full bg-white" />
                  Live invite
                </span>
                <p className="truncate text-sm text-jade-ink">
                  <strong className="font-semibold">
                    {invite.sessionTitle}
                  </strong>{" "}
                  <span className="text-muted-foreground">
                    · {invite.inviterName} invited you as {wind.badge}{" "}
                    {wind.label}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond(invite, "accept")}
                  className={cn(
                    "tap-press inline-flex h-8 items-center rounded-full bg-jade-accent px-3.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50",
                  )}
                >
                  {busy ? "Joining…" : "Accept & Join"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond(invite, "decline")}
                  className="tap-press inline-flex h-8 items-center rounded-full border border-[#102A20]/15 bg-white px-3 text-xs font-medium text-jade-ink disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          )
        })}
        {error ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red">
            {error}
          </p>
        ) : null}
      </div>
    </aside>
  )
}

export function TableInviteBanner() {
  return (
    <Suspense fallback={null}>
      <TableInviteBannerInner />
    </Suspense>
  )
}
