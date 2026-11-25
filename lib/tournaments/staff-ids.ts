export type TournamentStaffRow = {
  userId: string
  role: "PANITIA" | "WASIT"
  user?: { name: string } | null
}

export function staffIdsFromRows(staff: TournamentStaffRow[]) {
  const panitiaUserIds = staff
    .filter((row) => row.role === "PANITIA")
    .map((row) => row.userId)
  const wasitUserIds = staff
    .filter((row) => row.role === "WASIT")
    .map((row) => row.userId)
  return { panitiaUserIds, wasitUserIds }
}

/** Merge legacy single-assign fields with `TournamentStaff` rows. */
export function resolveTournamentStaff(input: {
  panitiaUserId: string | null
  wasitUserId: string | null
  staff?: TournamentStaffRow[]
}) {
  const fromRows = staffIdsFromRows(input.staff ?? [])
  const panitiaUserIds = [...fromRows.panitiaUserIds]
  const wasitUserIds = [...fromRows.wasitUserIds]
  if (input.panitiaUserId && !panitiaUserIds.includes(input.panitiaUserId)) {
    panitiaUserIds.push(input.panitiaUserId)
  }
  if (input.wasitUserId && !wasitUserIds.includes(input.wasitUserId)) {
    wasitUserIds.push(input.wasitUserId)
  }
  const panitiaNames = (input.staff ?? [])
    .filter((row) => row.role === "PANITIA")
    .map((row) => row.user?.name?.trim())
    .filter(Boolean) as string[]
  const wasitNames = (input.staff ?? [])
    .filter((row) => row.role === "WASIT")
    .map((row) => row.user?.name?.trim())
    .filter(Boolean) as string[]
  return { panitiaUserIds, wasitUserIds, panitiaNames, wasitNames }
}