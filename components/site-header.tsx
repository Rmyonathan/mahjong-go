"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, Search, X } from "lucide-react"

import { AuthControls } from "@/components/auth-controls"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/leaderboard", label: "Meja" },
  { href: "/schedule", label: "Schedule" },
  { href: "/levels", label: "Pangkat" },
  { href: "/combos", label: "Combos" },
  { href: "/scan", label: "Scan" },
  { href: "/about", label: "About" },
] as const

function isActive(pathname: string, href: string) {
  if (href === "/scan") {
    return pathname === "/scan" || pathname.startsWith("/calculator")
  }
  if (href === "/combos") {
    return pathname === "/combos" || pathname.startsWith("/hk")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <header className="site-header sticky top-0 z-40 border-b-[2px] border-jade-ink bg-parchment/95 backdrop-blur-[2px]">
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto flex h-[4.5rem] w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/leaderboard"
          className="flex shrink-0 items-center text-jade-ink"
          aria-label="Jade Mahjong"
        >
          <Image
            src="/jade.png"
            alt="Jade Mahjong BDL"
            width={148}
            height={148}
            priority
            className="h-12 w-12 object-contain sm:h-14 sm:w-14"
          />
        </Link>

        <form
          action="/leaderboard"
          className="mx-auto hidden min-w-0 w-full max-w-sm flex-1 md:flex"
        >
          <label className="sr-only" htmlFor="player-search">
            Search players
          </label>
          <input
            id="player-search"
            name="q"
            type="search"
            placeholder="Cari pemain..."
            autoComplete="off"
            className="h-10 w-full border-[2px] border-r-0 border-jade-ink bg-card px-3 font-mono text-xs uppercase tracking-[0.08em] text-jade-ink outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-jade-ink/45"
          />
          <button
            type="submit"
            aria-label="Search players"
            className="grid size-10 shrink-0 place-items-center border-[2px] border-jade-ink bg-jade-ink text-parchment"
          >
            <Search className="size-4" />
          </button>
        </form>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <nav
            aria-label="House"
            className="flex items-stretch border-[2px] border-jade-ink"
          >
            {NAV.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "border-r-[2px] border-jade-ink px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] last:border-r-0",
                    active
                      ? "bg-jade-ink text-parchment"
                      : "bg-card text-jade-ink hover:bg-muted",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <Link
            href="/session/new"
            className="inline-flex h-10 items-center border-[2px] border-jade-ink bg-jade-accent px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white shadow-[3px_3px_0_0_var(--jade-ink)]"
          >
            + New session
          </Link>
          <AuthControls />
        </div>

        <button
          type="button"
          className="ml-auto grid size-10 place-items-center border-[2px] border-jade-ink bg-card text-jade-ink lg:hidden"
          aria-expanded={open}
          aria-controls="site-nav-drawer"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div id="site-nav-drawer" className="lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-jade-ink/45"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col border-l-[2px] border-jade-ink bg-parchment shadow-[-6px_0_0_0_var(--jade-ink)]">
            <div className="paper-grain pointer-events-none absolute inset-0 opacity-35" aria-hidden />
            <div className="relative flex items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
                Menu
              </span>
              <button
                type="button"
                aria-label="Close menu"
                className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <form action="/leaderboard" className="relative flex border-b-[2px] border-jade-ink p-4">
              <label className="sr-only" htmlFor="player-search-mobile">
                Search players
              </label>
              <input
                id="player-search-mobile"
                name="q"
                type="search"
                placeholder="Cari pemain..."
                autoComplete="off"
                className="h-10 w-full border-[2px] border-r-0 border-jade-ink bg-card px-3 text-sm text-jade-ink outline-none placeholder:text-jade-ink/50"
              />
              <button
                type="submit"
                aria-label="Search players"
                className="grid size-10 shrink-0 place-items-center border-[2px] border-jade-ink bg-jade-ink text-parchment"
              >
                <Search className="size-4" />
              </button>
            </form>
            <nav aria-label="House mobile" className="relative flex flex-col">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "border-b-[2px] border-jade-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.16em]",
                      active ? "bg-jade-ink text-parchment" : "bg-card text-jade-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <Link
                href="/session/new"
                className="border-b-[2px] border-jade-ink bg-jade-accent px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] text-white"
              >
                + New session
              </Link>
              <AuthControls compact />
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  )
}
