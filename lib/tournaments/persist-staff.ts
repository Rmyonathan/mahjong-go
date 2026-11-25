import type { PrismaClient } from "@prisma/client"

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>

export async function replaceTournamentStaff(
  tx: Tx,
  tournamentId: string,
  panitiaUserIds: string[],
  wasitUserIds: string[],
) {
  const uniquePanitia = [...new Set(panitiaUserIds.filter(Boolean))]
  const uniqueWasit = [...new Set(wasitUserIds.filter(Boolean))]
  const allIds = [...new Set([...uniquePanitia, ...uniqueWasit])]
  if (allIds.length > 0) {
    const found = await tx.user.findMany({
      where: { id: { in: allIds } },
      select: { id: true },
    })
    if (found.length !== allIds.length) {
      throw new Error("Invalid staff user")
    }
  }

  await tx.tournamentStaff.deleteMany({ where: { tournamentId } })
  await tx.tournamentStaff.createMany({
    data: [
      ...uniquePanitia.map((userId) => ({
        tournamentId,
        userId,
        role: "PANITIA" as const,
      })),
      ...uniqueWasit.map((userId) => ({
        tournamentId,
        userId,
        role: "WASIT" as const,
      })),
    ],
  })

  await tx.tournament.update({
    where: { id: tournamentId },
    data: {
      panitiaUserId: uniquePanitia[0] ?? null,
      wasitUserId: uniqueWasit[0] ?? null,
    },
  })
}