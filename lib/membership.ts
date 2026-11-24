import type { MembershipTier, UserRole } from "@prisma/client"

import { prisma } from "@/lib/db"

/**
 * Free users only see this many personal / club session history rows
 * on `/dashboard`, `/players/[id]`, and leaderboard archive.
 */
// EDIT HERE — Free tier session history window
export const FREE_SESSION_HISTORY_LIMIT = 3
/** @deprecated Prefer FREE_SESSION_HISTORY_LIMIT */
export const FREE_SESSION_ARCHIVE_LIMIT = FREE_SESSION_HISTORY_LIMIT

/** Free-hosted player tables get this many camera scans. Club / Pro = unlimited. */
// EDIT HERE — Free host scan quota per table
export const FREE_HOST_SCAN_LIMIT = 3

/** Admin “+ Scans” grant amount on hosted Free tables. */
// EDIT HERE
export const ADMIN_BONUS_SCAN_GRANT = 50

/**
 * LIVE table auto-end windows.
 * Club-made (ADMIN host/captain) → unlimited (`null`).
 */
// EDIT HERE — Free player live table length (hours)
export const LIVE_SESSION_HOURS_FREE = 2
// EDIT HERE — Pro host live table length (hours)
export const LIVE_SESSION_HOURS_PRO = 24
/** Club / ADMIN tables never auto-end. */
export const LIVE_SESSION_HOURS_CLUB: null = null

export type LiveSessionDurationTier = "club" | "pro" | "free"

/** Resolve Free / Pro / Club duration for a LIVE table. */
export function resolveLiveSessionDuration(options: {
  captain?: {
    role?: string | null
    membershipTier?: string | null
    proExpiresAt?: Date | string | null
  } | null
  meetHost?: {
    role?: string | null
    membershipTier?: string | null
    proExpiresAt?: Date | string | null
  } | null
}): { tier: LiveSessionDurationTier; maxMs: number | null; maxHours: number | null } {
  const captain = options.captain
  const host = options.meetHost

  // Club-made: ADMIN meet host or ADMIN captain (house table)
  if (host?.role === "ADMIN" || captain?.role === "ADMIN") {
    return { tier: "club", maxMs: null, maxHours: LIVE_SESSION_HOURS_CLUB }
  }

  const hostPro = host ? isProMembership(host) : false
  const captainPro = captain ? isProMembership(captain) : false
  if (hostPro || captainPro) {
    return {
      tier: "pro",
      maxMs: LIVE_SESSION_HOURS_PRO * 60 * 60 * 1000,
      maxHours: LIVE_SESSION_HOURS_PRO,
    }
  }

  return {
    tier: "free",
    maxMs: LIVE_SESSION_HOURS_FREE * 60 * 60 * 1000,
    maxHours: LIVE_SESSION_HOURS_FREE,
  }
}

/**
 * Scan quota for a meet based on who created it.
 * Club owner (ADMIN) → unlimited. Pro host → unlimited. Free host → 3.
 */
export function scanLimitForHost(host: {
  role?: string | null
  membershipTier?: string | null
  proExpiresAt?: Date | string | null
}): number | null {
  if (host.role === "ADMIN") return null
  if (isProMembership(host)) return null
  return FREE_HOST_SCAN_LIMIT
}

export function isClubHost(host: { role?: string | null } | null | undefined) {
  return host?.role === "ADMIN"
}

/** Dashboard / profile membership stamp from role + subscription. */
export function membershipLabelForUser(user: {
  role?: UserRole | string | null
  membershipTier?: MembershipTier | string | null
  proExpiresAt?: Date | string | null
}): "Club leader" | "Pro" | "Free" {
  if (user.role === "ADMIN") return "Club leader"
  if (isProMembership(user)) return "Pro"
  return "Free"
}

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
