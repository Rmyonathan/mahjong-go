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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-[2px] border-jade-ink pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Admin · {user.email}
          </p>
          <h1 className="font-serif text-3xl">House desk</h1>
        </div>
        <nav className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <Link
            href="/admin/accounts"
            className="border-[2px] border-jade-ink bg-jade-ink px-3 py-2 text-parchment"
          >
            Accounts
          </Link>
          <Link
            href="/leaderboard"
            className="border-[2px] border-jade-ink bg-card px-3 py-2"
          >
            Leaderboard
          </Link>
        </nav>
      </div>
      {children}
    </div>
  )
}
