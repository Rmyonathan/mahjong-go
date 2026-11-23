"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import {
  CalendarDays,
  LayoutGrid,
  Plus,
  Trophy,
  UserRound,
  X,
} from "lucide-react"

import { CLUB_LEARN_LINKS, TOOL_LINKS } from "@/lib/nav"
import { cn } from "@/lib/utils"

function MobileBottomNavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loggedIn, setLoggedIn] = useState(false)
  const [liveCount, setLiveCount] = useState(0)
  const [liveHref, setLiveHref] = useState("/live")
  const [playOpen, setPlayOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const tvMode = searchParams.get("tv") === "1"
  const hideChrome =
    tvMode ||
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/hk") ||
    pathname.startsWith("/admin")

  useEffect(() => {
    setPlayOpen(false)
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!playOpen && !moreOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPlayOpen(false)
        setMoreOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [playOpen, moreOpen])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetch("/api/auth/me").then(async (response) => {
        if (!response.ok) return null
        const data = (await response.json()) as { user?: { id: string } | null }
        return data.user ?? null
      }),
      fetch("/api/sessions").then(async (response) => {
        if (!response.ok) return [] as Array<{ id: string }>
        const data = (await response.json()) as {
          liveSessions?: Array<{ id: string }>
        }
        return data.liveSessions ?? []
      }),
    ])
      .then(([user, liveSessions]) => {
        if (cancelled) return
        setLoggedIn(Boolean(user))
        setLiveCount(user ? liveSessions.length : 0)
        // Hub always — works for 1 or many live tables
        setLiveHref("/live")
      })
      .catch(() => {
        if (!cancelled) {
          setLoggedIn(false)
          setLiveCount(0)
        }
      })
    return () => {
      cancelled = true
    }
  }, [pathname])

  if (hideChrome) return null

  const scheduleActive =
    pathname === "/schedule" || pathname.startsWith("/schedule/")
  const ranksActive =
    pathname === "/leaderboard" || pathname.startsWith("/leaderboard/")
  const profileActive =
    pathname === "/me" ||
    pathname.startsWith("/players/") ||
    pathname === "/login"
  const moreActive = CLUB_LEARN_LINKS.some(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  )

  // Guests: leaderboard + sign in only
  if (!loggedIn) {
    return (
      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-[#102A20]/10 bg-white/90 backdrop-blur-lg md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile guest"
      >
        <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-2 items-end px-2 pb-2 pt-1">
          <TabLink
            href="/leaderboard"
            label="Leaderboard"
            active={ranksActive}
            icon={Trophy}
          />
          <TabLink
            href="/login"
            label="Sign In"
            active={pathname === "/login"}
            icon={UserRound}
          />
        </div>
      </nav>
    )
  }

  return (
    <>
      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-[#102A20]/10 bg-white/90 backdrop-blur-lg md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile"
      >
        <div className="relative mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 items-end px-2 pb-2 pt-1">
          <TabLink
            href="/schedule"
            label="Schedule"
            active={scheduleActive}
            icon={CalendarDays}
          />
          <TabLink
            href="/leaderboard"
            label="Ranks"
            active={ranksActive}
            icon={Trophy}
          />

          <div className="relative flex justify-center">
            <button
              type="button"
              onClick={() => {
                setPlayOpen(true)
                setMoreOpen(false)
              }}
              className="tap-press absolute -top-7 grid size-14 place-items-center rounded-full bg-jade-accent text-white shadow-[0_10px_28px_-8px_rgba(22,121,76,0.65)] ring-4 ring-[#F6F4EE]"
              aria-label="Play actions"
            >
              <Plus className="size-7" strokeWidth={2.25} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMoreOpen(true)
              setPlayOpen(false)
            }}
            className={cn(
              "tap-press relative flex flex-col items-center gap-1 pb-1 pt-2 text-[10px] font-medium",
              moreActive || moreOpen ? "text-jade-accent" : "text-jade-ink/55",
            )}
          >
            {(moreActive || moreOpen) && (
              <span className="absolute top-0 h-1 w-5 rounded-full bg-jade-accent" />
            )}
            <LayoutGrid className="size-5" />
            More
          </button>

          <TabLink
            href="/me"
            label="Profile"
            active={profileActive}
            icon={UserRound}
          />
        </div>
      </nav>

      {playOpen ? (
        <Sheet onClose={() => setPlayOpen(false)} title="Play">
          {liveCount > 0 ? (
            <SheetCard
              href={liveHref}
              title="Resume Live Table"
              subtitle={`${liveCount} active table${liveCount === 1 ? "" : "s"}`}
              highlight
              onNavigate={() => setPlayOpen(false)}
            />
          ) : null}
          <SheetCard
            href="/session/new"
            title="Start New Table"
            subtitle="Open a LIVE scoring session"
            onNavigate={() => setPlayOpen(false)}
          />
          {TOOL_LINKS.map((tool) => (
            <SheetCard
              key={tool.href}
              href={tool.href}
              title={tool.label}
              subtitle={tool.subtitle}
              soon={tool.soon}
              onNavigate={() => setPlayOpen(false)}
            />
          ))}
        </Sheet>
      ) : null}

      {moreOpen ? (
        <Sheet onClose={() => setMoreOpen(false)} title="Explore Club">
          <div className="grid grid-cols-2 gap-3">
            {CLUB_LEARN_LINKS.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="tap-press flex flex-col items-start gap-3 rounded-2xl border border-[#102A20]/08 bg-white p-4 shadow-[0_4px_16px_-6px_rgba(16,42,32,0.1)]"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-jade-soft text-jade-accent">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-jade-ink">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        </Sheet>
      ) : null}
    </>
  )
}

function TabLink({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string
  label: string
  active: boolean
  icon: typeof CalendarDays
}) {
  return (
    <Link
      href={href}
      className={cn(
        "tap-press relative flex flex-col items-center gap-1 pb-1 pt-2 text-[10px] font-medium",
        active ? "text-jade-accent" : "text-jade-ink/55",
      )}
    >
      {active ? (
        <span className="absolute top-0 h-1 w-5 rounded-full bg-jade-accent" />
      ) : null}
      <Icon className="size-5" />
      {label}
    </Link>
  )
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        aria-label="Close sheet"
        className="sheet-backdrop absolute inset-0 bg-[#102A20]/45"
        onClick={onClose}
      />
      <div className="sheet-panel absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border border-[#102A20]/08 bg-[#F6F4EE] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_-12px_rgba(16,42,32,0.3)]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#102A20]/15" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="tap-press grid size-9 place-items-center rounded-full bg-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}

function SheetCard({
  href,
  title,
  subtitle,
  highlight,
  soon,
  onNavigate,
}: {
  href: string
  title: string
  subtitle: string
  highlight?: boolean
  soon?: boolean
  onNavigate: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "tap-press block rounded-2xl border px-4 py-4 shadow-[0_4px_16px_-6px_rgba(16,42,32,0.1)]",
        highlight
          ? "border-jade-accent/30 bg-jade-soft"
          : "border-[#102A20]/08 bg-white",
      )}
    >
      <div className="flex items-center gap-2">
        <p className="font-serif text-xl leading-none">{title}</p>
        {soon ? (
          <span className="rounded-full bg-jade-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-jade-gold">
            Soon
          </span>
        ) : null}
        {highlight ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-jade-accent px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
            <span className="jade-live-pulse size-1.5 rounded-full bg-white" />
            Live
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </Link>
  )
}

export function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavInner />
    </Suspense>
  )
}
