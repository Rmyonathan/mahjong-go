export type ApiTournamentFormat = "POINTS_RACE" | "KNOCKOUT" | "HYBRID_KO"
export type ApiTournamentStatus = "REGISTRATION" | "LIVE" | "COMPLETED"
export type ApiTournamentEntryStatus =
  | "REGISTERED"
  | "ACTIVE"
  | "ELIMINATED"
  | "REVIVED"
  | "CHAMPION"

export interface ApiTournamentListItem {
  id: string
  title: string
  subtitle: string
  format: ApiTournamentFormat
  status: ApiTournamentStatus
  entryFeeIdr: number
  prizePoolText: string
  maxPlayers: number
  revivalEnabled: boolean
  revivalFeeIdr: number
  maxRevivalsPerPlayer: number
  currentRound: number
  rulesPdfUrl: string | null
  rulesPdfName: string | null
  entryCount: number
  tableCount: number
  createdAt: string
}

export function formatTournamentFeeIdr(amount: number) {
  if (amount <= 0) return "Free entry"
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`
}

export function tournamentFormatLabel(format: ApiTournamentFormat) {
  switch (format) {
    case "POINTS_RACE":
      return "Points race"
    case "KNOCKOUT":
      return "Knockout"
    case "HYBRID_KO":
      return "Hybrid KO"
    default:
      return format
  }
}

export function tournamentFormatBlurb(format: ApiTournamentFormat) {
  switch (format) {
    case "POINTS_RACE":
      return "Everyone keeps playing rounds; standings use cumulative score (revival still applies if enabled)."
    case "KNOCKOUT":
      return "Each round is elimination: close the round to drop losers; only top N per table roll into the next bracket round."
    case "HYBRID_KO":
      return "Label for points qualifiers → KO finals. Engine currently runs the same KO bracket flow as Knockout until hybrid phases ship."
    default:
      return ""
  }
}

export function tournamentStatusLabel(status: ApiTournamentStatus) {
  switch (status) {
    case "REGISTRATION":
      return "Registration"
    case "LIVE":
      return "Live"
    case "COMPLETED":
      return "Completed"
    default:
      return status
  }
}

export function tournamentEntryStatusLabel(status: ApiTournamentEntryStatus) {
  switch (status) {
    case "REGISTERED":
      return "Registered"
    case "ACTIVE":
      return "Active"
    case "ELIMINATED":
      return "Eliminated"
    case "REVIVED":
      return "Revived"
    case "CHAMPION":
      return "Champion"
    default:
      return status
  }
}

export interface ApiTournamentEntry {
  id: string
  userId: string | null
  playerName: string
  status: ApiTournamentEntryStatus
  score: number
  revivalsUsed: number
  eliminatedRound: number | null
  finishPlace: number | null
  createdAt: string
}

export interface ApiTournamentTableSessionLog {
  id: string
  title?: string
  status: "LIVE" | "FINISHED"
  startedAt: string
  endedAt: string | null
  handCount: number
}

export interface ApiTournamentTableSeat {
  entryId: string | null
  playerName: string | null
  /** Cumulative tournament standing (points race / totals). */
  score: number | null
  /** Net at this table this round (from logged hands). */
  roundScore: number | null
  status: ApiTournamentEntryStatus | null
}

export interface ApiTournamentTable {
  id: string
  roundNumber: number
  tableNumber: number
  isKnockoutMatch: boolean
  status: "WAITING" | "LIVE" | "FINISHED"
  liveSessionId: string | null
  sessionLogs: ApiTournamentTableSessionLog[]
  seats: [ApiTournamentTableSeat, ApiTournamentTableSeat, ApiTournamentTableSeat, ApiTournamentTableSeat]
}

export type ApiTournamentHandWinMethod = "SELF_DRAW" | "DISCARD" | "DRAW"

export interface ApiTournamentHandDelta {
  seatIndex: number
  entryId: string | null
  playerName: string | null
  delta: number
}

export interface ApiTournamentHand {
  id: string
  roundNumber: number
  tableId: string
  tableNumber: number
  handNumber: number
  winnerEntryId: string | null
  winnerName: string | null
  dealtInEntryId: string | null
  dealtInName: string | null
  winMethod: ApiTournamentHandWinMethod
  points: number
  combosSummary: string | null
  deltas: ApiTournamentHandDelta[]
  createdAt: string
}

export interface ApiTournamentDetail {
  id: string
  createdById: string
  panitiaUserId: string | null
  panitiaName: string | null
  wasitUserId: string | null
  wasitName: string | null
  panitiaUserIds: string[]
  wasitUserIds: string[]
  panitiaNames: string[]
  wasitNames: string[]
  title: string
  subtitle: string
  format: ApiTournamentFormat
  status: ApiTournamentStatus
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
  entryCount: number
  /** Sum of all `revivalsUsed` across entries. */
  totalRevivalSlotsUsed: number
  /** EDIT HERE — computed client-side from slots × fee; mirrors server field. */
  revivalBuyInPoolIdr: number
  entries: ApiTournamentEntry[]
  tables: ApiTournamentTable[]
  hands: ApiTournamentHand[]
  myEntryId: string | null
}

export function tournamentHandWinMethodLabel(
  method: ApiTournamentHandWinMethod,
) {
  switch (method) {
    case "SELF_DRAW":
      return "Self-draw"
    case "DISCARD":
      return "Discard"
    case "DRAW":
      return "Draw"
    default:
      return method
  }
}