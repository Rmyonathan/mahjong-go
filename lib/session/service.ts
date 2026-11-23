import type {
  HandWinMethod,
  MeetBoardType,
  Prisma,
  SeatWind,
  SessionStatus,
} from "@prisma/client"

import { prisma } from "@/lib/db"
import type { FormResult } from "@/lib/mock/jade-board"
import {
  computePayoutDeltas,
  type LiveBoard,
  type LiveHand,
  type LiveSeat,
  type LiveSession,
  type LiveWind,
  type WinMethod,
} from "@/lib/session/live-demo"

// EDIT HERE — ELO K-factor used when a session is finished
export const ELO_K_FACTOR = 32

// EDIT HERE — base XP granted to each registered player when a session finishes
export const XP_PER_SESSION = 25

const WIND_TO_DB: Record<LiveWind, SeatWind> = {
  east: "EAST",
  south: "SOUTH",
  west: "WEST",
  north: "NORTH",
}

const WIND_FROM_DB: Record<SeatWind, LiveWind> = {
  EAST: "east",
  SOUTH: "south",
  WEST: "west",
  NORTH: "north",
}

const BOARD_TO_DB: Record<LiveBoard, MeetBoardType> = {
  beginner: "BEGINNER",
  advanced: "ADVANCED",
  mcr: "MCR",
}

const BOARD_FROM_DB: Record<MeetBoardType, LiveBoard> = {
  BEGINNER: "beginner",
  ADVANCED: "advanced",
  MCR: "mcr",
  GUIDED: "beginner",
}

export type CreateSessionSeatInput = {
  wind: LiveWind
  /** Registered club user id (preferred) */
  userId?: string | null
  /** Jade Player id — resolved to a User when possible */
  playerId?: string | null
  guestName?: string | null
  name?: string | null
  nickname?: string | null
}

export type CreateSessionInput = {
  title: string
  board: LiveBoard
  seats: CreateSessionSeatInput[]
  meetId?: string | null
  captainUserId: string
}

export type LogHandInput = {
  winnerSeatIndex: number
  method: WinMethod | "draw"
  dealtBySeatIndex: number | null
  points: number
  combos: { label: string; fan: number }[]
  tileIds: string[]
  winningTileId: string
  deltas?: number[]
  demoHandId?: string
}

type SeatWithUser = Prisma.SessionSeatGetPayload<{
  include: { user: { include: { player: true } } }
}>

type SessionFull = Prisma.GameSessionGetPayload<{
  include: {
    seats: { include: { user: { include: { player: true } } } }
    hands: true
    captain: true
  }
}>

function displayName(seat: SeatWithUser) {
  if (seat.user?.player) return seat.user.player.name
  if (seat.user) return seat.user.name
  return seat.guestName?.trim() || "Guest"
}

function displayNickname(seat: SeatWithUser) {
  if (seat.user?.player) return seat.user.player.nickname
  if (seat.user) return seat.user.name.split(" ")[0] ?? seat.user.name
  return seat.guestName?.trim().split(" ")[0] || "Guest"
}

function boardTierFromMeet(boardType: MeetBoardType) {
  if (boardType === "BEGINNER" || boardType === "GUIDED") return "beginner" as const
  if (boardType === "MCR") return "mcr" as const
  return "advanced" as const
}

