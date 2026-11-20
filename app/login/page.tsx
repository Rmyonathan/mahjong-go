"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("admin@jade.local")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = (await response.json()) as { error?: string; user?: { role: string } }
      if (!response.ok) {
        setError(data.error ?? "Login failed")
        return
      }
      router.push(data.user?.role === "ADMIN" ? "/admin/accounts" : "/leaderboard")
      router.refresh()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Kedai gate
      </p>
      <h1 className="mt-3 font-serif text-5xl">Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Admin and member accounts live in Postgres (`JadeMahjong`).
      </p>
      <form onSubmit={onSubmit} className="jade-card mt-8 space-y-4 p-5">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-parchment px-3 outline-none"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-parchment px-3 outline-none"
          />
        </label>
        {error ? (
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-jade-red">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="scan-cta-accent inline-flex h-10 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/leaderboard" className="underline">
          Back to leaderboard
        </Link>
      </p>
    </main>
  )
}
