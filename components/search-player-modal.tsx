"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import { boardLabel } from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

type SessionHit = {
  id: string
  title: string
  boardType: "BEGINNER" | "ADVANCED" | "MCR" | "GUIDED"
  startedAt: string
  netLabel: string
  wind: string
}

export function SearchPlayerModal({
  open,
  onClose,
  isPro = false,
  accountName,
}: {
  open: boolean
  onClose: () => void
  isPro?: boolean
  accountName?: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [sessions, setSessions] = useState<SessionHit[]>([])
  const [sessionLocked, setSessionLocked] = useState(false)
  const [searching, setSearching] = useState(false)
  const [proOpen, setProOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setSessions([])
    setSessionLocked(false)
    setSearching(false)
    setProOpen(false)
    const id = window.setTimeout(() => inputRef.current?.focus(), 40)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setSessions([])
      setSessionLocked(false)
      setSearching(false)
      return
    }

    // Free users: show Pro lock teaser for session search (no API hit)
    if (!isPro) {
      setSessions([])
      setSessionLocked(true)
      setSearching(false)
      return
    }

    let cancelled = false
    setSearching(true)
    const timer = window.setTimeout(() => {
      void fetch(`/api/sessions/search?q=${encodeURIComponent(q)}`)
        .then(async (response) => {
          const data = (await response.json()) as {
            sessions?: SessionHit[]
            locked?: boolean
          }
          if (cancelled) return
          setSessions(data.sessions ?? [])
          setSessionLocked(Boolean(data.locked))
        })
        .catch(() => {
          if (!cancelled) {
            setSessions([])
            setSessionLocked(false)
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, open, isPro])

  if (!open) return null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const q = query.trim()
    onClose()
    router.push(q ? `/leaderboard?q=${encodeURIComponent(q)}` : "/leaderboard")
  }

  function openSession(id: string) {
    onClose()
    router.push(`/session/${id}`)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] sm:pt-[18vh]">
      <button
        type="button"
        aria-label="Close search"
        className="sheet-backdrop absolute inset-0 bg-[#102A20]/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="sheet-panel relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[#102A20]/10 bg-white shadow-[0_20px_50px_-12px_rgba(16,42,32,0.25)]">
        <form onSubmit={submit} className="p-4">
          <div className="flex items-center gap-2">
            <Search className="size-5 shrink-0 text-jade-accent" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder={
                isPro
                  ? "Search players or your sessions…"
                  : "Search players…"
              }
              autoComplete="off"
              className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={onClose}
              className="tap-press grid size-9 place-items-center rounded-full hover:bg-jade-soft"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Enter → Leaderboard players
            {isPro ? " · type 2+ letters for your sessions" : ""}
          </p>
        </form>

        {query.trim().length >= 2 ? (
          <div className="border-t border-[#102A20]/10 px-4 pb-4 pt-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Your sessions {isPro ? "· Pro archive" : "· Pro"}
            </p>

            {sessionLocked ? (
              <div className="mt-2 rounded-xl border border-dashed border-jade-ink/25 bg-jade-soft/40 px-3 py-3">
                <p className="text-sm text-jade-ink">
                  Search past tables you sat — Pro unlocks your permanent
                  archive from this bar.
                </p>
                <button
                  type="button"
                  onClick={() => setProOpen(true)}
                  className="scan-cta-accent mt-3 inline-flex h-9 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
                >
                  Upgrade to Pro
                </button>
              </div>
            ) : searching ? (
              <p className="mt-2 text-sm text-muted-foreground">Searching…</p>
            ) : sessions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No matching sessions in your archive.
              </p>
            ) : (
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {sessions.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      onClick={() => openSession(hit.id)}
                      className="tap-press flex w-full items-start justify-between gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-jade-soft/70"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {new Date(hit.startedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          · {boardLabel(hit.boardType)} · {hit.wind}
                        </p>
                        <p className="truncate font-serif text-lg leading-tight">
                          {hit.title}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs font-semibold",
                          hit.netLabel.startsWith("-")
                            ? "text-jade-red"
                            : "text-jade-accent",
                        )}
                      >
                        {hit.netLabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <ProPerkModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        accountName={accountName}
      />
    </div>
  )
}
