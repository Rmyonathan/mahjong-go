"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const MIN_SPLASH_MS = 380
const MAX_SPLASH_MS = 1800

/**
 * Branded boot/refresh splash for mobile & standalone PWA.
 * Renders immediately from SSR HTML so hard refreshes feel intentional
 * instead of flashing unhydrated nav or layout shifts.
 */
export function PwaBootSplash() {
  const [leaving, setLeaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const start = performance.now()
    let cancelled = false
    let fadeTimer: ReturnType<typeof setTimeout> | undefined
    let unmountTimer: ReturnType<typeof setTimeout> | undefined

    const finish = () => {
      if (cancelled) return
      const elapsed = performance.now() - start
      const wait = Math.max(0, MIN_SPLASH_MS - elapsed)

      fadeTimer = setTimeout(() => {
        if (cancelled) return
        setLeaving(true)
        unmountTimer = setTimeout(() => {
          if (!cancelled) setDone(true)
        }, 300)
      }, wait)
    }

    const fontsReady =
      typeof document !== "undefined" && document.fonts?.ready
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve()

    const hardCap = setTimeout(finish, MAX_SPLASH_MS)

    void fontsReady.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(finish)
      })
    })

    return () => {
      cancelled = true
      clearTimeout(hardCap)
      if (fadeTimer) clearTimeout(fadeTimer)
      if (unmountTimer) clearTimeout(unmountTimer)
    }
  }, [])

  if (done) return null

  return (
    <div
      aria-hidden={leaving}
      className={cn(
        "pwa-boot-splash fixed inset-0 z-[100] flex-col items-center justify-center bg-background px-6 text-jade-ink transition-all duration-300 ease-out",
        leaving ? "pointer-events-none scale-[1.02] opacity-0" : "opacity-100",
      )}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgb(22 121 76 / 0.14), transparent 55%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        <div className="relative grid size-24 place-items-center">
          <span
            aria-hidden
            className="jade-boot-ring absolute inset-0 rounded-[1.75rem] border border-jade-accent/40"
          />
          <div className="jade-boot-tile relative grid size-20 place-items-center overflow-hidden rounded-[1.5rem] border border-[#102A20]/12 bg-card shadow-[0_18px_40px_-14px_rgba(16,42,32,0.28)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/jade.png"
              alt="Jade Mahjong"
              width={64}
              height={64}
              className="size-14 rounded-xl object-cover"
            />
          </div>
        </div>

        <p className="mt-5 font-serif text-2xl font-semibold tracking-tight text-jade-ink">
          Jade Mahjong
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.26em] text-muted-foreground">
          Bandar Lampung
        </p>

        <div
          className="mt-6 flex items-center gap-2"
          aria-label="Loading"
          role="status"
        >
          <span
            className="jade-boot-pip size-2 rounded-full bg-jade-accent"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="jade-boot-pip size-2 rounded-full bg-jade-accent"
            style={{ animationDelay: "160ms" }}
          />
          <span
            className="jade-boot-pip size-2 rounded-full bg-jade-accent"
            style={{ animationDelay: "320ms" }}
          />
        </div>
      </div>
    </div>
  )
}
