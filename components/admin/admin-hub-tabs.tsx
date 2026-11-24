"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

/** EDIT HERE — club owner hub tabs */
const ADMIN_TABS = [
  { href: "/admin/accounts", label: "Members & Pro", match: "/admin/accounts" },
  { href: "/schedule", label: "Schedules", match: "/schedule" },
  { href: "/admin/bounties", label: "Weekly Bounties", match: "/admin/bounties" },
  { href: "/admin/partner", label: "Partner Revenue", match: "/admin/partner" },
] as const

export function AdminHubTabs() {
  const pathname = usePathname()
  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Club owner sections">
      {ADMIN_TABS.map((tab) => {
        const active =
          pathname === tab.match || pathname.startsWith(`${tab.match}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "tap-press rounded-full px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-jade-ink text-white"
                : "border border-[#102A20]/10 bg-white hover:bg-jade-soft",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
