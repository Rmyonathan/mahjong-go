import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Brain,
  Calculator,
  Camera,
  GraduationCap,
  Home,
  Info,
  Layers,
  Puzzle,
  Shield,
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react"

/** EDIT HERE — primary destinations */
export const DASHBOARD_HREF = "/dashboard"
export const SCHEDULE_HREF = "/schedule"
export const LEADERBOARD_HREF = "/leaderboard"
export const HOME_GUEST_HREF = "/"

/** EDIT HERE — Club & Learn popover links (desktop + mobile More sheet) */
export const CLUB_LEARN_LINKS: {
  id: string
  href: string
  label: string
  subtitle: string
  icon: LucideIcon
}[] = [
  {
    id: "learn-how-to-play",
    href: "/learn/how-to-play",
    label: "How to Play",
    subtitle: "Basics · Chicken Hand & Jade HK",
    icon: BookOpen,
  },
  {
    id: "puzzle",
    href: "/puzzle",
    label: "Daily WWYD",
    subtitle: "What would you discard today?",
    icon: Puzzle,
  },
  {
    id: "coaching",
    href: "/coaching",
    label: "Coaching",
    subtitle: "Clips and 1-on-1 hand audits",
    icon: GraduationCap,
  },
  {
    id: "combos",
    href: "/combos",
    label: "Combos Guide",
    subtitle: "HKOS patterns and fan tags",
    icon: Layers,
  },
  {
    id: "levels",
    href: "/levels",
    label: "Rank Tiers",
    subtitle: "XP bands and skill rating",
    icon: Trophy,
  },
  {
    id: "about",
    href: "/about",
    label: "About Club",
    subtitle: "Jade house in Bandar Lampung",
    icon: Info,
  },
]

/** EDIT HERE — Tools popover / play-sheet calculator links */
export const TOOL_LINKS: {
  id: string
  href: string
  label: string
  subtitle: string
  icon: LucideIcon
  soon?: boolean
}[] = [
  {
    id: "calculator",
    href: "/calculator",
    label: "HKOS Hand Calculator",
    subtitle: "Build tiles and score Fan",
    icon: Calculator,
  },
  {
    id: "scan",
    href: "/scan",
    label: "AI Camera Scan",
    subtitle: "Capture a winning hand",
    icon: Camera,
  },
  {
    id: "pelatih-ai",
    href: "/scan",
    label: "Pelatih AI",
    subtitle: "In-hand strategy coach at the table",
    icon: Brain,
    soon: true,
  },
]

/** EDIT HERE — mobile More sheet extras (profile first) */
export const MORE_PROFILE_LINK = {
  href: "/me",
  label: "My Profile",
  subtitle: "Account, XP, and seat history",
  icon: UserRound,
} as const

/** EDIT HERE — admin-only More / hub links */
export const ADMIN_MORE_LINKS: {
  href: string
  label: string
  subtitle: string
  icon: LucideIcon
}[] = [
  {
    href: "/admin/accounts",
    label: "Club Admin",
    subtitle: "Members, Pro, and passwords",
    icon: Shield,
  },
  {
    href: "/admin/partner",
    label: "Partner Revenue",
    subtitle: "QRIS and house cut",
    icon: Wallet,
  },
]

export { Home as HomeIcon, BookOpen, Brain }
