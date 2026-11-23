import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import type { UserRole } from "@prisma/client"

import { prisma } from "@/lib/db"

const COOKIE = "jade_session"
const secret = () =>
  new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "jade-mahjong-dev-secret-change-me",
  )

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  playerId: string | null
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    playerId: user.playerId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret())
}

export async function setSessionCookie(token: string) {
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  })
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    const id = payload.sub
    if (!id || typeof payload.email !== "string") return null
    return {
      id,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      role: (payload.role as UserRole) ?? "MEMBER",
      playerId:
        typeof payload.playerId === "string" || payload.playerId === null
          ? (payload.playerId as string | null)
          : null,
    }
  } catch {
    return null
  }
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) throw new Error("UNAUTHORIZED")
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN")
  return user
}

export async function loginWithCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return null
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) return null
  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    playerId: user.playerId,
  }
  const token = await createSessionToken(sessionUser)
  await setSessionCookie(token)
  return sessionUser
}

function normalizeEmailOrUsername(value: string) {
  const raw = value.trim().toLowerCase()
  if (!raw) return ""
  if (raw.includes("@")) return raw
  const handle = raw.replace(/[^a-z0-9._-]/g, "")
  return handle ? `${handle}@jade.local` : ""
}

function slugFromName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || "player"
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "JM"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}

/** Self-serve signup: FREE member + Player at 1400 skill / Level 1 (Pemula). */
export async function registerMember(input: {
  name: string
  emailOrUsername: string
  password: string
}) {
  const name = input.name.trim()
  const email = normalizeEmailOrUsername(input.emailOrUsername)
  const password = input.password
  if (!name || !email || password.length < 6) {
    throw new Error("Name, email/username, and password (6+ chars) required")
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error("Email or username already registered")

  const nickname = name.split(/\s+/)[0] ?? name
  const baseSlug = slugFromName(name)
  let playerId = `${baseSlug}-${Date.now().toString(36)}`
  // Extremely unlikely collision; keep ids readable for profile URLs
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await prisma.player.findUnique({ where: { id: playerId } })
    if (!taken) break
    playerId = `${baseSlug}-${Date.now().toString(36)}${attempt}`
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.$transaction(async (tx) => {
    await tx.player.create({
      data: {
        id: playerId,
        name,
        nickname,
        initials: initialsFromName(name),
        city: "Bandar Lampung",
        district: "Walk-in",
        house: "Jade Mahjong",
        // Level 1 — Pemula
        experienceLevelId: "pemula",
        memberSince: new Date(),
        experienceXp: 0,
        // EDIT HERE — starting skill rating for new members
        skillRating: 1400,
      },
    })

    return tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "MEMBER",
        membershipTier: "FREE",
        playerId,
      },
    })
  })

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    playerId: user.playerId,
  }
  const token = await createSessionToken(sessionUser)
  await setSessionCookie(token)
  return sessionUser
}
