"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Sparkles, X } from "lucide-react"

import { ProPerkModal } from "@/components/schedule/pro-perk-modal"

const DISMISS_DAY_KEY = "jade_pro_renew_notice_day"

function todayYmdJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

type MeUser = {
  name: string
  role: "ADMIN" | "MEMBER"
  isPro?: boolean
  proExpiresAt?: string | null
}

/**
 * Once-a-day renewal ("Perpanjang Pro") notification when a Pro member
 * has 7 days or less remaining on their subscription.
 */
export function ProRenewalNotice() {
  const pathname = usePathname()
  const [user, setUser] = useState<MeUser | null>(null)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const hiddenRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/hk")

  useEffect(() => {
    if (hiddenRoute) {
      setVisible(false)
      return
    }
    let cancelled = false

    async function checkRenewal() {
      try {
        const res = await fetch("/api/auth/me")
        const ct = res.headers.get("content-type") ?? ""
        if (!res.ok || !ct.includes("application/json")) return
        const data = (await res.json()) as { user?: MeUser | null }
        const u = data.user ?? null
        if (cancelled || !u || u.role === "ADMIN" || !u.isPro || !u.proExpiresAt) {
          if (!cancelled) setVisible(false)
          return
        }

        const msLeft = new Date(u.proExpiresAt).getTime() - Date.now()
        const left = Math.ceil(msLeft / (24 * 60 * 60 * 1000))
        if (left > 7 || left < 0) {
          if (!cancelled) setVisible(false)
          return
        }

        const today = todayYmdJakarta()
        const dismissedDay = window.localStorage.getItem(DISMISS_DAY_KEY)
        if (dismissedDay === today) {
          if (!cancelled) setVisible(false)
          return
        }

        if (!cancelled) {
          setUser(u)
          setDaysLeft(left)
          setVisible(true)
        }
      } catch {
        /* silent */
      }
    }

    void checkRenewal()
    return () => {
      cancelled = true
    }
  }, [pathname, hiddenRoute])

  function dismissToday() {
    try {
      window.localStorage.setItem(DISMISS_DAY_KEY, todayYmdJakarta())
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible && !modalOpen) return null

  const expiryText = user?.proExpiresAt
    ? new Date(user.proExpiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : ""

  return (
    <>
      {visible && user && daysLeft != null ? (
        <aside
          aria-label="Pro renewal reminder"
          className="border-b border-jade-gold/40 bg-jade-gold/15 backdrop-blur-sm"
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-jade-gold px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-ink">
                <Sparkles className="size-3" aria-hidden />
                Pro
              </span>
              <p className="text-xs text-jade-ink sm:text-sm">
                {daysLeft <= 0
                  ? "Masa Pro Anda berakhir hari ini."
                  : `Masa Pro tinggal ${daysLeft} hari lagi (s/d ${expiryText}).`}{" "}
                Perpanjang agar fitur Pro tetap aktif.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="tap-press inline-flex h-8 items-center rounded-full bg-jade-ink px-3.5 text-xs font-semibold text-white"
              >
                Perpanjang Pro
              </button>
              <button
                type="button"
                onClick={dismissToday}
                aria-label="Tutup pengingat hari ini"
                className="grid size-8 place-items-center rounded-full border border-[#102A20]/15 bg-white text-jade-ink/70 hover:bg-white/80"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      <ProPerkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accountName={user?.name}
        mode="renew"
        expiresAt={user?.proExpiresAt}
      />
    </>
  )
}
