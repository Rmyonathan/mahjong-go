import { TILE_BY_ID } from "@/lib/mahjong/tiles"
import type { Tile } from "@/lib/mahjong/types"

/** Player-facing hand status — never says “shanten”. */
export function handReadyLabel(steps: number): string {
  if (steps < 0) return "Winning hand already"
  if (steps === 0) return "Ready — one tile away from winning"
  if (steps === 1) return "One clean shape away from ready"
  if (steps === 2) return "Two shapes away from ready"
  return `${steps} shapes away from ready — still building`
}

export function handReadyDetail(steps: number): string {
  if (steps < 0) {
    return "This fourteen-tile set already completes. The puzzle is about the throw before the win."
  }
  if (steps === 0) {
    return "After the throw you'd be sitting ready: any matching tile finishes the hand."
  }
  if (steps === 1) {
    return "You need one more connect (a run, a pung, or a new pair) before you can wait on a win."
  }
  if (steps === 2) {
    return "Two more useful connects still have to land before the hand can sit ready."
  }
  return "Several loose tiles still need to find partners before this hand can threaten."
}

/** What the next few draws look like after this discard. */
export function whatHappensNext(stepsAfter: number): string {
  if (stepsAfter < 0) {
    return "Next: you've already won — table scores the hand."
  }
  if (stepsAfter === 0) {
    return "Next: you sit ready. Watch the wall and the discards for your winning tile; one hit ends it."
  }
  if (stepsAfter === 1) {
    return "Next: hunt one connector or a spare pair. Once that lands, you go ready and start waiting to win."
  }
  if (stepsAfter === 2) {
    return "Next: you'll still need two good draws (or lucky deals) before you can even sit ready — slower race."
  }
  return "Next: long build. Expect to throw more dead weight before this hand becomes dangerous."
}

function countInHand(hand: Tile[], tileId: string) {
  return hand.filter((t) => t.id === tileId).length
}

function neighborIds(tile: Tile): string[] {
  if (tile.category !== "suit" || tile.value == null) return []
  const suit = tile.suit
  const v = tile.value
  const ids: string[] = []
  if (v > 1) ids.push(`${suit}-${v - 1}`)
  if (v < 9) ids.push(`${suit}-${v + 1}`)
  return ids
}

/** Plain-language role of the tile inside this hand. */
export function tileRoleInHand(hand: Tile[], discardId: string): string {
  const tile = TILE_BY_ID[discardId]
  if (!tile) return "Unknown tile."

  const copies = countInHand(hand, discardId)
  const label = tile.label

  if (tile.category === "honor") {
    if (copies >= 3) {
      return `${label} is already a pung block — throwing it tears down a finished set.`
    }
    if (copies === 2) {
      return `${label} is your pair (the eye). Throwing it forces you to find a new pair later.`
    }
    return `${label} is a lonely honor — it only helps if the matching honor shows up; otherwise it sits dead.`
  }

  if (tile.category === "suit" && tile.value != null) {
    const neighbors = neighborIds(tile).reduce(
      (sum, id) => sum + countInHand(hand, id),
      0,
    )
    const isTerminal = tile.value === 1 || tile.value === 9

    if (copies >= 3) {
      return `${label} already makes a pung — cutting it breaks a finished block.`
    }
    if (copies === 2 && neighbors === 0) {
      return `${label} is a quiet pair with no neighbors — often a fine eye, risky to throw away early.`
    }
    if (copies === 2) {
      return `${label} is a pair sitting beside live numbers — keep it unless the coach lane says otherwise.`
    }
    if (neighbors >= 2) {
      return `${label} sits inside a live run shape — throwing it can crack a sequence you already paid for.`
    }
    if (neighbors === 1) {
      return `${label} has one neighbor — half-formed. It can still grow, but it's weaker than a full run.`
    }
    if (isTerminal) {
      return `${label} is an edge number with no partner — hardest tile to use in a run; classic early dump.`
    }
    return `${label} is floating alone in the middle — needs neighbors soon or it becomes dead weight.`
  }

  return `${label} doesn't help the closed shape.`
}

export type DiscardGrade = "best" | "good" | "okay" | "slow" | "hurts"

export function gradeDiscard(options: {
  before: number
  after: number
  bestAfter: number
}): DiscardGrade {
  const { before, after, bestAfter } = options
  if (after === bestAfter && after < before) return "best"
  if (after === bestAfter) return "best"
  if (after < before) return "good"
  if (after === before && after <= bestAfter + 1) return "okay"
  if (after === before + 1 || after === bestAfter + 1) return "slow"
  return "hurts"
}

export const GRADE_LABEL: Record<DiscardGrade, string> = {
  best: "Best throw",
  good: "Good — speeds you up",
  okay: "Okay — keeps pace",
  slow: "Slow — falls behind",
  hurts: "Hurts the hand",
}

export function whyGrade(options: {
  grade: DiscardGrade
  before: number
  after: number
  bestAfter: number
  discardLabel: string
  role: string
  isIdeal: boolean
}): string {
  const { grade, before, after, bestAfter, discardLabel, role, isIdeal } =
    options
  const idealBit = isIdeal
    ? " Coach's pick for this puzzle."
    : ""

  if (grade === "best") {
    if (after < before) {
      return `Throwing ${discardLabel} is the cleanest cut: ${role} It moves the hand closer to ready (${handReadyLabel(before).toLowerCase()} → ${handReadyLabel(after).toLowerCase()}).${idealBit}`
    }
    return `Throwing ${discardLabel} matches the best pace available: ${role} You stay at “${handReadyLabel(after)}” without slipping.${idealBit}`
  }
  if (grade === "good") {
    return `Throwing ${discardLabel} still helps: ${role} Progress improves, though another tile reaches ready even faster.${idealBit}`
  }
  if (grade === "okay") {
    return `Throwing ${discardLabel} doesn't break the hand: ${role} Progress stays flat while a sharper cut (${handReadyLabel(bestAfter).toLowerCase()} after) is on the table.${idealBit}`
  }
  if (grade === "slow") {
    return `Throwing ${discardLabel} costs a step: ${role} You end up at “${handReadyLabel(after)}” while the ideal throw leaves you at “${handReadyLabel(bestAfter)}”.${idealBit}`
  }
  return `Throwing ${discardLabel} pulls the hand backward: ${role} You go from “${handReadyLabel(before)}” to “${handReadyLabel(after)}” — avoid unless the table is unsafe.${idealBit}`
}
