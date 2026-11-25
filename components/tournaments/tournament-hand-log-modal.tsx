"use client"

import { useEffect, useMemo, useState } from "react"

import { CameraScanModal } from "@/components/session/camera-scan-modal"
import type { ConfirmedScanHand } from "@/components/session/camera-scan-modal"
import { HandLogModal } from "@/components/session/hand-log-modal"
import { BYE_SEAT_LABEL } from "@/lib/tournaments/table-roll"
import type { ApiTournamentTable } from "@/lib/tournaments/types"
import type { LiveSeat, LiveWind } from "@/lib/session/live-demo"

const WINDS: LiveWind[] = ["east", "south", "west", "north"]

function tableToLiveSeats(table: ApiTournamentTable | null): LiveSeat[] {
  if (!table) return []
  return table.seats.map((seat, index) => ({
    wind: WINDS[index] ?? "east",
    playerId: seat.entryId,
    name: seat.playerName ?? BYE_SEAT_LABEL,
    nickname: seat.playerName ?? BYE_SEAT_LABEL,
    net: seat.score ?? 0,
    wins: 0,
    dealtIn: 0,
    selfDraw: 0,
    form: [],
  }))
}

type LogStep = "choose" | "calculator" | "camera"

export function TournamentHandLogModal({
  open,
  table,
  tournamentId,
  onClose,
  onLogged,
}: {
  open: boolean
  table: ApiTournamentTable | null
  tournamentId: string
  onClose: () => void
  onLogged: () => void
}) {
  const [step, setStep] = useState<LogStep>("choose")
  const seats = useMemo(() => tableToLiveSeats(table), [table])

  useEffect(() => {
    if (open) setStep("choose")
  }, [open])

  if (!table) return null
  const activeTable = table

  async function submit(hand: ConfirmedScanHand) {
    async function resolveSessionId(): Promise<string> {
      if (activeTable.liveSessionId) return activeTable.liveSessionId
      const last = activeTable.sessionLogs.at(-1)
      if (last?.status === "LIVE") return last.id
      const openRes = await fetch(`/api/tournaments/actions/open-live-table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, tableId: activeTable.id }),
      })
      const openData = (await openRes.json()) as {
        error?: string
        session?: { id: string }
      }
      if (!openRes.ok || !openData.session?.id) {
        throw new Error(openData.error ?? "Could not open live table log")
      }
      return openData.session.id
    }

    const sessionId = await resolveSessionId()
    const response = await fetch(`/api/sessions/${sessionId}/hands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winnerSeatIndex: hand.winnerSeatIndex,
        method: hand.method,
        dealtBySeatIndex: hand.dealtBySeatIndex,
        points: hand.points,
        combos: hand.combos,
        tileIds: hand.tileIds,
        winningTileId: hand.winningTileId,
        deltas: hand.deltas,
      }),
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      throw new Error(data.error ?? "Could not log hand")
    }
    onLogged()
  }

  function confirmHand(hand: ConfirmedScanHand) {
    void submit(hand).catch((error: unknown) => {
      window.alert(
        error instanceof Error ? error.message : "Could not log hand",
      )
    })
  }

  return (
    <>
      {open && step === "choose" ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Log tournament hand"
        >
          <div className="w-full max-w-md space-y-3 rounded-xl border border-[#102A20]/15 bg-[#F6F4EE] p-4 shadow-lg">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Quick log — Table {table.tableNumber}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep("camera")}
                className="tap-press h-11 rounded-full border-[2px] border-jade-ink bg-white font-mono text-[10px] uppercase tracking-[0.14em]"
              >
                📷 Camera scan
              </button>
              <button
                type="button"
                onClick={() => setStep("calculator")}
                className="tap-press h-11 rounded-full bg-jade-accent font-mono text-[10px] uppercase tracking-[0.14em] text-white"
              >
                HKOS calculator
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <HandLogModal
        open={open && step === "calculator"}
        seats={seats}
        onClose={() => {
          setStep("choose")
          onClose()
        }}
        ruleset="jade-hk"
        onConfirm={confirmHand}
      />
      <CameraScanModal
        open={open && step === "camera"}
        seats={seats}
        ruleset="jade-hk"
        onClose={() => setStep("choose")}
        onConfirm={(hand) => {
          confirmHand(hand)
        }}
      />
    </>
  )
}