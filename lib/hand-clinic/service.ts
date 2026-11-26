import { randomUUID } from "crypto"

import { prisma } from "@/lib/db"

export type HandClinicItem = {
  id: string
  userId: string
  playerName: string
  sessionId: string
  sessionTitle: string
  handNumber: number
  notes: string
  tileIds: string[]
  winningTileId: string
  pointsLost: number
  coachNote: string | null
  coachName: string | null
  status: "OPEN" | "REVIEWED"
  createdAt: string
}

export type SubmittableLostHand = {
  key: string
  sessionId: string
  sessionTitle: string
  handNumber: number
  pointsLost: number
  tileIds: string[]
  winningTileId: string
}

let ensurePromise: Promise<void> | null = null

export function ensureHandClinicTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "HandClinicSubmission" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "sessionId" TEXT NOT NULL,
          "sessionTitle" TEXT NOT NULL,
          "handNumber" INTEGER NOT NULL,
          "notes" TEXT NOT NULL,
          "tileIdsJson" JSONB NOT NULL,
          "winningTileId" TEXT NOT NULL DEFAULT '',
          "pointsLost" INTEGER NOT NULL DEFAULT 0,
          "coachNote" TEXT,
          "coachName" TEXT,
          "status" TEXT NOT NULL DEFAULT 'OPEN',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "HandClinicSubmission_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "HandClinicSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "HandClinicSubmission_status_createdAt_idx"
        ON "HandClinicSubmission"("status", "createdAt");
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "HandClinicSubmission_userId_createdAt_idx"
        ON "HandClinicSubmission"("userId", "createdAt");
      `)
    })().catch((err) => {
      ensurePromise = null
      throw err
    })
  }
  return ensurePromise
}

export async function listHandClinicSubmissions(options: {
  isPro: boolean
}): Promise<{ items: HandClinicItem[]; lockedCount: number }> {
  await ensureHandClinicTable()

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      userId: string
      userName: string
      playerNickname: string | null
      sessionId: string
      sessionTitle: string
      handNumber: number
      notes: string
      tileIdsJson: unknown
      winningTileId: string
      pointsLost: number
      coachNote: string | null
      coachName: string | null
      status: string
      createdAt: Date
    }>
  >`
    SELECT
      hc."id",
      hc."userId",
      u."name" AS "userName",
      p."nickname" AS "playerNickname",
      hc."sessionId",
      hc."sessionTitle",
      hc."handNumber",
      hc."notes",
      hc."tileIdsJson",
      hc."winningTileId",
      hc."pointsLost",
      hc."coachNote",
      hc."coachName",
      hc."status",
      hc."createdAt"
    FROM "HandClinicSubmission" hc
    INNER JOIN "User" u ON u."id" = hc."userId"
    LEFT JOIN "Player" p ON p."id" = u."playerId"
    ORDER BY
      CASE WHEN hc."status" = 'REVIEWED' THEN 0 ELSE 1 END,
      hc."createdAt" DESC
    LIMIT 30
  `

  const mapped: HandClinicItem[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    playerName:
      r.playerNickname?.trim() || r.userName.split(" ")[0] || r.userName,
    sessionId: r.sessionId,
    sessionTitle: r.sessionTitle,
    handNumber: Number(r.handNumber),
    notes: r.notes,
    tileIds: Array.isArray(r.tileIdsJson)
      ? (r.tileIdsJson as unknown[]).map(String)
      : [],
    winningTileId: r.winningTileId,
    pointsLost: Number(r.pointsLost),
    coachNote: r.coachNote,
    coachName: r.coachName,
    status: r.status === "REVIEWED" ? "REVIEWED" : "OPEN",
    createdAt: new Date(r.createdAt).toISOString(),
  }))

  if (options.isPro) {
    return { items: mapped, lockedCount: 0 }
  }

  // Free users get 1 breakdown preview
  return {
    items: mapped.slice(0, 1),
    lockedCount: Math.max(0, mapped.length - 1),
  }
}

export async function listUserSubmittableLostHands(
  userId: string,
): Promise<SubmittableLostHand[]> {
  const seats = await prisma.sessionSeat.findMany({
    where: {
      userId,
      session: { status: "FINISHED" },
    },
    include: {
      session: {
        include: {
          seats: { orderBy: { seatOrder: "asc" } },
          hands: { orderBy: { handNumber: "desc" } },
        },
      },
    },
    orderBy: { session: { startedAt: "desc" } },
    take: 10,
  })

  const out: SubmittableLostHand[] = []
  for (const mySeat of seats) {
    const myIdx = mySeat.session.seats.findIndex((s) => s.id === mySeat.id)
    if (myIdx < 0) continue

    for (const hand of mySeat.session.hands) {
      if (hand.winnerSeatId === mySeat.id) continue
      const deltasRaw = Array.isArray(hand.deltasJson)
        ? (hand.deltasJson as number[])
        : []
      const myDelta = Number(deltasRaw[myIdx] ?? 0)
      if (myDelta >= 0 && hand.dealtInSeatId !== mySeat.id) continue

      const tiles = (hand.tilesJson as {
        tileIds?: string[]
        winningTileId?: string
      }) ?? { tileIds: [], winningTileId: "" }

      out.push({
        key: `${mySeat.session.id}:${hand.handNumber}`,
        sessionId: mySeat.session.id,
        sessionTitle: mySeat.session.title,
        handNumber: hand.handNumber,
        pointsLost: Math.abs(myDelta),
        tileIds: Array.isArray(tiles.tileIds) ? tiles.tileIds : [],
        winningTileId: tiles.winningTileId ?? "",
      })
      if (out.length >= 20) return out
    }
  }
  return out
}

export async function createHandClinicSubmission(input: {
  userId: string
  sessionId: string
  handNumber: number
  notes: string
}) {
  await ensureHandClinicTable()

  const seat = await prisma.sessionSeat.findFirst({
    where: { userId: input.userId, sessionId: input.sessionId },
    include: {
      session: {
        include: {
          seats: { orderBy: { seatOrder: "asc" } },
          hands: { where: { handNumber: input.handNumber } },
        },
      },
    },
  })

  if (!seat || seat.session.hands.length === 0) {
    throw new Error("Hand not found in your game log")
  }

  const hand = seat.session.hands[0]!
  const myIdx = seat.session.seats.findIndex((s) => s.id === seat.id)
  const deltasRaw = Array.isArray(hand.deltasJson)
    ? (hand.deltasJson as number[])
    : []
  const pointsLost = Math.abs(Number(deltasRaw[myIdx] ?? 0))
  const tiles = (hand.tilesJson as {
    tileIds?: string[]
    winningTileId?: string
  }) ?? { tileIds: [], winningTileId: "" }

  const id = randomUUID()
  const tileIdsJson = JSON.stringify(
    Array.isArray(tiles.tileIds) ? tiles.tileIds : [],
  )

  await prisma.$executeRaw`
    INSERT INTO "HandClinicSubmission" (
      "id",
      "userId",
      "sessionId",
      "sessionTitle",
      "handNumber",
      "notes",
      "tileIdsJson",
      "winningTileId",
      "pointsLost",
      "status",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${input.userId},
      ${input.sessionId},
      ${seat.session.title},
      ${input.handNumber},
      ${input.notes.trim()},
      ${tileIdsJson}::jsonb,
      ${tiles.winningTileId ?? ""},
      ${pointsLost},
      'OPEN',
      NOW(),
      NOW()
    )
  `
  return id
}

export async function reviewHandClinicSubmission(input: {
  id: string
  coachName: string
  coachNote: string
}) {
  await ensureHandClinicTable()
  await prisma.$executeRaw`
    UPDATE "HandClinicSubmission"
    SET
      "coachNote" = ${input.coachNote.trim()},
      "coachName" = ${input.coachName},
      "status" = 'REVIEWED',
      "updatedAt" = NOW()
    WHERE "id" = ${input.id}
  `
}
