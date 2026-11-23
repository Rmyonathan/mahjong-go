import type { WinMethod } from "@/lib/session/live-demo"

export const PENDING_HAND_KEY = "jade_pending_hand"

export type PendingCalculatorHand = {
  sessionId: string
  totalFan: number
  /** Club points for ron (already × POINT_UNIT) */
  pointsRon: number
  /** Club points for tsumo total (already × POINT_UNIT) */
  pointsTsumo: number
  method: WinMethod
  combos: { label: string; fan: number }[]
  tileIds: string[]
  winningTileId: string
  createdAt: string
}

export function savePendingHand(hand: PendingCalculatorHand) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(PENDING_HAND_KEY, JSON.stringify(hand))
}

export function loadPendingHand(sessionId: string): PendingCalculatorHand | null {
  if (typeof window === "undefined") return null
  const raw = window.sessionStorage.getItem(PENDING_HAND_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PendingCalculatorHand
    if (parsed.sessionId !== sessionId) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPendingHand() {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(PENDING_HAND_KEY)
}
