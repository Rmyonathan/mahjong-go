"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { UserRound } from "lucide-react"

interface AuthUser {
  id: string
  email: string
  name: string
  role: "ADMIN" | "MEMBER"
  playerId?: string | null
}

export function AuthControls({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return null
        const data = (await response.json()) as { user: AuthUser | null }
        return data.user
      })
      .then((next) => {
        if (!cancelled) {
          setUser(next)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [pathname])

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    try {
      window.sessionStorage.removeItem("jade_pending_hand")
      window.localStorage.removeItem("jade_live_session")
    } catch {
      /* ignore */
    }
    if (pathname.startsWith("/session")) {
      router.replace("/login")
    } else {
      router.push("/login")
    }
    router.refresh()
  }

  if (!loaded) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        …
      </span>
    )
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={
          compact
            ? "border-b-[2px] border-jade-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.16em]"
            : "border-[2px] border-jade-ink bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-muted"
        }
      >
        Login
      </Link>
    )
  }

  const profileHref = user.playerId ? `/players/${user.playerId}` : "/me"

  return (
    <div
      className={
        compact
          ? "flex flex-col border-t-[2px] border-jade-ink"
          : "flex items-center gap-2"
      }
    >
      <Link
        href={profileHref}
        title={`Profile · ${user.name}`}
        aria-label={`Open profile for ${user.name}`}
        className={
          compact
            ? "flex items-center gap-3 border-b-[2px] border-jade-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.16em]"
            : "grid size-10 place-items-center border-[2px] border-jade-ink bg-card text-jade-ink hover:bg-muted"
        }
      >
        <span
          className={
            compact
              ? "grid size-8 place-items-center border-[2px] border-jade-ink bg-parchment"
              : undefined
          }
        >
          <UserRound className="size-4" strokeWidth={2} />
        </span>
        {compact ? <span className="truncate">{user.name}</span> : null}
      </Link>
      {user.role === "ADMIN" ? (
        <Link
          href="/admin/accounts"
          className={
            compact
              ? "border-b-[2px] border-jade-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.16em]"
              : "border-[2px] border-jade-ink bg-jade-ink px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-parchment"
          }
        >
          Admin
        </Link>
      ) : null}
      <button
        type="button"
        onClick={logout}
        className={
          compact
            ? "border-b-[2px] border-jade-ink px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.16em]"
            : "border-[2px] border-jade-ink bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-muted"
        }
      >
        Logout
      </button>
    </div>
  )
}
