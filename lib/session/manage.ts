import { prisma } from "@/lib/db"

export type RetiredSeatRecord = {
  seatId: string
  seatOrder: number
  name: string
  nickname: string
  fromHand: number
  untilHand: number
}

export type SessionManageState = {
  dealerOffset: number
  roundOffset: number
  scannerUserIds: string[]
  seatJoinHand: Record<string, number>
  retiredPlayers: RetiredSeatRecord[]
}

let ensurePromise: Promise<void> | null = null

export function ensureSessionManageTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SessionManageState" (
          "sessionId" TEXT NOT NULL,
          "dealerOffset" INTEGER NOT NULL DEFAULT 0,
          "roundOffset" INTEGER NOT NULL DEFAULT 0,
          "scannerUserIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
          "seatJoinHand" JSONB NOT NULL DEFAULT '{}'::jsonb,
          "retiredPlayers" JSONB NOT NULL DEFAULT '[]'::jsonb,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SessionManageState_pkey" PRIMARY KEY ("sessionId"),
          CONSTRAINT "SessionManageState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "SessionManageState"
        ADD COLUMN IF NOT EXISTS "seatJoinHand" JSONB NOT NULL DEFAULT '{}'::jsonb;
      `)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "SessionManageState"
        ADD COLUMN IF NOT EXISTS "retiredPlayers" JSONB NOT NULL DEFAULT '[]'::jsonb;
      `)
    })().catch((err) => {
      ensurePromise = null
      throw err
    })
  }
  return ensurePromise
}

export async function getSessionManageState(
  sessionId: string,
): Promise<SessionManageState> {
  await ensureSessionManageTable()
  const rows = await prisma.$queryRaw<
    Array<{
      dealerOffset: number
      roundOffset: number
      scannerUserIds: unknown
      seatJoinHand: unknown
      retiredPlayers: unknown
    }>
  >`
    SELECT "dealerOffset", "roundOffset", "scannerUserIds", "seatJoinHand", "retiredPlayers"
    FROM "SessionManageState"
    WHERE "sessionId" = ${sessionId}
    LIMIT 1
  `
  const row = rows[0]
  if (!row) {
    return {
      dealerOffset: 0,
      roundOffset: 0,
      scannerUserIds: [],
      seatJoinHand: {},
      retiredPlayers: [],
    }
  }
  const rawJoin =
    row.seatJoinHand && typeof row.seatJoinHand === "object"
      ? (row.seatJoinHand as Record<string, unknown>)
      : {}
  const seatJoinHand: Record<string, number> = {}
  for (const [k, v] of Object.entries(rawJoin)) {
    seatJoinHand[k] = Number(v) || 0
  }
  const retiredPlayers: RetiredSeatRecord[] = Array.isArray(row.retiredPlayers)
    ? (row.retiredPlayers as RetiredSeatRecord[])
    : []

  return {
    dealerOffset: Number(row.dealerOffset) || 0,
    roundOffset: Number(row.roundOffset) || 0,
    scannerUserIds: Array.isArray(row.scannerUserIds)
      ? (row.scannerUserIds as unknown[]).map(String)
      : [],
    seatJoinHand,
    retiredPlayers,
  }
}

export async function saveSessionManageState(
  sessionId: string,
  state: SessionManageState,
) {
  await ensureSessionManageTable()
  const scannersJson = JSON.stringify(Array.from(new Set(state.scannerUserIds)))
  const joinHandJson = JSON.stringify(state.seatJoinHand ?? {})
  const retiredJson = JSON.stringify(state.retiredPlayers ?? [])
  await prisma.$executeRaw`
    INSERT INTO "SessionManageState" (
      "sessionId",
      "dealerOffset",
      "roundOffset",
      "scannerUserIds",
      "seatJoinHand",
      "retiredPlayers",
      "updatedAt"
    )
    VALUES (
      ${sessionId},
      ${state.dealerOffset},
      ${state.roundOffset},
      ${scannersJson}::jsonb,
      ${joinHandJson}::jsonb,
      ${retiredJson}::jsonb,
      NOW()
    )
    ON CONFLICT ("sessionId") DO UPDATE
    SET
      "dealerOffset" = EXCLUDED."dealerOffset",
      "roundOffset" = EXCLUDED."roundOffset",
      "scannerUserIds" = EXCLUDED."scannerUserIds",
      "seatJoinHand" = EXCLUDED."seatJoinHand",
      "retiredPlayers" = EXCLUDED."retiredPlayers",
      "updatedAt" = NOW()
  `
}

export async function markSeatResetAtCurrentHand(
  sessionId: string,
  seatId: string,
  retiredInfo?: {
    seatOrder: number
    name: string
    nickname: string
  },
) {
  const [cur, handCount] = await Promise.all([
    getSessionManageState(sessionId),
    prisma.handRecord.count({ where: { sessionId } }),
  ])
  const prevFrom = cur.seatJoinHand[seatId] ?? 0
  const nextRetired = [...cur.retiredPlayers]
  if (retiredInfo && handCount > prevFrom) {
    nextRetired.push({
      seatId,
      seatOrder: retiredInfo.seatOrder,
      name: retiredInfo.name,
      nickname: retiredInfo.nickname,
      fromHand: prevFrom,
      untilHand: handCount,
    })
  }
  await saveSessionManageState(sessionId, {
    ...cur,
    seatJoinHand: {
      ...cur.seatJoinHand,
      [seatId]: handCount,
    },
    retiredPlayers: nextRetired,
  })
}

