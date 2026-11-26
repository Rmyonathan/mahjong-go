import { randomUUID } from "crypto"

import { prisma } from "@/lib/db"
import { skillBandFromRating } from "@/lib/mock/jade-levels"

// Platinum tier starts at 1700 ELO
export const MENTOR_MIN_RATING = 1700

export type MentorStatusSnapshot = {
  eligible: boolean
  isCertifiedMentor: boolean
  skillRating: number
  tierName: string
  application: {
    id: string
    bio: string
    status: "PENDING" | "APPROVED" | "REJECTED"
    createdAt: string
  } | null
}

let ensurePromise: Promise<void> | null = null

export function ensureMentorApplicationTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MentorApplication" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "bio" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "reviewedById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MentorApplication_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "MentorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `)
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "MentorApplication_userId_key"
        ON "MentorApplication"("userId");
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MentorApplication_status_createdAt_idx"
        ON "MentorApplication"("status", "createdAt");
      `)
    })().catch((err) => {
      ensurePromise = null
      throw err
    })
  }
  return ensurePromise
}

export async function getMentorStatusForUser(
  userId: string,
): Promise<MentorStatusSnapshot> {
  await ensureMentorApplicationTable()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      player: { select: { skillRating: true } },
    },
  })

  const skillRating = user?.player?.skillRating ?? 1400
  const tierName = skillBandFromRating(skillRating).tier.name
  const eligible =
    user?.role === "ADMIN" || skillRating >= MENTOR_MIN_RATING

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      bio: string
      status: string
      createdAt: Date
    }>
  >`
    SELECT "id", "bio", "status", "createdAt"
    FROM "MentorApplication"
    WHERE "userId" = ${userId}
    LIMIT 1
  `
  const app = rows[0] ?? null
  const isCertifiedMentor =
    user?.role === "ADMIN" || app?.status === "APPROVED"

  return {
    eligible,
    isCertifiedMentor,
    skillRating,
    tierName,
    application: app
      ? {
          id: app.id,
          bio: app.bio,
          status:
            app.status === "APPROVED"
              ? "APPROVED"
              : app.status === "REJECTED"
                ? "REJECTED"
                : "PENDING",
          createdAt: new Date(app.createdAt).toISOString(),
        }
      : null,
  }
}

export async function applyForMentor(input: { userId: string; bio: string }) {
  const status = await getMentorStatusForUser(input.userId)
  if (!status.eligible) {
    throw new Error(
      `Reach Platinum (${MENTOR_MIN_RATING}+ ELO) to apply as a Certified Table Mentor`,
    )
  }

  const bio = input.bio.trim()
  if (bio.length < 10) {
    throw new Error("Please write a short coaching bio (at least 10 characters)")
  }

  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "MentorApplication" (
      "id",
      "userId",
      "bio",
      "status",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${input.userId},
      ${bio},
      'PENDING',
      NOW(),
      NOW()
    )
    ON CONFLICT ("userId") DO UPDATE
    SET
      "bio" = EXCLUDED."bio",
      "status" = CASE
        WHEN "MentorApplication"."status" = 'APPROVED' THEN 'APPROVED'
        ELSE 'PENDING'
      END,
      "updatedAt" = NOW()
  `
}

export type AdminMentorApplicationRow = {
  id: string
  userId: string
  name: string
  nickname: string
  skillRating: number
  tierName: string
  bio: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
}

export async function listMentorApplications(): Promise<
  AdminMentorApplicationRow[]
> {
  await ensureMentorApplicationTable()

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      userId: string
      userName: string
      nickname: string | null
      skillRating: number | null
      bio: string
      status: string
      createdAt: Date
    }>
  >`
    SELECT
      m."id",
      m."userId",
      u."name" AS "userName",
      p."nickname",
      p."skillRating",
      m."bio",
      m."status",
      m."createdAt"
    FROM "MentorApplication" m
    INNER JOIN "User" u ON u."id" = m."userId"
    LEFT JOIN "Player" p ON p."id" = u."playerId"
    ORDER BY
      CASE WHEN m."status" = 'PENDING' THEN 0 ELSE 1 END,
      m."createdAt" DESC
  `

  return rows.map((r) => {
    const rating = Number(r.skillRating ?? 1400)
    return {
      id: r.id,
      userId: r.userId,
      name: r.userName,
      nickname: r.nickname ?? r.userName.split(" ")[0] ?? r.userName,
      skillRating: rating,
      tierName: skillBandFromRating(rating).tier.name,
      bio: r.bio,
      status:
        r.status === "APPROVED"
          ? "APPROVED"
          : r.status === "REJECTED"
            ? "REJECTED"
            : "PENDING",
      createdAt: new Date(r.createdAt).toISOString(),
    }
  })
}

export async function reviewMentorApplication(input: {
  id: string
  action: "approve" | "reject"
  reviewedById: string
}) {
  await ensureMentorApplicationTable()
  const nextStatus = input.action === "approve" ? "APPROVED" : "REJECTED"

  const rows = await prisma.$queryRaw<Array<{ userId: string }>>`
    UPDATE "MentorApplication"
    SET
      "status" = ${nextStatus},
      "reviewedById" = ${input.reviewedById},
      "updatedAt" = NOW()
    WHERE "id" = ${input.id}
    RETURNING "userId"
  `
  return rows[0]?.userId ?? null
}
