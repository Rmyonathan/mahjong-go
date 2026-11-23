"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

export function SearchPlayerModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) return
    setQuery("")
    const id = window.setTimeout(() => inputRef.current?.focus(), 40)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!open) return null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const q = query.trim()
    onClose()
    router.push(q ? `/leaderboard?q=${encodeURIComponent(q)}` : "/leaderboard")
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] sm:pt-[18vh]">
      <button
        type="button"
        aria-label="Close search"
        className="sheet-backdrop absolute inset-0 bg-[#102A20]/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <form
        onSubmit={submit}
        className="sheet-panel relative z-10 w-full max-w-lg rounded-2xl border border-[#102A20]/10 bg-white p-4 shadow-[0_20px_50px_-12px_rgba(16,42,32,0.25)]"
      >
        <div className="flex items-center gap-2">
          <Search className="size-5 shrink-0 text-jade-accent" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="Search players…"
            autoComplete="off"
            className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={onClose}
            className="tap-press grid size-9 place-items-center rounded-full hover:bg-jade-soft"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Enter to open Leaderboard results
        </p>
      </form>
    </div>
  )
}
