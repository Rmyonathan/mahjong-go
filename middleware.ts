import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const COOKIE = "jade_session"

/** EDIT HERE — routes guests may open without signing in */
const PUBLIC_PREFIXES = ["/login", "/leaderboard"]

/** Auth endpoints guests need to sign in / check session */
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
  "/api/auth/logout",
]

function isPublicPath(pathname: string) {
  if (pathname === "/") return true
  if (
    PUBLIC_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/tiles") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/jade.png" ||
    pathname === "/QRIS.jpeg" ||
    pathname === "/qris-static.svg" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

async function readSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET ?? "jade-mahjong-dev-secret-change-me",
    )
    const { payload } = await jwtVerify(token, secret)
    return {
      id: typeof payload.sub === "string" ? payload.sub : null,
      role: payload.role === "ADMIN" ? ("ADMIN" as const) : ("MEMBER" as const),
    }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (isStaticAsset(pathname)) return NextResponse.next()

  const session = await readSession(request)

  // Admin desk — Jade admin only
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const login = new URL("/login", request.url)
      login.searchParams.set("next", `${pathname}${search}`)
      return NextResponse.redirect(login)
    }
    if (session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/leaderboard", request.url))
    }
    return NextResponse.next()
  }

  // Guests: leaderboard + login only
  if (!session && !isPublicPath(pathname)) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
