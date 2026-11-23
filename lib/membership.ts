import type { MembershipTier, UserRole } from "@prisma/client"

import { prisma } from "@/lib/db"

/** Free users only see this many finished sessions in the archive. */
export const FREE_SESSION_ARCHIVE_LIMIT = 3

/** Default Pro early-bird window when hosts create a meet (hours from now). */
export const DEFAULT_PRO_EARLY_BIRD_HOURS = 2

/** Manual grant length from Admin → Set PRO. */
export const PRO_GRANT_DAYS = 30

export type MembershipSnapshot = {
  membershipTier: MembershipTier
  /** Effective access after expiry check (admins always PRO). */
  isPro: boolean
  proExpiresAt: string | null
}

export function isProMembership(user: {
  role?: UserRole | string | null
  membershipTier?: MembershipTier | string | null
  proExpiresAt?: Date | string | null
}): boolean {
  if (user.role === "ADMIN") return true
  if (user.membershipTier !== "PRO") return false
  if (!user.proExpiresAt) return true
  const expires =
    user.proExpiresAt instanceof Date
      ? user.proExpiresAt
      : new Date(user.proExpiresAt)
  return expires.getTime() > Date.now()
}

export function toMembershipSnapshot(user: {
  role?: UserRole | string | null
  membershipTier: MembershipTier
  proExpiresAt?: Date | null
}): MembershipSnapshot {
  const active = isProMembership(user)
  return {
    membershipTier: active ? "PRO" : "FREE",
    isPro: active,
    proExpiresAt: user.proExpiresAt?.toISOString() ?? null,
  }
}

/** Lazy-expire PRO rows whose clock has run out. */
export async function syncExpiredPro(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      membershipTier: true,
      proExpiresAt: true,
    },
  })
  if (!user) return null
  if (
    user.membershipTier === "PRO" &&
    user.role !== "ADMIN" &&
    user.proExpiresAt &&
    user.proExpiresAt.getTime() <= Date.now()
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: { membershipTier: "FREE", proExpiresAt: null },
      select: {
        id: true,
        role: true,
        membershipTier: true,
        proExpiresAt: true,
      },
    })
  }
  return user
}

export function proGrantExpiry(from = new Date(), days = PRO_GRANT_DAYS) {
  const expiry = new Date(from)
  expiry.setDate(expiry.getDate() + days)
  return expiry
}
