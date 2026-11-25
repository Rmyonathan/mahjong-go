import {
  logHand,
  type LogHandInput,
} from "@/lib/session/service"
import { openTournamentTableLive } from "@/lib/tournaments/open-live-table"
import { syncTournamentHandFromSession } from "@/lib/tournaments/sync-session-hand"

/** Same path as wasit logging on `/session/live` — syncs to tournament standings. */
export async function logTournamentHandViaSession(input: {
  tournamentId: string
  tableId: string
  captainUserId: string
  hand: LogHandInput
}) {
  const opened = await openTournamentTableLive({
    tournamentId: input.tournamentId,
    tableId: input.tableId,
    captainUserId: input.captainUserId,
  })
  const sessionId = opened.session.id
  await logHand(sessionId, input.hand)
  const tournamentHand = await syncTournamentHandFromSession(
    input.tableId,
    input.hand,
  )
  return { sessionId, session: opened.session, tournamentHand, resumed: opened.resumed }
}