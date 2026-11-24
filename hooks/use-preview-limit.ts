"use client"

import { useEffect, useState } from "react"

/** Mobile preview count / desktop preview count before “See all”. */
export const PREVIEW_LIMIT_MOBILE = 3
export const PREVIEW_LIMIT_DESKTOP = 5

/**
 * Preview window for list cards: 3 on mobile, 5 on md+.
 * Full archive lives on a separate page via See all.
 */
export function usePreviewLimit(total: number, options?: { forceShowAll?: boolean }) {
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  const preview = desktop ? PREVIEW_LIMIT_DESKTOP : PREVIEW_LIMIT_MOBILE
  const showAll = Boolean(options?.forceShowAll)
  const limit = showAll ? total : Math.min(preview, total)
  const hasMore = total > preview

  return {
    limit,
    preview,
    hasMore,
  }
}
