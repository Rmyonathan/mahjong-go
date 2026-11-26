import { AccountsManager } from "@/components/admin/accounts-manager"
import { AdminMentorsPanel } from "@/components/admin/admin-mentors-panel"
import { prisma } from "@/lib/db"
import { isProMembership } from "@/lib/membership"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Accounts — Jade Mahjong",
}

export default async function AdminAccountsPage() {
  const [users, players] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        membershipTier: true,
        proExpiresAt: true,
        playerId: true,
        createdAt: true,
        player: { select: { nickname: true, name: true } },
      },
    }),
    prisma.player.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, nickname: true },
    }),
  ])

  return (
    <>
      <AccountsManager
        initialUsers={users.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          proExpiresAt: user.proExpiresAt?.toISOString() ?? null,
          isPro: isProMembership(user),
        }))}
        players={players}
      />
      <AdminMentorsPanel />
    </>
  )
}
