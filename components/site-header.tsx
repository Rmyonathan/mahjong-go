"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, LogOut, Search, Shield, UserRound } from "lucide-react"

import { SearchPlayerModal } from "@/components/search-player-modal"
import {
  CLUB_LEARN_LINKS,
  DASHBOARD_HREF,
  LEADERBOARD_HREF,
  SCHEDULE_HREF,
  TOOL_LINKS,
} from "@/lib/nav"
import { cn } from "@/lib/utils"

type AuthUser = {
  id: string
  name: string
  role: "ADMIN" | "MEMBER"
  playerId?: string | null
}

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [liveCount, setLiveCount] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
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
    void Promise.all([
      fetch("/api/auth/me").then(async (response) => {
        if (!response.ok) return null
        const data = (await response.json()) as { user?: AuthUser | null }
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
        setAuthReady(true)
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null)
          setLiveCount(0)
          setAuthReady(true)
        }
      })
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
  const brandHref = loggedIn ? DASHBOARD_HREF : "/"
  // Always hub when multiple tables — never inflate the CTA label
  const liveHref = "/live"
  const homeActive = pathname === "/"

  return (
    <>
      <header className="site-header sticky top-0 z-40 border-b border-[#102A20]/10 bg-[#F6F4EE]/85 backdrop-blur-md">
        <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:gap-3 sm:px-6">
          {/* Brand — logo + title, never shrink away */}
          <Link
            href={brandHref}
            className="tap-press z-10 flex shrink-0 items-center gap-2.5 text-jade-ink"
            aria-label="Jade Mahjong home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/jade.png"
              alt="Jade Mahjong"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-[#102A20]/10"
            />
            <span className="font-serif text-base font-semibold tracking-tight sm:text-lg">
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
                  href={SCHEDULE_HREF}
                  className={cn(
                    "tap-press shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    scheduleActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70 hover:text-jade-ink",
                  )}
                >
                  Schedule
                </Link>
                <Link
                  href={LEADERBOARD_HREF}
                  className={cn(
                    "tap-press shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    boardActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70 hover:text-jade-ink",
                  )}
                >
                  Leaderboard
                </Link>

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
                            key={item.href}
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
                            key={item.href}
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
                  href="/"
                  className={cn(
                    "tap-press shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    homeActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70",
                  )}
                >
                  Home
                </Link>
                <Link
                  href={SCHEDULE_HREF}
                  className={cn(
                    "tap-press shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    scheduleActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70",
                  )}
                >
                  Schedule
                </Link>
                <Link
                  href={LEADERBOARD_HREF}
                  className={cn(
                    "tap-press shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    boardActive
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70",
                  )}
                >
                  Leaderboard
                </Link>
                <Link
                  href="/about"
                  className={cn(
                    "tap-press shrink-0 rounded-full px-3 py-2 text-sm font-medium transition",
                    pathname === "/about" || pathname.startsWith("/about/")
                      ? "bg-jade-soft text-jade-accent"
                      : "text-jade-ink/75 hover:bg-jade-soft/70",
                  )}
                >
                  About
                </Link>
              </nav>
            )}
          </div>

          {/* Right cluster */}
          <div className="z-10 flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
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

                {liveCount > 0 ? (
                  <Link
                    href={liveHref}
                    className="tap-press inline-flex h-9 max-w-[9.5rem] items-center gap-1.5 rounded-full bg-jade-accent px-3 text-xs font-semibold text-white shadow-[0_6px_18px_-6px_rgba(22,121,76,0.55)] sm:h-10 sm:max-w-none sm:px-3.5 sm:text-sm"
                    title={`${liveCount} live table${liveCount === 1 ? "" : "s"}`}
                  >
                    <span className="jade-live-pulse size-2 shrink-0 rounded-full bg-white" />
                    <span className="truncate">
                      Live{liveCount > 1 ? ` · ${liveCount}` : ""}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href="/session/new"
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

                {/* Mobile search / live already handled; live shows above */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="tap-press hidden size-9 place-items-center rounded-full border border-[#102A20]/10 bg-white text-jade-ink min-[380px]:grid md:hidden"
                  aria-label="Search players"
                >
                  <Search className="size-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={cn(
                  "tap-press inline-flex h-9 items-center rounded-full bg-jade-accent px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(22,121,76,0.55)] sm:h-10",
                  !authReady && "opacity-70",
                )}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <SearchPlayerModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
