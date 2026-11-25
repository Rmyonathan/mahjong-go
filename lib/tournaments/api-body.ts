/** Read tournament id from flat action routes (Next dev nested `[id]/*` workaround). */
export async function tournamentIdFromBody(
  request: Request,
): Promise<string | null> {
  const body = (await request.json().catch(() => ({}))) as {
    tournamentId?: string
  }
  return body.tournamentId?.trim() || null
}

export type TournamentActionBody = { tournamentId?: string }