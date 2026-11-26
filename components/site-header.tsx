"use client"

import Link, { useLinkStatus } from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  ChevronDown,
  LogOut,
  Search,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react"

import { NotificationBell } from "@/components/notification-bell"
import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import { SearchPlayerModal } from "@/components/search-player-modal"
import {
  CLUB_LEARN_LINKS,
  DASHBOARD_HREF,
  LEADERBOARD_HREF,
  SCHEDULE_HREF,
  TOOL_LINKS,
  TOURNAMENTS_HREF,
} from "@/lib/nav"
import { cn } from "@/lib/utils"

type AuthUser = {
  id: string
  name: string
  role: "ADMIN" | "MEMBER"
  playerId?: string | null
  isPro?: boolean
  membershipTier?: "FREE" | "PRO"
  proExpiresAt?: string | null
}

function NavLinkPendingBar() {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-jade-accent transition-opacity duration-150",
        pending ? "animate-pulse opacity-100" : "opacity-0",
      )}
    />
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [liveCount, setLiveCount] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [proModalOpen, setProModalOpen] = useState(false)
  const [clubOpen, setClubOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const clubRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const loggedIn = Boolean(user)

  useEffect(() => {
    setClubOpen(false)
    setToolsOpen(false)
    setUserOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      const target = event.target as Node
      if (clubRef.current && !clubRef.current.contains(target)) setClubOpen(false)
      if (toolsRef.current && !toolsRef.current.contains(target)) setToolsOpen(false)
      if (userRef.current && !userRef.current.contains(target)) setUserOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadHeaderAuth() {
      try {
        const meRes = await fetch("/api/auth/me")
        const meCt = meRes.headers.get("content-type") ?? ""
        const nextUser =
          meRes.ok && meCt.includes("application/json")
            ? (((await meRes.json()) as { user?: AuthUser | null }).user ?? null)
            : null

        if (cancelled) return
        setUser(nextUser)

        if (!nextUser) {
          setLiveCount(0)
          setAuthReady(true)
          return
        }

        const sessRes = await fetch("/api/sessions")
        const sessCt = sessRes.headers.get("content-type") ?? ""
        const liveSessions =
          sessRes.ok && sessCt.includes("application/json")
            ? (((await sessRes.json()) as { liveSessions?: Array<{ id: string }> })
                .liveSessions ?? [])
            : []

        if (cancelled) return
        setLiveCount(liveSessions.length)
        setAuthReady(true)
      } catch {
        if (!cancelled) {
          setUser(null)
          setLiveCount(0)
          setAuthReady(true)
        }
      }
    }

    void loadHeaderAuth()
    return () => {
      cancelled = true
    }
  }, [pathname])

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    setUserOpen(false)
    try {
      window.sessionStorage.removeItem("jade_pending_hand")
      window.localStorage.removeItem("jade_live_session")
    } catch {
      /* ignore */
    }
    router.push("/login")
    router.refresh()
  }

  const scheduleActive =
    pathname === SCHEDULE_HREF || pathname.startsWith(`${SCHEDULE_HREF}/`)
  const tourneyActive =
    pathname === TOURNAMENTS_HREF ||
    pathname.startsWith(`${TOURNAMENTS_HREF}/`)
  const boardActive =
    pathname === LEADERBOARD_HREF || pathname.startsWith(`${LEADERBOARD_HREF}/`)
  const clubActive = CLUB_LEARN_LINKS.some(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  )
  const toolsActive =
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/scan") ||
    pathname.startsWith("/hk")

  const initials =
    user?.name
      ?.split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"

  const profileHref = user?.playerId ? `/players/${user.playerId}` : "/me"
  const isProUser = Boolean(user?.isPro || user?.role === "ADMIN")
  const proDaysLeft =
    user && user.role !== "ADMIN" && user.isPro && user.proExpiresAt
      ? Math.ceil(
          (new Date(user.proExpiresAt).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000),
        )
      : null
  const proExpiringSoon =
    proDaysLeft != null && proDaysLeft <= 7 && proDaysLeft >= 0
  const brandHref = loggedIn ? DASHBOARD_HREF : "/"
  // Always hub when multiple tables — never inflate the CTA label
  const liveHref = "/live"
  // EDIT HERE — logged-in Home → dashboard; guests → landing
  const homeHref = loggedIn ? DASHBOARD_HREF : "/"
  const homeActive =
    pathname === homeHref ||
    (loggedIn &&
      (pathname === DASHBOARD_HREF || pathname.startsWith(`${DASHBOARD_HREF}/`))) ||
    (!loggedIn && pathname === "/")

  return (
    <>
      <header className="site-header sticky top-0 z-40 border-b border-[#102A20]/10 bg-[#F6F4EE]/85 backdrop-blur-md">
        <div className="mx-auto grid h-14 w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 px-3 sm:h-16 sm:gap-3 sm:px-6">
          {/* Brand — logo + title, compact on mobile to leave room for actions */}
          <Link
            href={brandHref}
            className="tap-press z-10 flex shrink-0 items-center gap-1.5 text-jade-ink sm:gap-2.5"
            aria-label="Jade Mahjong home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/jade.png"
              alt="Jade Mahjong"
              width={36}
              height={36}
              className="h-7 w-7 shrink-0 rounded-lg object-cover ring-1 ring-[#102A20]/10 sm:h-9 sm:w-9 sm:rounded-xl"
            />
            <span className="font-serif text-sm font-semibold tracking-tight sm:text-lg">
              Jade Mahjong
            </span>
          </Link>

          {/* Desktop center nav — no overflow scroll (was showing a scrollbar in the pill) */}
          <div className="hidden min-w-0 justify-center md:flex">
            {loggedIn ? (
              <nav
                aria-label="Primary"
                className="inline-flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-full border border-[#102A20]/10 bg-white/80 p-1 shadow-[0_4px_20px_-6px_rgba(16,42,32,0.12)]"
              >
                <Link
                  href={DASHBOARD_HREF}
                  className={cn(
                    "tap-press relative shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    homeActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70 hover:text-jade-ink",
                  )}
                >
                  Home
                  <NavLinkPendingBar />
                </Link>
                <Link
                  href={SCHEDULE_HREF}
                  className={cn(
                    "tap-press relative shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    scheduleActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70 hover:text-jade-ink",
                  )}
                >
                  Schedule
                  <NavLinkPendingBar />
                </Link>
                <Link
                  href={TOURNAMENTS_HREF}
                  className={cn(
                    "tap-press relative shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    tourneyActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70 hover:text-jade-ink",
                  )}
                >
                  Tourney
                  <NavLinkPendingBar />
                </Link>
                <Link
                  href={LEADERBOARD_HREF}
                  className={cn(
                    "tap-press relative shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    boardActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70 hover:text-jade-ink",
                  )}
                >
                  Leaderboard
                  <NavLinkPendingBar />
                </Link>
                {user?.role === "ADMIN" ? (
                  <Link
                    href="/admin/accounts"
                    className={cn(
                      "tap-press relative shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                      pathname.startsWith("/admin")
                        ? "bg-jade-soft text-jade-accent"
                        : "text-jade-ink/75 hover:bg-jade-soft/70 hover:text-jade-ink",
                    )}
                  >
                    Admin
                    <NavLinkPendingBar />
                  </Link>
                ) : null}

                <div className="relative shrink-0" ref={clubRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setClubOpen((v) => !v)
                      setToolsOpen(false)
                    }}
                    className={cn(
                      "tap-press inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition",
                      clubActive || clubOpen
                        ? "bg-jade-soft text-jade-accent"
                        : "text-jade-ink/75 hover:bg-jade-soft/70 hover:text-jade-ink",
                    )}
                  >
                    Club & Learn
                    <ChevronDown className="size-3.5 opacity-70" />
                  </button>
                  {clubOpen ? (
                    <div className="absolute left-1/2 top-[calc(100%+0.6rem)] z-50 w-72 -translate-x-1/2 rounded-2xl border border-[#102A20]/10 bg-white p-2 shadow-[0_16px_40px_-12px_rgba(16,42,32,0.25)]">
                      {CLUB_LEARN_LINKS.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => setClubOpen(false)}
                            className="tap-press flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-jade-soft"
                          >
                            <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-jade-soft text-jade-accent">
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-jade-ink">
                                {item.label}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {item.subtitle}
                              </span>
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="relative shrink-0" ref={toolsRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen((v) => !v)
                      setClubOpen(false)
                    }}
                    className={cn(
                      "tap-press inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition",
                      toolsActive || toolsOpen
                        ? "bg-jade-soft text-jade-accent"
                        : "text-jade-ink/75 hover:bg-jade-soft/70 hover:text-jade-ink",
                    )}
                  >
                    Tools
                    <ChevronDown className="size-3.5 opacity-70" />
                  </button>
                  {toolsOpen ? (
                    <div className="absolute left-1/2 top-[calc(100%+0.6rem)] z-50 w-72 -translate-x-1/2 rounded-2xl border border-[#102A20]/10 bg-white p-2 shadow-[0_16px_40px_-12px_rgba(16,42,32,0.25)]">
                      {TOOL_LINKS.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => setToolsOpen(false)}
                            className="tap-press flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-jade-soft"
                          >
                            <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-jade-soft text-jade-accent">
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2 text-sm font-medium text-jade-ink">
                                {item.label}
                                {item.soon ? (
                                  <span className="rounded-full bg-jade-gold/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-jade-gold">
                                    Soon
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {item.subtitle}
                              </span>
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </nav>
            ) : (
              <nav
                aria-label="Guest"
                className="inline-flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-full border border-[#102A20]/10 bg-white/80 p-1 shadow-[0_4px_20px_-6px_rgba(16,42,32,0.12)]"
              >
                <Link
                  href={homeHref}
                  className={cn(
                    "tap-press relative shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    homeActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70",
                  )}
                >
                  Home
                  <NavLinkPendingBar />
                </Link>
                <Link
                  href={SCHEDULE_HREF}
                  className={cn(
                    "tap-press relative shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    scheduleActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70",
                  )}
                >
                  Schedule
                  <NavLinkPendingBar />
                </Link>
                <Link
                  href={LEADERBOARD_HREF}
                  className={cn(
                    "tap-press relative shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    boardActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70",
                  )}
                >
                  Leaderboard
                  <NavLinkPendingBar />
                </Link>
                <Link
                  href="/about"
                  className={cn(
                    "tap-press relative shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    pathname === "/about" || pathname.startsWith("/about/")
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70",
                  )}
                >
                  About
                  <NavLinkPendingBar />
                </Link>
              </nav>
            )}
          </div>

          {/* Right cluster */}
          <div className="z-10 flex shrink-0 items-center justify-end gap-1 sm:gap-2">
            {loggedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="tap-press hidden size-10 place-items-center rounded-full border border-[#102A20]/10 bg-white text-jade-ink shadow-sm hover:bg-jade-soft md:grid"
                  aria-label="Search players"
                >
                  <Search className="size-4" />
                </button>

                <NotificationBell loggedIn={loggedIn} />

                <button
                  type="button"
                  onClick={() => setProModalOpen(true)}
                  className={cn(
                    "tap-press inline-flex h-8 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition sm:h-10 sm:px-3.5 sm:text-sm",
                    !isProUser
                      ? "border border-jade-gold/50 bg-jade-gold/20 text-jade-ink hover:bg-jade-gold/30"
                      : proExpiringSoon
                        ? "bg-jade-gold text-jade-ink shadow-sm"
                        : "border border-[#102A20]/12 bg-white text-jade-ink hover:bg-jade-soft",
                  )}
                  aria-label={
                    !isProUser
                      ? "Upgrade to Pro"
                      : proExpiringSoon
                        ? "Perpanjang Pro"
                        : "Pro pricing and benefits"
                  }
                >
                  <Sparkles className="size-3 shrink-0 text-jade-gold sm:size-3.5" aria-hidden />
                  <span className="hidden sm:inline">
                    {!isProUser
                      ? "Upgrade"
                      : proExpiringSoon
                        ? `Perpanjang · ${proDaysLeft}d`
                        : "Pro"}
                  </span>
                  <span className="sm:hidden">
                    {!isProUser
                      ? "Pro"
                      : proExpiringSoon
                        ? "Renew"
                        : "Pro"}
                  </span>
                </button>

                {liveCount > 0 ? (
                  <Link
                    href={liveHref}
                    className="tap-press inline-flex h-8 max-w-[7.5rem] items-center gap-1 rounded-full bg-jade-accent px-2.5 text-[11px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(22,121,76,0.55)] sm:h-10 sm:max-w-none sm:gap-1.5 sm:px-3.5 sm:text-sm"
                    title={`${liveCount} live table${liveCount === 1 ? "" : "s"}`}
                  >
                    <span className="jade-live-pulse size-1.5 shrink-0 rounded-full bg-white sm:size-2" />
                    <span className="truncate">
                      Live{liveCount > 1 ? ` · ${liveCount}` : ""}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href="/schedule?create=1"
                    className="tap-press hidden h-10 items-center rounded-full bg-jade-accent px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(22,121,76,0.55)] md:inline-flex"
                  >
                    + New Table
                  </Link>
                )}

                <div className="relative hidden md:block" ref={userRef}>
                  <button
                    type="button"
                    onClick={() => setUserOpen((v) => !v)}
                    className="tap-press grid size-10 place-items-center rounded-full bg-jade-ink font-mono text-[11px] font-semibold tracking-wide text-white"
                    aria-label="Account menu"
                  >
                    {initials}
                  </button>
                  {userOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-52 rounded-2xl border border-[#102A20]/10 bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(16,42,32,0.25)]">
                      <Link
                        href={profileHref}
                        onClick={() => setUserOpen(false)}
                        className="tap-press flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-jade-soft"
                      >
                        <UserRound className="size-4 text-jade-accent" />
                        My Profile
                      </Link>
                      {user?.role === "ADMIN" ? (
                        <Link
                          href="/admin/accounts"
                          onClick={() => setUserOpen(false)}
                          className="tap-press flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-jade-soft"
                        >
                          <Shield className="size-4 text-jade-accent" />
                          Admin Panel
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={logout}
                        className="tap-press flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-jade-soft"
                      >
                        <LogOut className="size-4 text-jade-red" />
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Mobile search */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="tap-press grid size-8 place-items-center rounded-full border border-[#102A20]/10 bg-white text-jade-ink md:hidden"
                  aria-label="Search players"
                >
                  <Search className="size-3.5" />
                </button>
              </>
            ) : !authReady ? (
              <span
                aria-hidden
                className="inline-flex h-9 w-20 animate-pulse rounded-full bg-jade-ink/10 sm:h-10"
              />
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setProModalOpen(true)}
                  className="tap-press inline-flex h-9 items-center gap-1 rounded-full border border-jade-gold/50 bg-jade-gold/15 px-2.5 text-xs font-semibold text-jade-ink hover:bg-jade-gold/25 sm:h-10 sm:px-3.5 sm:text-sm"
                >
                  <Sparkles className="size-3.5 shrink-0 text-jade-gold" aria-hidden />
                  <span>Pricing</span>
                </button>
                <Link
                  href="/login"
                  className="tap-press inline-flex h-9 items-center rounded-full bg-jade-accent px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(22,121,76,0.55)] sm:h-10"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <SearchPlayerModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        isPro={Boolean(user?.isPro || user?.role === "ADMIN")}
        accountName={user?.name}
      />

      <ProPerkModal
        open={proModalOpen}
        onClose={() => setProModalOpen(false)}
        accountName={user?.name}
        mode={user?.isPro && user?.role !== "ADMIN" ? "renew" : "upgrade"}
        expiresAt={user?.proExpiresAt}
      />
    </>
  )
}
