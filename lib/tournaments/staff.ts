/** Tournament ops: admin + creator + assigned panitia. */
export function canAdministerTournament(
  userId: string,
  role: "ADMIN" | "MEMBER",
  createdById: string,
  panitiaUserIds: string[] = [],
) {
  if (role === "ADMIN" || userId === createdById) return true
  return panitiaUserIds.includes(userId)
}

/** Hand logging + scan at live tables: admin, creator, panitia, or any wasit. */
export function canLogTournamentHands(
  userId: string,
  role: "ADMIN" | "MEMBER",
  tournament: {
    createdById: string
    wasitUserIds: string[]
    panitiaUserIds?: string[]
  },
) {
  if (
    canAdministerTournament(
      userId,
      role,
      tournament.createdById,
      tournament.panitiaUserIds ?? [],
    )
  ) {
    return true
  }
  return tournament.wasitUserIds.includes(userId)
}