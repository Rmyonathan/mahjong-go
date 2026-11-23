"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { cn } from "@/lib/utils"

type AuthTab = "login" | "register"

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-12">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <AuthForm />
    </Suspense>
  )
}

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next")
  const [tab, setTab] = useState<AuthTab>(
    searchParams.get("tab") === "register" ? "register" : "login",
  )
  const [name, setName] = useState("")
  const [email, setEmail] = useState(
    tab === "login" ? "admin@jade.local" : "",
  )
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function switchTab(next: AuthTab) {
    setTab(next)
    setError(null)
    if (next === "register") {
      setEmail("")
      setPassword("")
    } else {
      setEmail("admin@jade.local")
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const endpoint =
        tab === "login" ? "/api/auth/login" : "/api/auth/register"
      const body =
        tab === "login"
          ? { email, password }
          : { name, email, password }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await response.json()) as {
        error?: string
        user?: { role: string; playerId?: string | null }
      }
      if (!response.ok) {
        setError(data.error ?? (tab === "login" ? "Login failed" : "Sign up failed"))
        return
      }
      if (nextPath && nextPath.startsWith("/")) {
        router.push(nextPath)
      } else if (data.user?.playerId) {
        router.push(`/players/${data.user.playerId}`)
      } else {
        router.push(
          data.user?.role === "ADMIN" ? "/admin/accounts" : "/dashboard",
        )
      }
      router.refresh()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:py-14">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/jade.png"
          alt=""
          width={72}
          height={72}
          className="size-[4.5rem] rounded-2xl object-contain shadow-[0_10px_30px_-12px_rgba(22,121,76,0.45)]"
          priority
        />
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Jade Mahjong Club
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">
          {tab === "login" ? "Welcome back" : "Join the house"}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {tab === "login"
            ? "Sign in to book seats, log tables, and unlock club tools."
            : "Create a free account in seconds — starts at 1400 skill rating."}
        </p>
      </div>

      <div className="rounded-[1.35rem] border border-[#102A20]/10 bg-white/90 p-2 shadow-[0_20px_50px_-24px_rgba(16,42,32,0.35)] backdrop-blur-sm">
        <div
          className="grid grid-cols-2 gap-1 rounded-full bg-[#F6F4EE] p-1"
          role="tablist"
        >
          {(
            [
              ["login", "Sign in"],
              ["register", "Create account"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => switchTab(id)}
              className={cn(
                "tap-press rounded-full px-3 py-2.5 text-sm font-semibold transition",
                tab === id
                  ? "bg-jade-accent text-white shadow-[0_6px_16px_-8px_rgba(22,121,76,0.7)]"
                  : "text-jade-ink/65 hover:text-jade-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-3 pb-4 pt-5 sm:px-5">
          {tab === "register" ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Name
              </span>
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Sari Lestari"
                className="h-12 w-full rounded-2xl border border-[#102A20]/10 bg-[#F6F4EE] px-4 outline-none ring-jade-accent/30 transition focus:bg-white focus:ring-2"
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {tab === "register" ? "Email or username" : "Email"}
            </span>
            <input
              type={tab === "login" ? "email" : "text"}
              required
              autoComplete={tab === "login" ? "email" : "username"}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={
                tab === "register" ? "sari or sari@email.com" : "you@email.com"
              }
              className="h-12 w-full rounded-2xl border border-[#102A20]/10 bg-[#F6F4EE] px-4 outline-none ring-jade-accent/30 transition focus:bg-white focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              required
              minLength={tab === "register" ? 6 : undefined}
              autoComplete={
                tab === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#102A20]/10 bg-[#F6F4EE] px-4 outline-none ring-jade-accent/30 transition focus:bg-white focus:ring-2"
            />
            {tab === "register" ? (
              <span className="mt-1.5 block text-xs text-muted-foreground">
                At least 6 characters
              </span>
            ) : null}
          </label>
          {error ? (
            <p className="rounded-xl bg-jade-red/10 px-3 py-2 text-sm text-jade-red">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="tap-press inline-flex h-12 w-full items-center justify-center rounded-full bg-jade-accent text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(22,121,76,0.7)] disabled:opacity-50"
          >
            {pending
              ? tab === "login"
                ? "Signing in…"
                : "Creating…"
              : tab === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Guests can browse the{" "}
        <Link
          href="/leaderboard"
          className="font-semibold text-jade-accent underline-offset-2 hover:underline"
        >
          leaderboard
        </Link>
        {" · "}
        Sign in for tables, coaching, and club tools.
      </p>
    </main>
  )
}
