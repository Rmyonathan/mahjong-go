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
