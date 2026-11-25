import type {
  TournamentEntry,
  TournamentEntryStatus,
  TournamentTable,
} from "@prisma/client"

import type {
  ApiTournamentDetail,
  ApiTournamentEntry,
  ApiTournamentHand,
  ApiTournamentTable,
  ApiTournamentTableSeat,
} from "@/lib/tournaments/types"
import { resolveTournamentStaff } from "@/lib/tournaments/staff-ids"
import {
  roundTableScores,
  seatedEntryIds,
} from "@/lib/tournaments/round-table-scores"
import { parseTournamentSessionLogIds } from "@/lib/tournaments/session-log-ids"
import type { ApiTournamentTableSessionLog } from "@/lib/tournaments/types"
import type { TournamentHand } from "@prisma/client"

type EntryRow = Pick<
  TournamentEntry,
  | "id"
  | "userId"
  | "playerName"
  | "status"
  | "score"
  | "revivalsUsed"
  | "eliminatedRound"
  | "finishPlace"
  | "createdAt"
>

type TableRow = TournamentTable & {
  liveSession?: { id: string; status: string } | null
  sessionLogIds?: string
}

type SessionLogRow = {
  id: string
  title: string
  status: "LIVE" | "FINISHED"
  startedAt: Date
  endedAt: Date | null
  _count: { hands: number }
}

function mapEntry(row: EntryRow): ApiTournamentEntry {
  return {
    id: row.id,
    userId: row.userId,
    playerName: row.playerName,
    status: row.status,
    score: row.score,
    revivalsUsed: row.revivalsUsed,
    eliminatedRound: row.eliminatedRound,
    finishPlace: row.finishPlace ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

function seatFromEntry(
  entry: EntryRow | null | undefined,
  roundScore: number | null = null,
): ApiTournamentTableSeat {
  if (!entry) {
    return {
      entryId: null,
      playerName: null,
      score: null,
      roundScore: null,
      status: null,
    }
  }
  return {
    entryId: entry.id,
    playerName: entry.playerName,
    score: entry.score,
    roundScore,
    status: entry.status,
  }
}

export function buildTournamentDetailPayload(input: {
  tournament: {
    id: string
    title: string
    subtitle: string
    format: ApiTournamentDetail["format"]
    status: ApiTournamentDetail["status"]
    entryFeeIdr: number
    prizePoolText: string
    maxPlayers: number
    revivalEnabled: boolean
    revivalFeeIdr: number
    maxRevivalsPerPlayer: number
    koAdvancePerTable: number
    currentRound: number
    rulesPdfUrl: string | null
    rulesPdfName: string | null
    createdById: string
    panitiaUserId: string | null
    wasitUserId: string | null
    panitiaUser?: { name: string } | null
    wasitUser?: { name: string } | null
    staff?: { userId: string; role: "PANITIA" | "WASIT"; user?: { name: string } | null }[]
    entries: EntryRow[]
    tables: TableRow[]
    hands?: TournamentHand[]
  }
  entryLookup: Map<string, EntryRow>
  tableNumberById: Map<string, number>
  myEntryId: string | null
  sessionLogsById?: Map<string, SessionLogRow>
}): ApiTournamentDetail {
  const { tournament, entryLookup, tableNumberById, myEntryId, sessionLogsById } =
    input
  const entries = tournament.entries.map(mapEntry)
  const totalRevivalSlotsUsed = entries.reduce(
    (sum, entry) => sum + entry.revivalsUsed,
    0,
  )
  const revivalBuyInPoolIdr = totalRevivalSlotsUsed * tournament.revivalFeeIdr

  const tables: ApiTournamentTable[] = tournament.tables.map((table) => {
    const s1 = table.seat1EntryId
      ? entryLookup.get(table.seat1EntryId)
      : undefined
    const s2 = table.seat2EntryId
      ? entryLookup.get(table.seat2EntryId)
      : undefined
    const s3 = table.seat3EntryId
      ? entryLookup.get(table.seat3EntryId)
      : undefined
    const s4 = table.seat4EntryId
      ? entryLookup.get(table.seat4EntryId)
      : undefined
    const liveSession = table.liveSession
    const seatIds = seatedEntryIds(table)
    const roundScores = roundTableScores(
      tournament.hands ?? [],
      table.id,
      seatIds,
    )
    const sessionLogs: ApiTournamentTableSessionLog[] =
      parseTournamentSessionLogIds(table.sessionLogIds)
        .map((sessionId) => sessionLogsById?.get(sessionId))
        .filter((row): row is SessionLogRow => Boolean(row))
        .map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          startedAt: row.startedAt.toISOString(),
          endedAt: row.endedAt?.toISOString() ?? null,
          handCount: row._count.hands,
        }))
    return {
      id: table.id,
      roundNumber: table.roundNumber,
      tableNumber: table.tableNumber,
      isKnockoutMatch: table.isKnockoutMatch,
      status: table.status,
      liveSessionId:
        liveSession?.status === "LIVE" ? liveSession.id : null,
      sessionLogs,
      seats: [
        seatFromEntry(s1, s1 ? roundScores.get(s1.id) ?? 0 : null),
        seatFromEntry(s2, s2 ? roundScores.get(s2.id) ?? 0 : null),
        seatFromEntry(s3, s3 ? roundScores.get(s3.id) ?? 0 : null),
        seatFromEntry(s4, s4 ? roundScores.get(s4.id) ?? 0 : null),
      ],
    }
  })

  const hands: ApiTournamentHand[] = (tournament.hands ?? []).map((hand) => {
    let deltasRaw: number[] = []
    try {
      deltasRaw = JSON.parse(hand.deltasJson) as number[]
      if (!Array.isArray(deltasRaw)) deltasRaw = []
    } catch {
      deltasRaw = []
    }
    const winner = hand.winnerEntryId
      ? entryLookup.get(hand.winnerEntryId)
      : undefined
    const dealt = hand.dealtInEntryId
      ? entryLookup.get(hand.dealtInEntryId)
      : undefined
  const tableRow = tournament.tables.find((row) => row.id === hand.tableId)
    return {
      id: hand.id,
      roundNumber: hand.roundNumber,
      tableId: hand.tableId,
      tableNumber: tableNumberById.get(hand.tableId) ?? tableRow?.tableNumber ?? 0,
      handNumber: hand.handNumber,
      winnerEntryId: hand.winnerEntryId,
      winnerName: winner?.playerName ?? null,
      dealtInEntryId: hand.dealtInEntryId,
      dealtInName: dealt?.playerName ?? null,
      winMethod: hand.winMethod,
      points: hand.points,
      combosSummary: hand.combosSummary,
      deltas: deltasRaw.map((delta, seatIndex) => {
        const entryId = tableRow
          ? [
              tableRow.seat1EntryId,
              tableRow.seat2EntryId,
              tableRow.seat3EntryId,
              tableRow.seat4EntryId,
            ][seatIndex] ?? null
          : null
        const entry = entryId ? entryLookup.get(entryId) : undefined
        return {
          seatIndex,
          entryId,
          playerName: entry?.playerName ?? null,
          delta,
        }
      }),
      createdAt: hand.createdAt.toISOString(),
    }
  })

  const staff = resolveTournamentStaff({
    panitiaUserId: tournament.panitiaUserId,
    wasitUserId: tournament.wasitUserId,
    staff: tournament.staff,
  })

  return {
    id: tournament.id,
    createdById: tournament.createdById,
    panitiaUserId: tournament.panitiaUserId,
    panitiaName: staff.panitiaNames[0] ?? tournament.panitiaUser?.name ?? null,
    wasitUserId: tournament.wasitUserId,
    wasitName: staff.wasitNames[0] ?? tournament.wasitUser?.name ?? null,
    panitiaUserIds: staff.panitiaUserIds,
    wasitUserIds: staff.wasitUserIds,
    panitiaNames: staff.panitiaNames,
    wasitNames: staff.wasitNames,
    title: tournament.title,
    subtitle: tournament.subtitle,
    format: tournament.format,
    status: tournament.status,
    entryFeeIdr: tournament.entryFeeIdr,
    prizePoolText: tournament.prizePoolText,
    maxPlayers: tournament.maxPlayers,
    revivalEnabled: tournament.revivalEnabled,
    revivalFeeIdr: tournament.revivalFeeIdr,
    maxRevivalsPerPlayer: tournament.maxRevivalsPerPlayer,
    koAdvancePerTable: Math.min(2, Math.max(1, tournament.koAdvancePerTable)),
    currentRound: tournament.currentRound,
    rulesPdfUrl: tournament.rulesPdfUrl,
    rulesPdfName: tournament.rulesPdfName,
    entryCount: entries.length,
    totalRevivalSlotsUsed,
    revivalBuyInPoolIdr,
    entries,
    tables,
    hands: hands.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    myEntryId,
  }
}

