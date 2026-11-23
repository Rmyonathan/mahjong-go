import Link from "next/link"
import { redirect } from "next/navigation"

import { getSessionUser } from "@/lib/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "ADMIN") redirect("/leaderboard")

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#102A20]/10 pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Admin · {user.email}
          </p>
          <h1 className="font-serif text-3xl">House desk</h1>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm font-medium">
          <Link
            href="/admin/accounts"
            className="tap-press rounded-full bg-jade-ink px-4 py-2 text-white"
          >
            Accounts
          </Link>
          <Link
            href="/admin/partner"
            className="tap-press rounded-full border border-[#102A20]/10 bg-white px-4 py-2"
          >
            Partner
          </Link>
          <Link
            href="/leaderboard"
            className="tap-press rounded-full border border-[#102A20]/10 bg-white px-4 py-2"
          >
            Leaderboard
          </Link>
        </nav>
      </div>
      {children}
    </div>
  )
}
