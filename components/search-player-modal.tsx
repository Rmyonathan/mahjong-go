"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Search, X } from "lucide-react"

import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import { boardLabel } from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

type PlayerHit = {
  id: string
  name: string
  nickname: string
  initials: string
  district: string
  skillRating: number
}

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
  const [players, setPlayers] = useState<PlayerHit[]>([])
  const [searchingPlayers, setSearchingPlayers] = useState(false)
  const [sessions, setSessions] = useState<SessionHit[]>([])
  const [sessionLocked, setSessionLocked] = useState(false)
  const [searchingSessions, setSearchingSessions] = useState(false)
  const [proOpen, setProOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setPlayers([])
    setSearchingPlayers(false)
    setSessions([])
    setSessionLocked(false)
    setSearchingSessions(false)
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
    if (!q) {
      setPlayers([])
      setSearchingPlayers(false)
      setSessions([])
      setSessionLocked(false)
      setSearchingSessions(false)
      return
    }

    let cancelled = false
    setSearchingPlayers(true)

    const shouldSearchSessions = q.length >= 2
    if (shouldSearchSessions) {
      if (!isPro) {
        setSessions([])
        setSessionLocked(true)
        setSearchingSessions(false)
      } else {
        setSessionLocked(false)
        setSearchingSessions(true)
      }
    } else {
      setSessions([])
      setSessionLocked(false)
      setSearchingSessions(false)
    }

    const timer = window.setTimeout(() => {
      const playersPromise = fetch(
        `/api/players/search?q=${encodeURIComponent(q)}`,
      )
        .then(async (response) => {
          const ct = response.headers.get("content-type") ?? ""
          if (!response.ok || !ct.includes("application/json")) return []
          const data = (await response.json()) as { players?: PlayerHit[] }
          return data.players ?? []
        })
        .catch(() => [] as PlayerHit[])

      const sessionsPromise =
        shouldSearchSessions && isPro
          ? fetch(`/api/sessions/search?q=${encodeURIComponent(q)}`)
              .then(async (response) => {
                const ct = response.headers.get("content-type") ?? ""
                if (!response.ok || !ct.includes("application/json")) {
                  return { sessions: [] as SessionHit[], locked: false }
                }
                const data = (await response.json()) as {
                  sessions?: SessionHit[]
                  locked?: boolean
                }
                return {
                  sessions: data.sessions ?? [],
                  locked: Boolean(data.locked),
                }
              })
              .catch(() => ({ sessions: [] as SessionHit[], locked: false }))
          : Promise.resolve(null)

      void Promise.all([playersPromise, sessionsPromise]).then(
        ([playerHits, sessionResult]) => {
          if (cancelled) return
          setPlayers(playerHits)
          setSearchingPlayers(false)
          if (sessionResult) {
            setSessions(sessionResult.sessions)
            setSessionLocked(sessionResult.locked)
            setSearchingSessions(false)
          }
        },
      )
    }, 180)

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

  function openPlayer(id: string) {
    onClose()
    router.push(`/players/${id}`)
  }

  function openSession(id: string) {
    onClose()
    router.push(`/session/${id}`)
  }

  const trimmed = query.trim()

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
                  ? "Search player name, nickname, or session…"
                  : "Search player name or nickname…"
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
            Type name or nickname · Enter → Leaderboard
          </p>
        </form>

        {trimmed.length >= 1 ? (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto border-t border-[#102A20]/10 px-4 pb-4 pt-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Players
              </p>
              {searchingPlayers ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Searching players…
                </p>
              ) : players.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No matching players found.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {players.map((player) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() => openPlayer(player.id)}
                        className="tap-press flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-jade-soft/70"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-jade-soft font-mono text-[11px] font-semibold text-jade-accent">
                            {player.initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-serif text-base leading-tight text-jade-ink">
                              {player.name}
                            </p>
                            <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                              {player.nickname} · {player.district} ·{" "}
                              {player.skillRating}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-jade-ink/40" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {trimmed.length >= 2 ? (
              <div className="border-t border-[#102A20]/10 pt-3">
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
                ) : searchingSessions ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Searching sessions…
                  </p>
                ) : sessions.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No matching sessions in your archive.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {sessions.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => openSession(hit.id)}
                          className="tap-press flex w-full items-start justify-between gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-jade-soft/70"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              {new Date(hit.startedAt).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}{" "}
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
