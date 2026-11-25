import type { TournamentEntry, TournamentTable } from "@prisma/client"

import { prisma } from "@/lib/db"
import {
  createGameSession,
  findLiveSessionByTournamentTableId,
  serializeSession,
  type CreateSessionSeatInput,
} from "@/lib/session/service"
import { clearStaleTournamentTableSessionLinks } from "@/lib/tournaments/clear-table-session-link"
import { BYE_SEAT_LABEL } from "@/lib/tournaments/table-roll"
import type { LiveWind } from "@/lib/session/live-demo"

const WINDS: LiveWind[] = ["east", "south", "west", "north"]

type EntryMini = Pick<TournamentEntry, "id" | "userId" | "playerName">

function seatEntries(table: TournamentTable, byId: Map<string, EntryMini>) {
  return [
    table.seat1EntryId,
    table.seat2EntryId,
    table.seat3EntryId,
    table.seat4EntryId,
  ].map((entryId) => (entryId ? (byId.get(entryId) ?? null) : null))
}

export async function openTournamentTableLive(input: {
  tournamentId: string
  tableId: string
  captainUserId: string
}) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: input.tournamentId },
    select: { id: true, title: true },
  })
  if (!tournament) throw new Error("Tournament not found")

  const table = await prisma.tournamentTable.findFirst({
    where: { id: input.tableId, tournamentId: input.tournamentId },
  })
  if (!table) throw new Error("Table not found")
  if (table.status === "FINISHED") {
    throw new Error("This table is finished")
  }

  const existing = await findLiveSessionByTournamentTableId(table.id)
  if (existing) {
    return {
      session: serializeSession(existing),
      resumed: true as const,
    }
  }

  await clearStaleTournamentTableSessionLinks(table.id)

  const entryIds = [
    table.seat1EntryId,
    table.seat2EntryId,
    table.seat3EntryId,
    table.seat4EntryId,
  ].filter((id): id is string => Boolean(id))

  const entries = await prisma.tournamentEntry.findMany({
    where: { id: { in: entryIds } },
    select: { id: true, userId: true, playerName: true },
  })
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  const seated = seatEntries(table, byId)

  const seats: CreateSessionSeatInput[] = WINDS.map((wind, index) => {
    const entry = seated[index]
    if (!entry) {
      return {
        wind,
        guestName: BYE_SEAT_LABEL,
        tournamentEntryId: null,
      }
    }
    return {
      wind,
      userId: entry.userId,
      guestName: entry.userId ? null : entry.playerName,
      tournamentEntryId: entry.id,
    }
  })

  const occupied = seats.filter(
    (seat) => seat.userId || (seat.guestName && seat.guestName !== BYE_SEAT_LABEL),
  )
  if (occupied.length < 2) {
    throw new Error("Need at least 2 seated players for a live table")
  }

  const title = `${tournament.title} · T${table.tableNumber} · R${table.roundNumber}`

  const session = await createGameSession({
    title,
    board: "advanced",
    scoringRuleset: "JADE_HK",
    seats,
    captainUserId: input.captainUserId,
    tournamentTableId: table.id,
  })

  const { appendTournamentSessionLogId } = await import(
    "@/lib/tournaments/session-log-ids"
  )
  const fresh = await prisma.tournamentTable.findUnique({
    where: { id: table.id },
    select: { sessionLogIds: true },
  })

  await prisma.tournamentTable.update({
    where: { id: table.id },
    data: {
      status: "LIVE",
      sessionLogIds: appendTournamentSessionLogId(
        fresh?.sessionLogIds,
        session.id,
      ),
    },
  })

  return { session: serializeSession(session), resumed: false as const }
}