function compareStandings(a: ApiTournamentEntry, b: ApiTournamentEntry) {
  const rankWeight = (status: TournamentEntryStatus) => {
    switch (status) {
      case "CHAMPION":
        return 0
      case "ACTIVE":
      case "REVIVED":
        return 1
      case "REGISTERED":
        return 2
      case "ELIMINATED":
        return 3
      default:
        return 4
    }
  }
  const wa = rankWeight(a.status)
  const wb = rankWeight(b.status)
  if (wa !== wb) return wa - wb
  if (b.score !== a.score) return b.score - a.score
  return a.playerName.localeCompare(b.playerName)
}

export function sortStandings(
  entries: ApiTournamentEntry[],
  preferPodium = false,
) {
  if (preferPodium) {
    return [...entries].sort((a, b) => {
      const ap = a.finishPlace ?? 999
      const bp = b.finishPlace ?? 999
      if (ap !== bp) return ap - bp
      return compareStandings(a, b)
    })
  }
  return [...entries].sort(compareStandings)
}

export function canClaimRevival(
  tournament: Pick<
    ApiTournamentDetail,
    "revivalEnabled" | "maxRevivalsPerPlayer"
  >,
  entry: Pick<ApiTournamentEntry, "status" | "revivalsUsed">,
  isSelf: boolean,
) {
  if (!isSelf) return false
  if (!tournament.revivalEnabled) return false
  if (entry.status !== "ELIMINATED") return false
  return entry.revivalsUsed < tournament.maxRevivalsPerPlayer
}