import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const COOKIE = "jade_session"

/**
 * EDIT HERE — pages guests may browse without signing in.
 * Login still required for booking seats, live tables, /me, /admin, etc.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/leaderboard",
  "/schedule",
  "/combos",
  "/levels",
  "/calculator",
  "/scan", // calculator workspace ( /calculator redirects here )
  "/about",
  "/coaching",
  "/puzzle",
  "/hk",
  "/learn",
]

/** Public APIs guests need for browse pages (mutations still auth-check in-route). */
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
  "/api/auth/logout",
  "/api/schedule",
  "/api/puzzle/today",
  "/api/scan", // Gemini tile detect for /scan calculator (guests OK)
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

  if (!session && !isPublicPath(pathname)) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  // Never run auth on Next internals or static image/asset files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|tiles/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif|woff2?)$).*)",
  ],
}
