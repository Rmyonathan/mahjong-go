import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Brain,
  Calculator,
  Camera,
  GraduationCap,
  Info,
  Layers,
  Puzzle,
  Trophy,
} from "lucide-react"

/** EDIT HERE — Club & Learn popover links (desktop + mobile More sheet) */
export const CLUB_LEARN_LINKS: {
  href: string
  label: string
  subtitle: string
  icon: LucideIcon
}[] = [
  {
    href: "/puzzle",
    label: "Daily WWYD",
    subtitle: "What would you discard today?",
    icon: Puzzle,
  },
  {
    href: "/coaching",
    label: "Coaching",
    subtitle: "Clips and 1-on-1 hand audits",
    icon: GraduationCap,
  },
  {
    href: "/combos",
    label: "Combos Guide",
    subtitle: "HKOS patterns and fan tags",
    icon: Layers,
  },
  {
    href: "/levels",
    label: "Rank Tiers",
    subtitle: "XP bands and skill rating",
    icon: Trophy,
  },
  {
    href: "/about",
    label: "About Club",
    subtitle: "Jade house in Bandar Lampung",
    icon: Info,
  },
]

/** EDIT HERE — Tools popover / play-sheet calculator links */
export const TOOL_LINKS: {
  href: string
  label: string
  subtitle: string
  icon: LucideIcon
  soon?: boolean
}[] = [
  {
    href: "/calculator",
    label: "HKOS Hand Calculator",
    subtitle: "Build tiles and score Fan",
    icon: Calculator,
  },
  {
    href: "/scan",
    label: "AI Camera Scan",
    subtitle: "Capture a winning hand",
    icon: Camera,
    soon: true,
  },
]

export const DASHBOARD_HREF = "/dashboard"
export const SCHEDULE_HREF = "/schedule"
export const LEADERBOARD_HREF = "/leaderboard"
