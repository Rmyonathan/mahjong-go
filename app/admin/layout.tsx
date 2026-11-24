import Link from "next/link"
import { redirect } from "next/navigation"

import { AdminHubTabs } from "@/components/admin/admin-hub-tabs"
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
      <div className="mb-6 border-b border-[#102A20]/10 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Club owner · {user.email}
            </p>
            <h1 className="font-serif text-3xl">House desk</h1>
          </div>
          <Link
            href="/dashboard"
            className="tap-press rounded-full border border-[#102A20]/10 bg-white px-4 py-2 text-sm font-medium"
          >
            ← Home
          </Link>
        </div>
        <AdminHubTabs />
      </div>
      {children}
    </div>
  )
}
