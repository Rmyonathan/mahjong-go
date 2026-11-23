"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

function HideOnTv({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  if (searchParams.get("tv") === "1") return null
  return <>{children}</>
}

/** Hides header/footer chrome for Live TV cast (`?tv=1`). */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <HideOnTv>{children}</HideOnTv>
    </Suspense>
  )
}
