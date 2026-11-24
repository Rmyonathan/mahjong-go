"use client"

import { useEffect, useRef, useState } from "react"
import { KeyRound, X } from "lucide-react"

import { extractInviteCode } from "@/lib/schedule/types"

export function InviteCodeModal({
  open,
  onClose,
  initialCode = "",
  onUnlock,
}: {
  open: boolean
  onClose: () => void
  initialCode?: string
  onUnlock: (code: string) => void
}) {
  const [draft, setDraft] = useState(initialCode)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setDraft(initialCode)
    setError(null)
    const id = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(id)
  }, [open, initialCode])

  if (!open) return null

  function submit() {
    const code = extractInviteCode(draft)
    if (!code) {
      setError("Use a code like JADE-798RQK7")
      return
    }
    onUnlock(code)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close invite code"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4">
        <div className="flex items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
          <h2 className="flex items-center gap-2 font-serif text-xl">
            <KeyRound className="size-4 text-jade-accent" />
            Invite code
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-3 p-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <p className="text-sm text-muted-foreground">
            Paste the code only — e.g.{" "}
            <span className="font-mono text-jade-ink">JADE-798RQK7</span>
          </p>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (error) setError(null)
            }}
            onBlur={() => {
              const code = extractInviteCode(draft)
              if (code) setDraft(code)
            }}
            placeholder="JADE-XXXX"
            className="h-12 w-full border-[2px] border-jade-ink bg-white px-3 font-mono text-sm uppercase tracking-[0.1em] outline-none ring-jade-accent/30 focus:ring-2"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
          {error ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="tap-press inline-flex h-11 w-full items-center justify-center bg-jade-accent font-mono text-[11px] uppercase tracking-[0.16em] text-white"
          >
            Unlock private table
          </button>
        </form>
      </div>
    </div>
  )
}
