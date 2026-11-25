"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import {
  CalendarDays,
  Home,
  LayoutGrid,
  Plus,
  LogOut,
  Trophy,
  UserRound,
} from "lucide-react"

import {
  ADMIN_MORE_LINKS,
  CLUB_LEARN_LINKS,
  DASHBOARD_HREF,
  LEADERBOARD_HREF,
  MORE_TOURNAMENTS_LINK,
  MORE_PROFILE_LINK,
  TOOL_LINKS,
} from "@/lib/nav"
import { cn } from "@/lib/utils"

type AuthUser = {
  id: string
  role?: "ADMIN" | "MEMBER"
}

function MobileBottomNavInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [liveCount, setLiveCount] = useState(0)
  const [liveHref, setLiveHref] = useState("/live")
  const [playOpen, setPlayOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const loggedIn = Boolean(user)
  const isAdmin = user?.role === "ADMIN"

  const tvMode = searchParams.get("tv") === "1"
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [meetModalOpen, setMeetModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [tournamentModalOpen, setTournamentModalOpen] = useState(false)

  const hideChrome =
    tvMode ||
    scanModalOpen ||
    meetModalOpen ||
    inviteModalOpen ||
    tournamentModalOpen ||
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/hk") ||
    pathname.startsWith("/admin")

  useEffect(() => {
    const sync = () => {
      setScanModalOpen(document.body.dataset.scanModal === "1")
      setMeetModalOpen(document.body.dataset.createMeetModal === "1")
      setInviteModalOpen(document.body.dataset.inviteModal === "1")
      setTournamentModalOpen(document.body.dataset.tournamentModal === "1")
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [
        "data-scan-modal",
        "data-create-meet-modal",
        "data-invite-modal",
        "data-tournament-modal",
      ],
    })
    return () => observer.disconnect()
  }, [])

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
        const data = (await response.json()) as {
          user?: AuthUser | null
        }
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
      .then(([nextUser, liveSessions]) => {
        if (cancelled) return
        setUser(nextUser)
        setLiveCount(nextUser ? liveSessions.length : 0)
        setLiveHref("/live")
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null)
          setLiveCount(0)
        }
      })
    return () => {
      cancelled = true
    }
  }, [pathname])

  const showNavBar = !hideChrome && !playOpen && !moreOpen

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    setPlayOpen(false)
    setMoreOpen(false)
    try {
      window.sessionStorage.removeItem("jade_pending_hand")
      window.localStorage.removeItem("jade_live_session")
    } catch {
      /* ignore */
    }
    router.push("/login")
    router.refresh()
  }

  if (hideChrome) return null

  // EDIT HERE — bottom tab destinations
  const homeHref = loggedIn ? DASHBOARD_HREF : "/"
  const homeActive =
    pathname === homeHref ||
    (loggedIn &&
      (pathname === DASHBOARD_HREF ||
        pathname.startsWith(`${DASHBOARD_HREF}/`))) ||
    (!loggedIn && pathname === "/")
  const scheduleActive =
    pathname === "/schedule" || pathname.startsWith("/schedule/")
  const leaderboardActive =
    pathname === LEADERBOARD_HREF ||
    pathname.startsWith(`${LEADERBOARD_HREF}/`)
  const moreActive =
    pathname === MORE_TOURNAMENTS_LINK.href ||
    pathname.startsWith(`${MORE_TOURNAMENTS_LINK.href}/`) ||
    pathname === "/me" ||
    pathname.startsWith("/players/") ||
    CLUB_LEARN_LINKS.some(
      (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
    ) ||
    TOOL_LINKS.some(
      (link) =>
        !link.soon &&
        (pathname === link.href || pathname.startsWith(`${link.href}/`)),
    ) ||
    (isAdmin && pathname.startsWith("/admin"))

  // Guests: Home · Schedule · Leaderboard · Sign In
  if (!loggedIn) {
    return (
      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-[#102A20]/10 bg-white/90 backdrop-blur-lg md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile guest"
      >
        <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-4 items-end px-1 pb-2 pt-1">
          <TabLink href="/" label="Home" active={pathname === "/"} icon={Home} />
          <TabLink
            href="/schedule"
            label="Schedule"
            active={scheduleActive}
            icon={CalendarDays}
          />
          <TabLink
            href={LEADERBOARD_HREF}
            label="Ranks"
            active={leaderboardActive}
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
      {showNavBar ? (
      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-[#102A20]/10 bg-white/90 backdrop-blur-lg md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile"
      >
        <div className="relative mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 items-end px-2 pb-2 pt-1">
          <TabLink
            href={homeHref}
            label="Home"
            active={homeActive}
            icon={Home}
          />
          <TabLink
            href="/schedule"
            label="Schedule"
            active={scheduleActive}
            icon={CalendarDays}
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

          <TabLink
            href={LEADERBOARD_HREF}
            label="Ranks"
            active={leaderboardActive}
            icon={Trophy}
          />

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
        </div>
      </nav>
      ) : null}

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
            href="/schedule?create=1"
            title="Start New Table"
            subtitle="Create a meet on the schedule"
            onNavigate={() => setPlayOpen(false)}
          />
          {TOOL_LINKS.map((tool) => (
            <SheetCard
              key={tool.id}
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
        <Sheet onClose={() => setMoreOpen(false)} title="More">
          <SheetCard
            href={MORE_TOURNAMENTS_LINK.href}
            title={MORE_TOURNAMENTS_LINK.label}
            subtitle={MORE_TOURNAMENTS_LINK.subtitle}
            onNavigate={() => setMoreOpen(false)}
          />
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Club &amp; Learn
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[MORE_PROFILE_LINK, ...CLUB_LEARN_LINKS].map((item) => {
              const Icon = item.icon
              const linkKey = "id" in item ? item.id : item.href
              return (
                <Link
                  key={linkKey}
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
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Tools
          </p>
          <div className="mt-2 space-y-3">
            {TOOL_LINKS.map((tool) => (
              <SheetCard
                key={`more-${tool.id}`}
                href={tool.href}
                title={tool.label}
                subtitle={tool.subtitle}
                soon={tool.soon}
                onNavigate={() => setMoreOpen(false)}
              />
            ))}
          </div>
          {isAdmin ? (
            <>
              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Admin
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
            {ADMIN_MORE_LINKS.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="tap-press flex flex-col items-start gap-3 rounded-2xl border border-jade-gold/40 bg-jade-gold/10 p-4"
                    >
                      <span className="grid size-10 place-items-center rounded-xl bg-white text-jade-accent">
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
            </>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            className="tap-press mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-jade-red/35 bg-white py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-jade-red"
          >
            <LogOut className="size-4" aria-hidden />
            Logout
          </button>
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
        <div className="mb-4">
          <h2 className="font-serif text-2xl">{title}</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Tap outside to close
          </p>
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
  const className = cn(
    "block rounded-2xl border px-4 py-4 shadow-[0_4px_16px_-6px_rgba(16,42,32,0.1)]",
    soon ? "opacity-90" : "tap-press",
    highlight
      ? "border-jade-accent/30 bg-jade-soft"
      : "border-[#102A20]/08 bg-white",
  )
  const body = (
    <>
      <div className="flex items-center gap-2">
        <p className="font-serif text-xl leading-none">{title}</p>
        {soon ? (
          <span className="rounded-full bg-jade-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-jade-gold">
            Soon
          </span>
        ) : null}
        {highlight ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-jade-accent px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white">
            <span className="jade-live-pulse size-1.5 rounded-full bg-white" />
            Live
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </>
  )

  if (soon) {
    return <div className={className}>{body}</div>
  }

  return (
    <Link href={href} onClick={onNavigate} className={className}>
      {body}
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
