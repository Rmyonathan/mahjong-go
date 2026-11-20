import { AccountsManager } from "@/components/admin/accounts-manager"
import { prisma } from "@/lib/db"

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
    <AccountsManager
      initialUsers={users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
      }))}
      players={players}
    />
  )
}
