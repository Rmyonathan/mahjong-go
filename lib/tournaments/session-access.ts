import { prisma } from "@/lib/db"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import { canLogTournamentHands } from "@/lib/tournaments/staff"

export async function userCanLogLinkedTournamentSession(
  userId: string,
  role: "ADMIN" | "MEMBER",
  tournamentTableId: string | null | undefined,
) {
  if (!tournamentTableId) return false
  const table = await prisma.tournamentTable.findUnique({
    where: { id: tournamentTableId },
    select: {
      tournament: {
        select: {
          createdById: true,
          panitiaUserId: true,
          wasitUserId: true,
          staff: { select: { userId: true, role: true } },
        },
      },
    },
  })
  if (!table) return false
  const staff = resolveTournamentStaff({
    panitiaUserId: table.tournament.panitiaUserId,
    wasitUserId: table.tournament.wasitUserId,
    staff: table.tournament.staff,
  })
  return canLogTournamentHands(userId, role, {
    createdById: table.tournament.createdById,
    panitiaUserIds: staff.panitiaUserIds,
    wasitUserIds: staff.wasitUserIds,
  })
}