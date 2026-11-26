"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

type NavStatus = "idle" | "loading" | "finishing"

const SAFETY_RESET_MS = 8000
const FINISH_FADE_MS = 220

function NavTransitionBarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()
  const [status, setStatus] = useState<NavStatus>("idle")
  const statusRef = useRef<NavStatus>("idle")
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  statusRef.current = status

  useEffect(() => {
    const clearTimers = () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current)
        safetyTimerRef.current = null
      }
      if (finishTimerRef.current) {
        clearTimeout(finishTimerRef.current)
        finishTimerRef.current = null
      }
    }

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target as Element | null
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return

      const rawHref = anchor.getAttribute("href")
      if (!rawHref || rawHref.startsWith("#")) return

      let dest: URL
      try {
        dest = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      if (dest.origin !== window.location.origin) return

      const nextRoute = `${dest.pathname}${dest.search}`
      const currentRoute = `${window.location.pathname}${window.location.search}`
      if (nextRoute === currentRoute) return

      clearTimers()
      setStatus("loading")
      safetyTimerRef.current = setTimeout(() => {
        setStatus("idle")
      }, SAFETY_RESET_MS)
    }

    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      clearTimers()
    }
  }, [])

  useEffect(() => {
    if (statusRef.current !== "loading") return

    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = null
    }
    setStatus("finishing")
    finishTimerRef.current = setTimeout(() => {
      setStatus("idle")
    }, FINISH_FADE_MS)
  }, [pathname, searchKey])

  if (status === "idle") return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[95] h-[3px] overflow-hidden"
    >
      <div
        className={cn(
          "h-full bg-jade-accent shadow-[0_0_10px_rgba(22,121,76,0.55)] transition-all duration-200 ease-out",
          status === "loading" && "jade-nav-progress-bar",
          status === "finishing" && "w-full opacity-0",
        )}
      />
    </div>
  )
}

export function NavTransitionBar() {
  return (
    <Suspense fallback={null}>
      <NavTransitionBarInner />
    </Suspense>
  )
}
