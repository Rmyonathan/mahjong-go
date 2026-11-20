"use client"

import { Link2, Share2 } from "lucide-react"

export function SessionActions({ title }: { title: string }) {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // ignore
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href })
        return
      }
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex h-9 items-center gap-2 border-[2px] border-jade-ink bg-card px-3 font-mono text-[10px] uppercase tracking-[0.14em]"
      >
        <Link2 className="size-3.5" />
        Copy link
      </button>
      <button
        type="button"
        onClick={share}
        className="inline-flex h-9 items-center gap-2 border-[2px] border-jade-ink bg-jade-ink px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-parchment"
      >
        <Share2 className="size-3.5" />
        Share
      </button>
    </div>
  )
}
