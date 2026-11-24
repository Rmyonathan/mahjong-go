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
        className="tap-press inline-flex h-9 items-center gap-2 rounded-full border border-[#102A20]/15 bg-white px-3.5 font-mono text-[10px] uppercase tracking-[0.14em]"
      >
        <Link2 className="size-3.5" />
        Copy
      </button>
      <button
        type="button"
        onClick={share}
        className="tap-press inline-flex h-9 items-center gap-2 rounded-full bg-jade-accent px-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white"
      >
        <Share2 className="size-3.5" />
        Share
      </button>
    </div>
  )
}
