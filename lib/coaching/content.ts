/** EDIT HERE — swap in real Reel/Short URLs from your coach friend. */

export type CoachingVideo = {
  id: string
  title: string
  summary: string
  /** YouTube embed id or full embed URL */
  youtubeId: string
  proOnly: boolean
  durationLabel: string
}

export const COACHING_VIDEOS: CoachingVideo[] = [
  {
    id: "teaser-discard",
    title: "Safe discard instincts (teaser)",
    summary: "90-second warm-up on why middle tiles get people paid.",
    youtubeId: "dQw4w9WgXcQ",
    proOnly: false,
    durationLabel: "1:30",
  },
  {
    id: "teaser-efficiency",
    title: "Efficiency vs defense (teaser)",
    summary: "When to push shanten vs when to fold the table.",
    youtubeId: "dQw4w9WgXcQ",
    proOnly: false,
    durationLabel: "2:05",
  },
  {
    id: "pro-half-flush",
    title: "Half Flush decision tree",
    summary: "Pro clip — committing to a suit without painting yourself into a corner.",
    youtubeId: "dQw4w9WgXcQ",
    proOnly: true,
    durationLabel: "8:40",
  },
  {
    id: "pro-deal-in",
    title: "Reading deal-in pressure",
    summary: "Pro clip — seat tells and when to break your own shape.",
    youtubeId: "dQw4w9WgXcQ",
    proOnly: true,
    durationLabel: "11:20",
  },
]

// EDIT HERE — coach rate card for 1-on-1 (club keeps 20%)
export const HAND_AUDIT_PRICE_IDR = 150_000
export const HAND_AUDIT_MINUTES = 45
export const COACH_SPLIT_LABEL = "80% coach · 20% Jade"