import { randomUUID } from "crypto"
import { prisma } from "@/lib/db"

export type PendingSeatInvite = {
  id: string
  sessionId: string
  sessionTitle: string
  boardType: string
  seatId: string
  wind: "east" | "south" | "west" | "north"
  inviterName: string
  createdAt: string
}

let ensurePromise: Promise<void> | null = null

/**
 * Ensures the `"SessionSeatInvite"` table and indexes exist in Postgres
 * matching `prisma/schema.prisma` 1-to-1. Safe to call repeatedly.
 */
export function ensureSeatInviteTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SessionSeatInvite" (
          "id" TEXT NOT NULL,
          "sessionId" TEXT NOT NULL,
          "seatId" TEXT NOT NULL,
          "inviterUserId" TEXT NOT NULL,
          "inviteeUserId" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SessionSeatInvite_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "SessionSeatInvite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "SessionSeatInvite_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "SessionSeat"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "SessionSeatInvite_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "SessionSeatInvite_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `)
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "SessionSeatInvite_seatId_key"
        ON "SessionSeatInvite"("seatId");
      `)
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "SessionSeatInvite_sessionId_inviteeUserId_key"
        ON "SessionSeatInvite"("sessionId", "inviteeUserId");
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "SessionSeatInvite_inviteeUserId_status_idx"
        ON "SessionSeatInvite"("inviteeUserId", "status");
      `)
    })().catch((err) => {
      ensurePromise = null
      throw err
    })
  }
  return ensurePromise
}

export async function createSeatInvites(input: {
  sessionId: string
  inviterUserId: string
  invites: Array<{ seatId: string; inviteeUserId: string }>
}) {
  if (input.invites.length === 0) return
  await ensureSeatInviteTable()

  for (const item of input.invites) {
    const id = randomUUID()
    await prisma.$executeRaw`
      INSERT INTO "SessionSeatInvite" (
        "id",
        "sessionId",
        "seatId",
        "inviterUserId",
        "inviteeUserId",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${input.sessionId},
        ${item.seatId},
        ${input.inviterUserId},
        ${item.inviteeUserId},
        'PENDING',
        NOW(),
        NOW()
      )
      ON CONFLICT ("sessionId", "inviteeUserId") DO NOTHING
    `
  }
}

export async function listPendingSeatInvitesForUser(
  userId: string,
): Promise<PendingSeatInvite[]> {
  await ensureSeatInviteTable()

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      sessionId: string
      sessionTitle: string
      boardType: string
      seatId: string
      wind: string
      inviterName: string
      inviterNickname: string | null
      createdAt: Date
    }>
  >`
    SELECT
      i."id",
      i."sessionId",
      gs."title" AS "sessionTitle",
      gs."boardType"::text AS "boardType",
      i."seatId",
      ss."wind"::text AS "wind",
      u."name" AS "inviterName",
      p."nickname" AS "inviterNickname",
      i."createdAt"
    FROM "SessionSeatInvite" i
    INNER JOIN "GameSession" gs ON gs."id" = i."sessionId"
    INNER JOIN "SessionSeat" ss ON ss."id" = i."seatId"
    INNER JOIN "User" u ON u."id" = i."inviterUserId"
    LEFT JOIN "Player" p ON p."id" = u."playerId"
    WHERE i."inviteeUserId" = ${userId}
      AND i."status" = 'PENDING'
      AND gs."status" = 'LIVE'
    ORDER BY i."createdAt" DESC
  `

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    sessionTitle: row.sessionTitle,
    boardType: row.boardType,
    seatId: row.seatId,
    wind: row.wind.toLowerCase() as PendingSeatInvite["wind"],
    inviterName:
      row.inviterNickname?.trim() ||
      row.inviterName.split(" ")[0] ||
      row.inviterName,
    createdAt: new Date(row.createdAt).toISOString(),
  }))
}

export async function getPendingSessionInviteSummary(sessionId: string): Promise<{
  pendingCount: number
  pendingNames: string[]
}> {
  await ensureSeatInviteTable()

  const rows = await prisma.$queryRaw<
    Array<{
      inviteeName: string
      inviteeNickname: string | null
    }>
  >`
    SELECT
      u."name" AS "inviteeName",
      p."nickname" AS "inviteeNickname"
    FROM "SessionSeatInvite" i
    INNER JOIN "User" u ON u."id" = i."inviteeUserId"
    LEFT JOIN "Player" p ON p."id" = u."playerId"
    WHERE i."sessionId" = ${sessionId}
      AND i."status" = 'PENDING'
    ORDER BY i."createdAt" ASC
  `

  return {
    pendingCount: rows.length,
    pendingNames: rows.map(
      (r) =>
        r.inviteeNickname?.trim() ||
        r.inviteeName.split(" ")[0] ||
        r.inviteeName,
    ),
  }
}

export class InviteActionError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function respondToSeatInvite(input: {
  inviteId: string
  userId: string
  action: "accept" | "decline"
}): Promise<{ ok: true; sessionId: string }> {
  await ensureSeatInviteTable()

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string
        sessionId: string
        seatId: string
        inviteeUserId: string
        status: string
        sessionStatus: string
      }>
    >`
      SELECT
        i."id",
        i."sessionId",
        i."seatId",
        i."inviteeUserId",
        i."status",
        gs."status"::text AS "sessionStatus",
        gs."meetId" AS "meetId"
      FROM "SessionSeatInvite" i
      INNER JOIN "GameSession" gs ON gs."id" = i."sessionId"
      WHERE i."id" = ${input.inviteId}
      FOR UPDATE OF i
    `

    const invite = rows[0] as
      | {
          id: string
          sessionId: string
          seatId: string
          inviteeUserId: string
          status: string
          sessionStatus: string
          meetId: string | null
        }
      | undefined
    if (!invite) {
      throw new InviteActionError("Invite not found", 404)
    }
    if (invite.inviteeUserId !== input.userId) {
      throw new InviteActionError("Forbidden", 403)
    }
    if (invite.status !== "PENDING") {
      throw new InviteActionError("Invite already handled", 400)
    }
    if (invite.sessionStatus !== "LIVE") {
      throw new InviteActionError("This table session has already ended", 400)
    }

    if (input.action === "accept") {
      await tx.$executeRaw`
        UPDATE "SessionSeat"
        SET "userId" = ${input.userId}, "guestName" = NULL
        WHERE "id" = ${invite.seatId}
      `
      await tx.$executeRaw`
        UPDATE "SessionSeatInvite"
        SET "status" = 'ACCEPTED', "updatedAt" = NOW()
        WHERE "id" = ${invite.id}
      `

      if (invite.meetId) {
        const meet = await tx.meet.findUnique({
          where: { id: invite.meetId },
          select: { id: true, maxSeats: true, status: true },
        })
        if (meet) {
          const existingBooking = await tx.booking.findUnique({
            where: {
              meetId_userId: { meetId: meet.id, userId: input.userId },
            },
          })
          if (!existingBooking || existingBooking.status !== "CONFIRMED") {
            const { makeCheckInCode, nextAvailableSeatNumber } = await import(
              "@/lib/schedule/meet-service"
            )
            const seatNum =
              existingBooking?.seatNumber ??
              (await nextAvailableSeatNumber(meet.id, meet.maxSeats, tx).catch(
                () => 1,
              ))
            const checkIn =
              existingBooking?.checkInCode ?? makeCheckInCode(meet.id)

            if (existingBooking) {
              await tx.booking.update({
                where: { id: existingBooking.id },
                data: {
                  status: "CONFIRMED",
                  seatNumber: seatNum,
                  checkInCode: checkIn,
                },
              })
            } else {
              await tx.booking.create({
                data: {
                  meetId: meet.id,
                  userId: input.userId,
                  status: "CONFIRMED",
                  seatNumber: seatNum,
                  checkInCode: checkIn,
                },
              })
            }
          }

          const { syncMeetStatus } = await import("@/lib/schedule/meet-service")
          const confirmedCount = await tx.booking.count({
            where: { meetId: meet.id, status: "CONFIRMED" },
          })
          const sessionSeatCount = await tx.sessionSeat.count({
            where: { sessionId: invite.sessionId },
          })
          await tx.meet.update({
            where: { id: meet.id },
            data: {
              status: syncMeetStatus(
                Math.max(confirmedCount, sessionSeatCount),
                meet.maxSeats,
                meet.status,
              ),
            },
          })
        }
      }
    } else {
      await tx.$executeRaw`
        UPDATE "SessionSeatInvite"
        SET "status" = 'DECLINED', "updatedAt" = NOW()
        WHERE "id" = ${invite.id}
      `
      await tx.$executeRaw`
        UPDATE "SessionSeat"
        SET "guestName" = 'Guest'
        WHERE "id" = ${invite.seatId} AND "userId" IS NULL
      `
    }

    return { ok: true as const, sessionId: invite.sessionId }
  })
}
