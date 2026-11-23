"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function PlayerProfileEditor({
  playerId,
  initialName,
  initialNickname,
}: {
  playerId: string
  initialName: string
  initialNickname: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [nickname, setNickname] = useState(initialNickname)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/players/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nickname }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not save profile")
        return
      }
      setOpen(false)
      router.refresh()
      // Ensure URL stays on same player id after rename
      router.push(`/players/${playerId}`)
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex h-10 items-center border-[2px] border-jade-ink bg-card px-3 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-muted"
      >
        Edit name
      </button>
    )
  }

  return (
    <form
      onSubmit={onSave}
      className="mt-4 space-y-3 border-[2px] border-jade-ink bg-parchment p-3"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Your profile
      </p>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
          Display name
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-3 outline-none"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
          Nickname
        </span>
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-card px-3 outline-none"
        />
      </label>
      {error ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setName(initialName)
            setNickname(initialNickname)
            setError(null)
          }}
          className="h-10 flex-1 border-[2px] border-jade-ink bg-card font-mono text-[10px] uppercase tracking-[0.14em]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="scan-cta-accent h-10 flex-1 font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
