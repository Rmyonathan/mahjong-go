"use client"

import { useState } from "react"
import { Camera, Crown, SlidersHorizontal, Trash2, UserMinus, X } from "lucide-react"

import { formatSignedPoints } from "@/lib/mock/jade-board"
import { WIND_META, type LiveSession } from "@/lib/session/live-demo"
import { cn } from "@/lib/utils"

type SeatMeta = {
  id: string
  userId: string | null
  guestName: string | null
}

export type ManageableSession = LiveSession & {
  captainUserId?: string
  scannerUserIds?: string[]
  seatsMeta?: SeatMeta[]
  waitlistQueue?: Array<{
    bookingId: string
    userId: string
    name: string
    status: string
  }>
}

export function ManageTableModal({
  open,
  session,
  onClose,
  onUpdated,
}: {
  open: boolean
  session: ManageableSession
  onClose: () => void
  onUpdated: (next: ManageableSession) => void
}) {
  const [tab, setTab] = useState<"seats" | "round" | "hands">("seats")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guestRename, setGuestRename] = useState<Record<string, string>>({})

  if (!open) return null

  const scanners = new Set(session.scannerUserIds ?? [])
  const waitlistQueue = session.waitlistQueue ?? []
  const currentRound = Math.max(
    1,
    Math.ceil(session.handNumber / Math.max(session.seats.length, 1)),
  )

  async function runAction(payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(session.id)}/manage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        session?: ManageableSession
      }
      if (!res.ok || !data.session) {
        setError(data.error ?? "Could not update table")
        return
      }
      onUpdated(data.session)
    } catch {
      setError("Network error updating table")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close table settings"
        className="absolute inset-0 bg-jade-ink/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit table"
        className="relative z-10 flex max-h-[min(90dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#102A20]/15 bg-parchment shadow-[0_24px_60px_-20px_rgba(16,42,32,0.45)] sm:rounded-2xl sm:border-[2px] sm:border-jade-ink sm:shadow-[8px_8px_0_0_var(--jade-ink)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#102A20]/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-jade-accent" />
            <h2 className="font-serif text-2xl">Edit Table</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full border border-[#102A20]/15 bg-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Clean 3-tab bar so UI is never overwhelming */}
        <div className="flex shrink-0 gap-1 border-b border-[#102A20]/10 bg-white px-4 py-2">
          {(
            [
              ["seats", "Seats & Scanners"],
              ["round", "Round"],
              ["hands", `Hands (${session.hands.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition",
                tab === id
                  ? "bg-jade-ink text-white"
                  : "text-jade-ink/70 hover:bg-jade-soft/60",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {error ? (
            <p className="rounded-xl bg-jade-red/10 px-3 py-2 text-xs text-jade-red">
              {error}
            </p>
          ) : null}

          {tab === "seats" ? (
            <ul className="space-y-2.5">
              {session.seats.map((seat, idx) => {
                const meta = session.seatsMeta?.[idx]
                const isOwnerSeat =
                  Boolean(meta?.userId) && meta?.userId === session.captainUserId
                const isDealer = idx === session.dealerSeatIndex
                const canScan =
                  isOwnerSeat || (meta?.userId ? scanners.has(meta.userId) : false)

                return (
                  <li
                    key={seat.wind}
                    className="rounded-2xl border border-[#102A20]/12 bg-white p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-lg border border-jade-ink font-serif text-base",
                            isDealer ? "bg-jade-gold" : "bg-parchment",
                          )}
                        >
                          {WIND_META[seat.wind].badge}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-serif text-lg leading-tight">
                            {seat.name}
                          </p>
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                            {WIND_META[seat.wind].label}
                            {isOwnerSeat ? " · Owner" : meta?.userId ? " · Member" : " · Guest"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={busy || isDealer}
                        onClick={() =>
                          void runAction({ action: "set_dealer", seatIndex: idx })
                        }
                        className={cn(
                          "tap-press inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 font-mono text-[10px] uppercase tracking-[0.1em]",
                          isDealer
                            ? "bg-jade-gold text-jade-ink"
                            : "border border-[#102A20]/15 bg-parchment text-jade-ink hover:bg-jade-gold/20",
                        )}
                      >
                        <Crown className="size-3" aria-hidden />
                        {isDealer ? "Dealer" : "Set Dealer"}
                      </button>
                    </div>

                    {!isOwnerSeat ? (
                      <div className="mt-3 space-y-2.5 border-t border-[#102A20]/08 pt-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {meta?.userId ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void runAction({
                                  action: "toggle_scanner",
                                  userId: meta.userId,
                                })
                              }
                              className={cn(
                                "tap-press inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-mono text-[10px] uppercase tracking-[0.1em]",
                                canScan
                                  ? "bg-jade-accent text-white"
                                  : "border border-[#102A20]/15 bg-white text-jade-ink",
                              )}
                            >
                              <Camera className="size-3" aria-hidden />
                              {canScan ? "Can Scan ✓" : "Allow Scan"}
                            </button>
                          ) : null}

                          {meta?.id ? (
                            <div className="ml-auto flex items-center gap-1.5">
                              <input
                                value={guestRename[meta.id] ?? ""}
                                onChange={(e) =>
                                  setGuestRename((prev) => ({
                                    ...prev,
                                    [meta.id]: e.target.value,
                                  }))
                                }
                                placeholder="Replace name…"
                                className="h-8 w-28 rounded-full border border-[#102A20]/15 bg-parchment px-2.5 text-xs outline-none"
                              />
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction({
                                    action: "retire_seat",
                                    seatId: meta.id,
                                    replacementName: guestRename[meta.id],
                                  })
                                }
                                className="tap-press inline-flex h-8 items-center gap-1 rounded-full border border-jade-red/35 bg-white px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-jade-red"
                              >
                                <UserMinus className="size-3" aria-hidden />
                                Retire
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {!meta?.userId && meta?.id && waitlistQueue.length > 0 ? (
                          <div className="rounded-xl bg-jade-soft/55 px-3 py-2">
                            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-jade-accent">
                              Seat from waitlist
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {waitlistQueue.map((w) => (
                                <button
                                  key={w.bookingId}
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction({
                                      action: "seat_waitlist",
                                      seatId: meta.id,
                                      bookingId: w.bookingId,
                                    })
                                  }
                                  className="tap-press rounded-full bg-jade-accent px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-white disabled:opacity-50"
                                >
                                  + {w.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : null}

          {tab === "round" ? (
            <div className="space-y-4 rounded-2xl border border-[#102A20]/12 bg-white p-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Set current round
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Adjusts the round counter without deleting logged hands.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((roundNo) => (
                  <button
                    key={roundNo}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction({ action: "set_round", roundNumber: roundNo })
                    }
                    className={cn(
                      "tap-press h-11 rounded-xl border font-mono text-xs uppercase tracking-[0.12em]",
                      currentRound === roundNo
                        ? "border-jade-accent bg-jade-accent text-white"
                        : "border-[#102A20]/15 bg-parchment text-jade-ink",
                    )}
                  >
                    Round {roundNo}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "hands" ? (
            session.hands.length === 0 ? (
              <p className="rounded-2xl border border-[#102A20]/10 bg-white p-6 text-center text-sm text-muted-foreground">
                No hands logged yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {session.hands.map((hand) => {
                  const winner =
                    hand.winnerSeatIndex >= 0
                      ? session.seats[hand.winnerSeatIndex]
                      : null
                  return (
                    <li
                      key={hand.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#102A20]/12 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Hand #{hand.handNo} ·{" "}
                          {winner ? `${winner.nickname} (${hand.method})` : "Draw"}
                        </p>
                        <p className="mt-0.5 font-mono text-sm font-semibold text-jade-ink">
                          {hand.points > 0
                            ? formatSignedPoints(hand.points)
                            : "0 pts"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove Hand #${hand.handNo} and reverse its points?`,
                            )
                          ) {
                            void runAction({
                              action: "remove_hand",
                              handId: hand.id,
                            })
                          }
                        }}
                        className="tap-press inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-jade-red/35 px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-jade-red disabled:opacity-50"
                      >
                        <Trash2 className="size-3" aria-hidden />
                        Remove
                      </button>
                    </li>
                  )
                })}
              </ul>
            )
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[#102A20]/10 bg-[#F6F4EE]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-jade-ink font-mono text-[11px] uppercase tracking-[0.16em] text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