export async function createGameSession(input: CreateSessionInput) {
  if (input.seats.length < 3 || input.seats.length > 4) {
    throw new Error("Sessions need 3 or 4 seats")
  }

  const playerIds = input.seats
    .map((seat) => seat.playerId)
    .filter(
      (id): id is string =>
        typeof id === "string" && id.length > 0 && !id.startsWith("guest-"),
    )

  const usersByPlayer =
    playerIds.length > 0
      ? await prisma.user.findMany({
          where: { playerId: { in: playerIds } },
        })
      : []
  const playerToUser = new Map(
    usersByPlayer.map((user) => [user.playerId!, user.id]),
  )

  const explicitUserIds = input.seats
    .map((seat) => seat.userId)
    .filter((id): id is string => Boolean(id))
  if (explicitUserIds.length > 0) {
    const found = await prisma.user.findMany({
      where: { id: { in: explicitUserIds } },
      select: { id: true },
    })
    if (found.length !== new Set(explicitUserIds).size) {
      throw new Error("One or more seat users were not found")
    }
  }

  const seatRows = input.seats.map((seat, index) => {
    const wind = WIND_TO_DB[seat.wind]
    let userId: string | null = seat.userId ?? null
    if (!userId && seat.playerId && !seat.playerId.startsWith("guest-")) {
      userId = playerToUser.get(seat.playerId) ?? null
    }
    const guestName =
      userId != null
        ? null
        : (seat.guestName?.trim() ||
            seat.name?.trim() ||
            seat.nickname?.trim() ||
            null)
    if (!userId && !guestName) {
      throw new Error(`Seat ${seat.wind} needs a registered user or guest name`)
    }
    return {
      wind,
      seatOrder: index,
      userId,
      guestName,
      netPoints: 0,
      wins: 0,
      selfDraws: 0,
      dealtInCount: 0,
    }
  })

  return prisma.gameSession.create({
    data: {
      title: input.title.trim() || "Jade Table",
      boardType: BOARD_TO_DB[input.board],
      status: "LIVE",
      meetId: input.meetId ?? null,
      captainUserId: input.captainUserId,
      seats: { create: seatRows },
    },
    include: {
      seats: {
        include: { user: { include: { player: true } } },
        orderBy: { seatOrder: "asc" },
      },
      hands: { orderBy: { handNumber: "asc" } },
      captain: true,
    },
  })
}

export async function getGameSession(id: string) {
  return prisma.gameSession.findUnique({
    where: { id },
    include: {
      seats: {
        include: { user: { include: { player: true } } },
        orderBy: { seatOrder: "asc" },
      },
      hands: { orderBy: { handNumber: "asc" } },
      captain: true,
    },
  })
}

export function toLiveSession(session: SessionFull): LiveSession {
  const seatsOrdered = [...session.seats].sort(
    (a, b) => a.seatOrder - b.seatOrder,
  )
  const seatIndexById = new Map(
    seatsOrdered.map((seat, index) => [seat.id, index]),
  )

  const liveSeats: LiveSeat[] = seatsOrdered.map((seat) => ({
    wind: WIND_FROM_DB[seat.wind],
    playerId: seat.user?.playerId ?? seat.userId,
    name: displayName(seat),
    nickname: displayNickname(seat),
    net: seat.netPoints,
    wins: seat.wins,
    dealtIn: seat.dealtInCount,
    selfDraw: seat.selfDraws,
    form: [],
  }))

  const handsAsc = [...session.hands].sort(
    (a, b) => a.handNumber - b.handNumber,
  )

  const race: number[][] = liveSeats.map(() => [0])
  const running = liveSeats.map(() => 0)
  const forms: FormResult[][] = liveSeats.map(() => [])

  const liveHands: LiveHand[] = []

  for (const hand of handsAsc) {
    const deltasRaw = hand.deltasJson as number[] | Record<string, number>
    const deltas = Array.isArray(deltasRaw)
      ? deltasRaw
      : seatsOrdered.map((seat) => Number(deltasRaw[seat.id] ?? 0))

    const winnerSeatIndex =
      hand.winnerSeatId != null
        ? (seatIndexById.get(hand.winnerSeatId) ?? -1)
        : -1
    const dealtBySeatIndex =
      hand.dealtInSeatId != null
        ? (seatIndexById.get(hand.dealtInSeatId) ?? null)
        : null

    const method: WinMethod =
      hand.winMethod === "SELF_DRAW" ? "self-draw" : "discard"

    const combos = (hand.combosJson as { label: string; fan: number }[]) ?? []
    const tiles = (hand.tilesJson as {
      tileIds?: string[]
      winningTileId?: string
      demoHandId?: string
    }) ?? { tileIds: [], winningTileId: "" }

    for (let i = 0; i < liveSeats.length; i++) {
      const delta = deltas[i] ?? 0
      running[i] += delta
      race[i].push(running[i])
      const won = i === winnerSeatIndex
      const formEntry: FormResult =
        hand.winMethod === "DRAW" ? "D" : won ? "W" : delta < 0 ? "L" : "D"
      forms[i] = [...forms[i], formEntry].slice(-8)
    }

    liveHands.push({
      id: hand.id,
      handNo: hand.handNumber,
      winnerSeatIndex,
      method,
      dealtBySeatIndex,
      tileIds: tiles.tileIds ?? [],
      winningTileId: tiles.winningTileId ?? "",
      combos,
      points: hand.points,
      deltas,
      demoHandId: tiles.demoHandId,
    })
  }

  for (let i = 0; i < liveSeats.length; i++) {
    liveSeats[i].form = forms[i]
  }

  const status: LiveSession["status"] =
    session.status === "FINISHED" ? "finished" : "live"

  return {
    id: session.id,
    title: session.title,
    board: BOARD_FROM_DB[session.boardType],
    seatCount: (seatsOrdered.length === 3 ? 3 : 4) as 3 | 4,
    seats: liveSeats,
    hands: [...liveHands].reverse(),
    race,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    status,
    handNumber: handsAsc.length + 1,
    dealerSeatIndex: handsAsc.length % Math.max(seatsOrdered.length, 1),
  }
}

