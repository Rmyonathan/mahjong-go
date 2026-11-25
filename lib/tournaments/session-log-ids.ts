export function parseTournamentSessionLogIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0)
  } catch {
    return []
  }
}

export function appendTournamentSessionLogId(
  existing: string | null | undefined,
  sessionId: string,
): string {
  const ids = parseTournamentSessionLogIds(existing)
  if (ids.includes(sessionId)) return JSON.stringify(ids)
  return JSON.stringify([...ids, sessionId])
}