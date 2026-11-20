import type { ScheduledMeet, ScheduleRosterPlayer } from "@/lib/mock/jade-schedule"
import {
  windsForSeatCount,
  type LiveBoard,
  type LiveWind,
} from "@/lib/session/live-demo"

export interface AppliedScheduleSeat {
  wind: LiveWind
  playerId: string | null
  name: string
  nickname: string
  guestDraft: string
}

export function boardFromMeet(meet: ScheduledMeet): LiveBoard {
  if (meet.levelFilter === "advanced-mcr") return "mcr"
  if (meet.levelFilter === "beginner" || meet.levelFilter === "guided") {
    return "beginner"
  }
  return "advanced"
}

/**
 * Build a 3/4-seat live table from a schedule roster.
 * Prefers the current booker ("you") if they confirmed a seat.
 */
export function seatsFromMeetRoster(
  meet: ScheduledMeet,
  seatCount: 3 | 4 = 4,
): AppliedScheduleSeat[] {
  const winds = windsForSeatCount(seatCount)
  const roster = pickTableRoster(meet.confirmed, seatCount)
  return winds.map((wind, index) => {
    const player = roster[index]
    if (!player) {
      return {
        wind,
        playerId: null,
        name: "",
        nickname: "",
        guestDraft: "",
      }
    }
    return {
      wind,
      playerId: player.id,
      name: player.name,
      nickname: player.nickname,
      guestDraft: "",
    }
  })
}

function pickTableRoster(
  confirmed: ScheduleRosterPlayer[],
  seatCount: number,
): ScheduleRosterPlayer[] {
  if (confirmed.length <= seatCount) return confirmed.slice(0, seatCount)

  const you = confirmed.find((player) => player.isYou)
  if (!you) return confirmed.slice(0, seatCount)

  const others = confirmed.filter((player) => player.id !== you.id)
  return [you, ...others].slice(0, seatCount)
}