export function serializeSession(session: SessionFull) {
  return {
    ...toLiveSession(session),
    captainUserId: session.captainUserId,
    captainName: session.captain.name,
    meetId: session.meetId,
    boardType: session.boardType,
    dbStatus: session.status as SessionStatus,
    seatsMeta: session.seats
      .slice()
      .sort((a, b) => a.seatOrder - b.seatOrder)
      .map((seat) => ({
        id: seat.id,
        wind: seat.wind,
        userId: seat.userId,
        guestName: seat.guestName,
        playerId: seat.user?.playerId ?? null,
        netPoints: seat.netPoints,
        wins: seat.wins,
        selfDraws: seat.selfDraws,
        dealtInCount: seat.dealtInCount,
      })),
  }
}

export async function logHand(sessionId: string, input: LogHandInput) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findUnique({
      where: { id: sessionId },
      include: { seats: { orderBy: { seatOrder: "asc" } } },
    })
    if (!session) throw new Error("Session not found")
    if (session.status !== "LIVE") throw new Error("Session is not live")

    const seats = session.seats
    const isDraw = input.method === "draw" || input.winnerSeatIndex < 0

    let winMethod: HandWinMethod
    let winnerSeatId: string | null = null
    let dealtInSeatId: string | null = null
    let deltas: number[]

    if (isDraw) {
      winMethod = "DRAW"
      deltas = seats.map(() => 0)
    } else {
      const winner = seats[input.winnerSeatIndex]
      if (!winner) throw new Error("Invalid winner seat")
      winnerSeatId = winner.id
      winMethod = input.method === "self-draw" ? "SELF_DRAW" : "DISCARD"
      if (winMethod === "DISCARD") {
        if (
          input.dealtBySeatIndex == null ||
          !seats[input.dealtBySeatIndex]
        ) {
          throw new Error("Dealt-in seat required for discard wins")
        }
        dealtInSeatId = seats[input.dealtBySeatIndex].id
      }
      deltas =
        input.deltas ??
        computePayoutDeltas({
          seatCount: seats.length,
          winnerSeatIndex: input.winnerSeatIndex,
          method: input.method === "self-draw" ? "self-draw" : "discard",
          dealtBySeatIndex: input.dealtBySeatIndex,
          winnerPoints: input.points,
        })
    }

    const lastHand = await tx.handRecord.findFirst({
      where: { sessionId },
      orderBy: { handNumber: "desc" },
      select: { handNumber: true },
    })
    const handNumber = (lastHand?.handNumber ?? 0) + 1

    const hand = await tx.handRecord.create({
      data: {
        sessionId,
        handNumber,
        winnerSeatId,
        dealtInSeatId,
        winMethod,
        points: isDraw ? 0 : Math.max(0, Math.round(input.points)),
        combosJson: input.combos,
        tilesJson: {
          tileIds: input.tileIds,
          winningTileId: input.winningTileId,
          demoHandId: input.demoHandId ?? null,
        },
        deltasJson: deltas,
      },
    })

    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i]
      const delta = deltas[i] ?? 0
      const won = !isDraw && i === input.winnerSeatIndex
      const dealt =
        !isDraw &&
        winMethod === "DISCARD" &&
        i === input.dealtBySeatIndex
      await tx.sessionSeat.update({
        where: { id: seat.id },
        data: {
          netPoints: { increment: delta },
          wins: won ? { increment: 1 } : undefined,
          selfDraws:
            won && winMethod === "SELF_DRAW" ? { increment: 1 } : undefined,
          dealtInCount: dealt ? { increment: 1 } : undefined,
        },
      })
    }

    return hand
  })
}