export async function retireSeat(input: {
  sessionId: string
  seatId: string
  captainUserId: string
  replacementName?: string
}) {
  const seat = await prisma.sessionSeat.findFirst({
    where: { id: input.seatId, sessionId: input.sessionId },
    include: {
      session: { select: { meetId: true } },
      user: { include: { player: true } },
    },
  })
  if (!seat) throw new Error("Seat not found")
  if (seat.userId && seat.userId === input.captainUserId) {
    throw new Error("Cannot retire the table owner")
  }

  const prevName =
    seat.user?.player?.name ??
    seat.user?.name ??
    seat.guestName?.trim() ??
    "Player"
  const prevNickname =
    seat.user?.player?.nickname ??
    seat.user?.name?.split(" ")[0] ??
    seat.guestName?.trim().split(" ")[0] ??
    "Player"
  const shouldRecordRetired = prevName !== "Retired (Open)"

  const hasReplacement = Boolean(input.replacementName?.trim())
  const nextName = input.replacementName?.trim() || "Retired (Open)"
  const retiredUserId = seat.userId

  await prisma.$transaction(async (tx) => {
    // Keep SessionSeat row & all HandRecords intact; reset counters only if a replacement is immediately seated
    await tx.sessionSeat.update({
      where: { id: seat.id },
      data: {
        userId: null,
        guestName: nextName,
        ...(hasReplacement
          ? { netPoints: 0, wins: 0, selfDraws: 0, dealtInCount: 0 }
          : {}),
      },
    })

    if (seat.session.meetId) {
      if (retiredUserId) {
        await tx.booking.updateMany({
          where: {
            meetId: seat.session.meetId,
            userId: retiredUserId,
            status: "CONFIRMED",
          },
          data: {
            status: "CANCELLED",
            seatNumber: null,
            checkInCode: null,
          },
        })
      }

      if (nextName === "Retired (Open)") {
        const nextWait = await tx.booking.findFirst({
          where: { meetId: seat.session.meetId, status: "WAITLIST" },
          orderBy: { createdAt: "asc" },
        })
        if (nextWait) {
          await tx.booking.update({
            where: { id: nextWait.id },
            data: { status: "PENDING" },
          })
        }
        await tx.meet.update({
          where: { id: seat.session.meetId },
          data: { status: "OPEN" },
        })
      }
    }
  })

  if (shouldRecordRetired) {
    await markSeatResetAtCurrentHand(input.sessionId, seat.id, {
      seatOrder: seat.seatOrder,
      name: prevName,
      nickname: prevNickname,
    })
  } else if (hasReplacement) {
    await markSeatResetAtCurrentHand(input.sessionId, seat.id)
  }

  if (retiredUserId) {
    const cur = await getSessionManageState(input.sessionId)
    if (cur.scannerUserIds.includes(retiredUserId)) {
      await saveSessionManageState(input.sessionId, {
        ...cur,
        scannerUserIds: cur.scannerUserIds.filter((id) => id !== retiredUserId),
      })
    }
  }
}

export async function removeHandFromSession(input: {
  sessionId: string
  handId: string
}) {
  await prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findUnique({
      where: { id: input.sessionId },
      include: {
        seats: { orderBy: { seatOrder: "asc" } },
        hands: { orderBy: { handNumber: "asc" } },
      },
    })
    if (!session) throw new Error("Session not found")
    if (session.status !== "LIVE") {
      throw new Error("Only live sessions can remove hands")
    }

    const hand = session.hands.find((h) => h.id === input.handId)
    if (!hand) throw new Error("Hand not found")

    const deltasRaw = hand.deltasJson as number[] | Record<string, number>
    const deltas = Array.isArray(deltasRaw)
      ? deltasRaw
      : session.seats.map((s) => Number(deltasRaw[s.id] ?? 0))

    for (let i = 0; i < session.seats.length; i++) {
      const seat = session.seats[i]!
      const delta = Number(deltas[i] ?? 0)
      const won = hand.winnerSeatId === seat.id
      const dealt =
        hand.winMethod === "DISCARD" && hand.dealtInSeatId === seat.id

      await tx.sessionSeat.update({
        where: { id: seat.id },
        data: {
          netPoints: { decrement: delta },
          wins: won && seat.wins > 0 ? { decrement: 1 } : undefined,
          selfDraws:
            won && hand.winMethod === "SELF_DRAW" && seat.selfDraws > 0
              ? { decrement: 1 }
              : undefined,
          dealtInCount:
            dealt && seat.dealtInCount > 0 ? { decrement: 1 } : undefined,
        },
      })
    }

    await tx.handRecord.delete({ where: { id: hand.id } })

    const remaining = session.hands.filter((h) => h.id !== hand.id)
    for (let i = 0; i < remaining.length; i++) {
      const row = remaining[i]!
      if (row.handNumber !== i + 1) {
        await tx.handRecord.update({
          where: { id: row.id },
          data: { handNumber: i + 1 },
        })
      }
    }
  })
}
