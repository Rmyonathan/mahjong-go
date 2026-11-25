import { prisma } from "@/lib/db"

/** Finished sessions keep `tournamentTableId` blocked until cleared — allow reopen. */
export async function clearStaleTournamentTableSessionLinks(
  tournamentTableId: string,
) {
  await prisma.gameSession.updateMany({
    where: {
      tournamentTableId,
      status: { not: "LIVE" },
    },
    data: { tournamentTableId: null },
  })
}