function expectedScore(rating: number, opponentAvg: number) {
  return 1 / (1 + 10 ** ((opponentAvg - rating) / 400))
}

const sessionFullInclude = {
  seats: {
    include: { user: { include: { player: true } } },
    orderBy: { seatOrder: "asc" as const },
  },
  hands: { orderBy: { handNumber: "asc" as const } },
  captain: true,
} satisfies Prisma.GameSessionInclude

export async function finishGameSession(sessionId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        seats: {
          include: { user: { include: { player: true } } },
          orderBy: { seatOrder: "asc" },
        },
        hands: true,
        captain: true,
      },
    })
    if (!session) throw new Error("Session not found")
    if (session.status === "FINISHED") {
      return session
    }

    const endedAt = new Date()
    await tx.gameSession.update({
      where: { id: sessionId },
      data: { status: "FINISHED", endedAt },
    })

    const ranked = [...session.seats].sort(
      (a, b) => b.netPoints - a.netPoints,
    )
    const registered = ranked.filter(
      (seat) => seat.user?.playerId && seat.user.player,
    )

    if (registered.length >= 2) {
      const ratings = registered.map(
        (seat) => seat.user!.player!.skillRating,
      )
      const n = registered.length

      for (let place = 0; place < n; place++) {
        const seat = registered[place]
        const player = seat.user!.player!
        const others = ratings.filter((_, i) => i !== place)
        const oppAvg = others.reduce((a, b) => a + b, 0) / others.length
        const actual = (n - 1 - place) / (n - 1)
        const expected = expectedScore(player.skillRating, oppAvg)
        // EDIT HERE — ELO K-factor (also exported as ELO_K_FACTOR)
        const k = ELO_K_FACTOR
        const nextRating = Math.round(
          player.skillRating + k * (actual - expected),
        )
        // EDIT HERE — XP-per-session base grant (also exported as XP_PER_SESSION)
        const xpGain = XP_PER_SESSION + seat.wins * 5
        const { applyPlayerXpGain } = await import("@/lib/xp/apply")

        await tx.player.update({
          where: { id: player.id },
          data: { skillRating: Math.max(100, nextRating) },
        })
        await applyPlayerXpGain(player.id, xpGain, tx)
      }
    } else {
      const { applyPlayerXpGain } = await import("@/lib/xp/apply")
      for (const seat of registered) {
        // EDIT HERE — XP-per-session base grant (also exported as XP_PER_SESSION)
        await applyPlayerXpGain(
          seat.user!.playerId!,
          XP_PER_SESSION + seat.wins * 5,
          tx,
        )
      }
    }

    const season = await tx.season.findFirst({ where: { isActive: true } })
    if (season) {
      const board = boardTierFromMeet(session.boardType)
      for (const seat of ranked) {
        const playerId = seat.user?.playerId
        if (!playerId) continue

        const existing = await tx.boardStanding.findUnique({
          where: {
            seasonId_playerId: { seasonId: season.id, playerId },
          },
        })

        const formEntry: FormResult =
          seat.netPoints > 0 ? "W" : seat.netPoints < 0 ? "L" : "D"
        const discardWins = Math.max(0, seat.wins - seat.selfDraws)

        if (!existing) {
          await tx.boardStanding.create({
            data: {
              seasonId: season.id,
              playerId,
              rank: 999,
              board,
              points: Math.max(0, seat.netPoints),
              wins: seat.wins,
              games: 1,
              winRate: seat.wins > 0 ? 1 : 0,
              ptsPerWin: seat.wins > 0 ? Math.max(0, seat.netPoints) : 0,
              bonus: 0,
              pen: 0,
              biggestHand: 0,
              form: [formEntry],
              streak: formEntry === "W" ? 1 : 0,
              selfDraw: seat.selfDraws,
              discardWins,
            },
          })
        } else {
          const games = existing.games + 1
          const wins = existing.wins + seat.wins
          const points = existing.points + seat.netPoints
          const form = [...existing.form, formEntry].slice(-8) as FormResult[]
          await tx.boardStanding.update({
            where: { id: existing.id },
            data: {
              points,
              wins,
              games,
              winRate: games > 0 ? wins / Math.max(games, 1) : 0,
              ptsPerWin: wins > 0 ? Math.round(points / wins) : 0,
              form,
              streak:
                formEntry === "W"
                  ? existing.streak > 0
                    ? existing.streak + 1
                    : 1
                  : 0,
              selfDraw: existing.selfDraw + seat.selfDraws,
              discardWins: existing.discardWins + discardWins,
            },
          })
        }
      }

      const standings = await tx.boardStanding.findMany({
        where: { seasonId: season.id, board },
        orderBy: [{ points: "desc" }, { wins: "desc" }],
      })
      for (let i = 0; i < standings.length; i++) {
        await tx.boardStanding.update({
          where: { id: standings[i].id },
          data: { rank: i + 1 },
        })
      }

      await tx.season.update({
        where: { id: season.id },
        data: {
          sessionsPlayed: { increment: 1 },
          gamesPlayed: { increment: session.hands.length },
        },
      })
    }

    return tx.gameSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: sessionFullInclude,
    })
  })
}

export async function countFinishedSessions() {
  return prisma.gameSession.count({ where: { status: "FINISHED" } })
}

/** LIVE tables the user can reopen (captain, seated member, or admin). */
export async function listLiveSessionsForUser(userId: string, isAdmin = false) {
  const sessions = await prisma.gameSession.findMany({
    where: {
      status: "LIVE",
      ...(isAdmin
        ? {}
        : {
            OR: [
              { captainUserId: userId },
              { seats: { some: { userId } } },
            ],
          }),
    },
    include: {
      seats: {
        include: { user: { include: { player: true } } },
        orderBy: { seatOrder: "asc" },
      },
      hands: { orderBy: { handNumber: "asc" } },
      captain: true,
    },
    orderBy: { startedAt: "desc" },
  })
  return sessions
}

export async function findLiveSessionByMeetId(meetId: string) {
  return prisma.gameSession.findFirst({
    where: { meetId, status: "LIVE" },
    include: {
      seats: {
        include: { user: { include: { player: true } } },
        orderBy: { seatOrder: "asc" },
      },
      hands: { orderBy: { handNumber: "asc" } },
      captain: true,
    },
    orderBy: { startedAt: "desc" },
  })
}
