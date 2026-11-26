"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { ChevronLeft, Search, X } from "lucide-react"

import { JadePageLoader } from "@/components/jade-page-loader"
import {
  type ApiMeet,
  type ApiMeetBoardType,
} from "@/lib/schedule/types"
import {
  DEFAULT_SESSION_TITLE,
  WIND_META,
  windsForSeatCount,
  type LiveBoard,
  type LiveWind,
} from "@/lib/session/live-demo"
import { cn } from "@/lib/utils"

type ClubMember = {
  userId: string
  playerId: string | null
  name: string
  nickname: string
  email?: string
}

type ViewerAuth = {
  id: string
  name: string
  role: "ADMIN" | "MEMBER"
}

type SeatDraft = {
  wind: LiveWind
  /** Club User.id when immediately seated (admin, self, or confirmed meet roster) */
  userId: string | null
  /** Club User.id to invite when a non-admin picks another player */
  invitedUserId: string | null
  playerId: string | null
  name: string
  nickname: string
  guestDraft: string
  searchQuery: string
  searchOpen: boolean
}

function liveBoardFromApi(board: ApiMeetBoardType): LiveBoard {
  if (board === "MCR") return "mcr"
  if (board === "BEGINNER" || board === "GUIDED") return "beginner"
  return "advanced"
}

function emptySeats(seatCount: 3 | 4): SeatDraft[] {
  return windsForSeatCount(seatCount).map((wind) => ({
    wind,
    userId: null,
    invitedUserId: null,
    playerId: null,
    name: "",
    nickname: "",
    guestDraft: "",
    searchQuery: "",
    searchOpen: false,
  }))
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={<JadePageLoader kanji="卓" label="Loading table setup…" />}
    >
      <NewSessionForm />
    </Suspense>
  )
}

/**
 * Create-meet lives on /schedule?create=1 (CreateMeetModal).
 * This page is only the go-live seat picker: /session/new?mode=live&meet=…
 */
function NewSessionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [opening, setOpening] = useState(false)
  const [meetId, setMeetId] = useState<string | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [membersError, setMembersError] = useState<string | null>(null)
  const [viewer, setViewer] = useState<ViewerAuth | null>(null)
  const [confirmedRosterIds, setConfirmedRosterIds] = useState<Set<string>>(
    () => new Set(),
  )

  const [liveTitle, setLiveTitle] = useState(DEFAULT_SESSION_TITLE)
  const [board, setBoard] = useState<LiveBoard>("advanced")
  const [seatCount, setSeatCount] = useState<3 | 4>(4)
  const [seats, setSeats] = useState<SeatDraft[]>(() => emptySeats(4))
  const [error, setError] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)
  const [ready, setReady] = useState(false)

  const isAdmin = viewer?.role === "ADMIN"

  useEffect(() => {
    if (booted) return
    const modeParam = searchParams.get("mode")
    const meetParam = searchParams.get("meet")
    const titleParam = searchParams.get("title")

    // Single create-table UX = schedule Create Meet modal
    if (modeParam !== "live" && !meetParam) {
      router.replace("/schedule?create=1")
      return
    }

    if (titleParam) setLiveTitle(titleParam)
    if (meetParam) setMeetId(meetParam)

    if (meetParam) {
      void fetch(`/api/sessions?meetId=${encodeURIComponent(meetParam)}`)
        .then(async (response) => {
          if (!response.ok) return null
          return (await response.json()) as {
            liveSession?: { id: string } | null
          }
        })
        .then((data) => {
          if (data?.liveSession?.id) {
            router.replace(`/session/live?id=${data.liveSession.id}`)
            return true
          }
          return false
        })
        .then((resumed) => {
          if (resumed) return
          void fetch("/api/schedule")
            .then((response) => response.json())
            .then((data: { meets?: ApiMeet[] }) => {
              const meet = data.meets?.find((entry) => entry.id === meetParam)
              if (!meet) return
              setLiveTitle(meet.title)
              setBoard(liveBoardFromApi(meet.boardType))
              setConfirmedRosterIds(
                new Set(meet.roster.map((player) => player.userId)),
              )
              const nextCount: 3 | 4 = meet.maxSeats === 3 ? 3 : 4
              const winds = windsForSeatCount(nextCount)
              const roster = meet.roster.slice(0, nextCount)
              setSeatCount(nextCount)
              setSeats(
                winds.map((wind, index) => {
                  const player = roster[index]
                  if (!player) {
                    return {
                      wind,
                      userId: null,
                      invitedUserId: null,
                      playerId: null,
                      name: "",
                      nickname: "",
                      guestDraft: "",
                      searchQuery: "",
                      searchOpen: false,
                    }
                  }
                  return {
                    wind,
                    userId: player.userId,
                    invitedUserId: null,
                    playerId: null,
                    name: player.name,
                    nickname: player.nickname,
                    guestDraft: "",
                    searchQuery: "",
                    searchOpen: false,
                  }
                }),
              )
            })
            .catch(() => undefined)
            .finally(() => setReady(true))
        })
        .catch(() => {
          setReady(true)
        })
    } else {
      setReady(true)
    }

    setBooted(true)
  }, [searchParams, booted, router])

  useEffect(() => {
    if (!ready) return
    let cancelled = false

    void Promise.all([
      fetch("/api/members"),
      fetch("/api/auth/me").catch(() => null),
    ])
      .then(async ([membersRes, meRes]) => {
        if (membersRes.status === 401) {
          router.replace(
            `/login?next=${encodeURIComponent(
              `/session/new?mode=live${meetId ? `&meet=${meetId}` : ""}`,
            )}`,
          )
          return
        }
        const membersData = (await membersRes.json()) as {
          members?: ClubMember[]
          error?: string
        }
        if (!membersRes.ok) {
          throw new Error(membersData.error ?? "Could not load members")
        }

        let nextViewer: ViewerAuth | null = null
        if (meRes && meRes.ok) {
          const meCt = meRes.headers.get("content-type") ?? ""
          if (meCt.includes("application/json")) {
            const meData = (await meRes.json()) as {
              user?: ViewerAuth | null
            }
            nextViewer = meData.user ?? null
          }
        }

        if (cancelled) return
        setMembers(membersData.members ?? [])
        setViewer(nextViewer)
        setMembersError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setMembersError(
          err instanceof Error ? err.message : "Could not load members",
        )
      })

    return () => {
      cancelled = true
    }
  }, [ready, router, meetId])

  function setSeatCountAndReset(next: 3 | 4) {
    setSeatCount(next)
    setSeats(emptySeats(next))
  }

  function canDirectAssignMember(memberUserId: string) {
    return (
      isAdmin ||
      memberUserId === viewer?.id ||
      confirmedRosterIds.has(memberUserId)
    )
  }

  function selectSearchedMember(seatIndex: number, member: ClubMember) {
    const directAssign = canDirectAssignMember(member.userId)

    setSeats((prev) => {
      const cleared = prev.map((seat) =>
        seat.userId === member.userId || seat.invitedUserId === member.userId
          ? {
              ...seat,
              userId: null,
              invitedUserId: null,
              playerId: null,
              name: "",
              nickname: "",
              guestDraft: "",
            }
          : seat,
      )
      return cleared.map((seat, index) =>
        index === seatIndex
          ? {
              ...seat,
              userId: directAssign ? member.userId : null,
              invitedUserId: directAssign ? null : member.userId,
              playerId: member.playerId,
              name: member.name,
              nickname: member.nickname,
              guestDraft: "",
              searchQuery: "",
              searchOpen: false,
            }
          : seat,
      )
    })
  }

  function clearSeat(seatIndex: number) {
    setSeats((prev) =>
      prev.map((seat, index) =>
        index === seatIndex
          ? {
              ...seat,
              userId: null,
              invitedUserId: null,
              playerId: null,
              name: "",
              nickname: "",
              guestDraft: "",
              searchQuery: "",
              searchOpen: false,
            }
          : seat,
      ),
    )
  }

  function applyGuest(seatIndex: number) {
    setSeats((prev) =>
      prev.map((seat, index) => {
        if (index !== seatIndex) return seat
        const name = seat.guestDraft.trim()
        if (!name) return seat
        return {
          ...seat,
          userId: null,
          invitedUserId: null,
          playerId: null,
          name,
          nickname: name.split(" ")[0] ?? name,
          guestDraft: "",
          searchQuery: "",
          searchOpen: false,
        }
      }),
    )
  }

  async function openLiveTable() {
    const missing = seats.find((seat) => !seat.name.trim())
    if (missing) {
      setError(
        `Assign or invite a player for ${WIND_META[missing.wind].label} before opening.`,
      )
      return
    }
    setOpening(true)
    setError(null)
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: liveTitle.trim() || DEFAULT_SESSION_TITLE,
          board,
          meetId,
          seats: seats.map(
            ({ wind, userId, invitedUserId, playerId, name, nickname }) => {
              if (userId) {
                return { wind, userId, playerId, name, nickname }
              }
              if (invitedUserId) {
                return {
                  wind,
                  invitedUserId,
                  invite: true,
                  playerId,
                  name,
                  nickname,
                }
              }
              return { wind, guestName: name, name, nickname }
            },
          ),
        }),
      })
      const data = (await response.json()) as {
        error?: string
        session?: { id: string }
      }
      if (!response.ok || !data.session?.id) {
        setError(data.error ?? "Could not open table (login required)")
        return
      }
      router.push(`/session/live?id=${data.session.id}`)
      router.refresh()
    } catch {
      setError("Network error opening table")
    } finally {
      setOpening(false)
    }
  }

  if (!ready) {
    return <JadePageLoader kanji="卓" label="Loading table setup…" />
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/schedule"
        className="tap-press inline-flex items-center gap-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-jade-accent"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Schedule
      </Link>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Session · Go live
      </p>
      <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] tracking-tight sm:text-6xl">
        Seat the table
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {isAdmin
          ? "Search club players to assign them directly, or add a guest name."
          : "Search club players to send a table invite (they accept from their top live banner), or add a guest name."}
      </p>
      <div className="jade-divider mt-6" />

      <div className="jade-card mt-8 space-y-6 p-5 sm:p-6">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
            Session title / event
          </span>
          <input
            value={liveTitle}
            onChange={(event) => setLiveTitle(event.target.value)}
            className="mt-1 h-11 w-full border-[2px] border-jade-ink bg-parchment px-3 font-serif text-xl outline-none"
          />
        </label>

        <fieldset>
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em]">
            Table size
          </legend>
          <div className="mt-2 flex border-[2px] border-jade-ink">
            {(
              [
                [4, "4-seat table"],
                [3, "3-seat table"],
              ] as const
            ).map(([count, label], index) => (
              <button
                key={count}
                type="button"
                onClick={() => setSeatCountAndReset(count)}
                className={cn(
                  "flex-1 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em]",
                  index > 0 && "border-l-[2px] border-jade-ink",
                  seatCount === count
                    ? "bg-jade-accent text-white"
                    : "bg-card text-jade-ink hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <section aria-label="Seat assignment">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em]">
              Seat assignment · search player or add guest
            </h2>
            {!isAdmin && viewer ? (
              <span className="rounded-full bg-jade-gold/15 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-jade-ink">
                Club players join via invite
              </span>
            ) : null}
          </div>
          {membersError ? (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red">
              {membersError}
            </p>
          ) : null}
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {seats.map((seat, seatIndex) => {
              const q = seat.searchQuery.trim().toLowerCase()
              const matches = q
                ? members
                    .filter((member) => {
                      const takenElsewhere = seats.some(
                        (other, idx) =>
                          idx !== seatIndex &&
                          (other.userId === member.userId ||
                            other.invitedUserId === member.userId),
                      )
                      if (takenElsewhere) return false
                      return (
                        member.name.toLowerCase().includes(q) ||
                        member.nickname.toLowerCase().includes(q) ||
                        (member.email?.toLowerCase().includes(q) ?? false)
                      )
                    })
                    .slice(0, 6)
                : []

              return (
                <li
                  key={seat.wind}
                  className="border-[2px] border-jade-ink bg-card p-3 shadow-[3px_3px_0_0_var(--jade-ink)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center border-[2px] border-jade-ink font-serif text-lg",
                        seat.wind === "east"
                          ? "bg-jade-gold text-jade-ink"
                          : "bg-parchment",
                      )}
                    >
                      {WIND_META[seat.wind].badge}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {WIND_META[seat.wind].label}
                        {seat.wind === "east" ? " · Dealer" : ""}
                        {seat.userId
                          ? " · member"
                          : seat.invitedUserId
                            ? " · invite pending"
                            : seat.name
                              ? " · guest"
                              : ""}
                      </p>
                      <p className="truncate font-serif text-xl leading-none">
                        {seat.name || "Empty seat"}
                      </p>
                    </div>
                    {seat.name || seat.invitedUserId ? (
                      <button
                        type="button"
                        onClick={() => clearSeat(seatIndex)}
                        aria-label={`Clear ${WIND_META[seat.wind].label} seat`}
                        className="grid size-7 shrink-0 place-items-center border border-jade-ink/30 bg-parchment text-jade-ink/70 hover:bg-muted"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {/* Player search (Admin assigns immediately; others invite) */}
                  <div className="relative mt-3">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      value={seat.searchQuery}
                      onFocus={() =>
                        setSeats((prev) =>
                          prev.map((entry, idx) =>
                            idx === seatIndex
                              ? { ...entry, searchOpen: true }
                              : { ...entry, searchOpen: false },
                          ),
                        )
                      }
                      onBlur={() =>
                        setSeats((prev) =>
                          prev.map((entry, idx) =>
                            idx === seatIndex
                              ? { ...entry, searchOpen: false }
                              : entry,
                          ),
                        )
                      }
                      onChange={(event) => {
                        const value = event.target.value
                        setSeats((prev) =>
                          prev.map((entry, idx) =>
                            idx === seatIndex
                              ? {
                                  ...entry,
                                  searchQuery: value,
                                  searchOpen: true,
                                }
                              : entry,
                          ),
                        )
                      }}
                      placeholder={
                        isAdmin
                          ? "Search player to assign…"
                          : "Search player to invite…"
                      }
                      className="h-9 w-full border-[2px] border-jade-ink bg-white pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-jade-accent/30"
                      autoComplete="off"
                    />

                    {seat.searchOpen && q.length > 0 ? (
                      <div className="absolute inset-x-0 top-[calc(100%+2px)] z-30 max-h-52 overflow-y-auto border-[2px] border-jade-ink bg-white shadow-[4px_4px_0_0_var(--jade-ink)]">
                        {matches.length === 0 ? (
                          <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            No matching players
                          </p>
                        ) : (
                          <ul>
                            {matches.map((member) => {
                              const directAssign = canDirectAssignMember(
                                member.userId,
                              )
                              return (
                                <li
                                  key={member.userId}
                                  className="border-b border-jade-ink/10 last:border-b-0"
                                >
                                  <button
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault()
                                      selectSearchedMember(seatIndex, member)
                                    }}
                                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-jade-soft/70"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-medium text-jade-ink">
                                        {member.name}
                                      </span>
                                      <span className="block truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                                        {member.nickname}
                                      </span>
                                    </span>
                                    <span
                                      className={cn(
                                        "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]",
                                        directAssign
                                          ? "bg-jade-soft text-jade-accent"
                                          : "bg-jade-gold/25 text-jade-ink",
                                      )}
                                    >
                                      {directAssign ? "Assign" : "Invite"}
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Guest name input (kept intact) */}
                  <div className="mt-2.5 flex gap-2">
                    <input
                      value={seat.guestDraft}
                      onChange={(event) =>
                        setSeats((prev) =>
                          prev.map((entry, index) =>
                            index === seatIndex
                              ? { ...entry, guestDraft: event.target.value }
                              : entry,
                          ),
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          applyGuest(seatIndex)
                        }
                      }}
                      placeholder="Guest name"
                      className="h-9 flex-1 border-[2px] border-jade-ink bg-parchment px-2 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => applyGuest(seatIndex)}
                      className="border-[2px] border-jade-ink bg-card px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
                    >
                      Add
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {error ? (
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={opening}
          onClick={() => void openLiveTable()}
          className="scan-cta inline-flex h-12 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50"
        >
          {opening ? "Opening table…" : "Open table & start session →"}
        </button>
      </div>
    </main>
  )
}
