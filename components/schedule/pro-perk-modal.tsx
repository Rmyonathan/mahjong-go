"use client"

import { X } from "lucide-react"

export function ProPerkModal({
  open,
  onClose,
  onSwitchPro,
}: {
  open: boolean
  onClose: () => void
  onSwitchPro: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close Pro preview"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4">
        <div className="flex items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
          <h2 className="font-serif text-2xl">Pro early-bird</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm leading-relaxed">
            Pro members lock competitive MCR seats before the general house list
            opens. Demo toggle switches you to Pro so you can book Session 3 now.
          </p>
          <ul className="jade-card space-y-2 p-3 font-mono text-[11px] uppercase tracking-[0.14em]">
            <li>★ Early seat on ranking tables</li>
            <li>★ Priority waitlist bumps</li>
            <li>★ Same lounge · same tiles</li>
          </ul>
          <button
            type="button"
            onClick={() => {
              onSwitchPro()
              onClose()
            }}
            className="scan-cta-accent inline-flex h-11 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            View as Pro member
          </button>
        </div>
      </div>
    </div>
  )
}
