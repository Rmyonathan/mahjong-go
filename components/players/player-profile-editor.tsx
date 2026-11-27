"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { Lock, Upload } from "lucide-react"

import { PlayerAvatar } from "@/components/players/player-avatar"
import {
  AVATAR_FRAMES,
  PRESET_AVATARS,
  isFrameUnlocked,
} from "@/lib/players/avatar-frames"
import { cn } from "@/lib/utils"

async function compressSquareAvatar(file: File): Promise<string> {
  const bitmap =
    typeof createImageBitmap === "function"
      ? await createImageBitmap(file)
      : await new Promise<HTMLImageElement>((resolve, reject) => {
          const url = URL.createObjectURL(file)
          const img = new Image()
          img.onload = () => {
            URL.revokeObjectURL(url)
            resolve(img)
          }
          img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error("Could not read image"))
          }
          img.src = url
        })

  const srcW =
    "naturalWidth" in bitmap && bitmap.naturalWidth
      ? bitmap.naturalWidth
      : bitmap.width
  const srcH =
    "naturalHeight" in bitmap && bitmap.naturalHeight
      ? bitmap.naturalHeight
      : bitmap.height
  const side = Math.min(srcW, srcH)
  const sx = Math.floor((srcW - side) / 2)
  const sy = Math.floor((srcH - side) / 2)

  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not available")
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 256, 256)
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close()

  return canvas.toDataURL("image/jpeg", 0.82)
}

export function PlayerProfileEditor({
  playerId,
  initialName,
  initialNickname,
  initials,
  initialAvatarUrl,
  initialFrameId,
  level,
  isPro,
}: {
  playerId: string
  initialName: string
  initialNickname: string
  initials: string
  initialAvatarUrl?: string | null
  initialFrameId?: string | null
  level: number
  isPro: boolean
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [nickname, setNickname] = useState(initialNickname)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialAvatarUrl ?? null,
  )
  const [frameId, setFrameId] = useState<string>(initialFrameId || "classic")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setError(null)
    try {
      const dataUrl = await compressSquareAvatar(file)
      setAvatarUrl(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load image")
    }
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/players/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nickname, avatarUrl, frameId }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not save profile")
        return
      }
      setOpen(false)
      router.refresh()
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
        Edit profile · Avatar &amp; Bingkai
      </button>
    )
  }

  return (
    <form
      onSubmit={onSave}
      className="mt-4 space-y-4 border-[2px] border-jade-ink bg-parchment p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Customize Profile
          </p>
          <p className="text-xs text-muted-foreground">
            Pick a Mahjong icon or upload a photo, then choose your bingkai.
          </p>
        </div>
        <PlayerAvatar
          initials={initials}
          name={name}
          avatarUrl={avatarUrl}
          frameId={frameId}
          size="lg"
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
            Profile Picture
          </span>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 border border-jade-ink bg-card px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-muted"
            >
              <Upload className="size-3" />
              Upload photo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          <button
            type="button"
            onClick={() => setAvatarUrl(null)}
            className={cn(
              "grid h-11 place-items-center border-[2px] bg-jade-gold font-mono text-xs font-semibold text-jade-ink transition",
              avatarUrl == null
                ? "border-jade-accent ring-2 ring-jade-accent/40"
                : "border-jade-ink/40 opacity-80 hover:opacity-100",
            )}
            title="Initials"
          >
            {initials}
          </button>
          {PRESET_AVATARS.map((preset) => {
            const val = `preset:${preset.id}`
            const selected = avatarUrl === val
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAvatarUrl(val)}
                title={preset.label}
                className={cn(
                  "grid h-11 place-items-center border-[2px] font-serif text-lg font-bold transition",
                  preset.bgClass,
                  preset.textClass,
                  selected
                    ? "border-jade-accent ring-2 ring-jade-accent/50"
                    : "border-jade-ink/40 opacity-85 hover:opacity-100",
                )}
              >
                {preset.glyph}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em]">
          Bingkai (Frame) · LV {level}
          {isPro ? " · PRO" : ""}
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {AVATAR_FRAMES.map((frame) => {
            const unlocked = isFrameUnlocked(frame, { level, isPro })
            const selected = frameId === frame.id
            return (
              <button
                key={frame.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  if (unlocked) setFrameId(frame.id)
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 border-[2px] bg-card p-2 text-center transition",
                  selected
                    ? "border-jade-accent bg-jade-soft/50"
                    : "border-jade-ink/25",
                  unlocked
                    ? "hover:border-jade-ink"
                    : "cursor-not-allowed opacity-50",
                )}
              >
                <PlayerAvatar
                  initials={initials}
                  avatarUrl={avatarUrl}
                  frameId={frame.id}
                  size="sm"
                />
                <span className="line-clamp-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]">
                  {frame.name}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.12em]",
                    unlocked ? "text-jade-accent" : "text-muted-foreground",
                  )}
                >
                  {!unlocked ? <Lock className="size-2.5" /> : null}
                  {frame.unlockLabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

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
            setAvatarUrl(initialAvatarUrl ?? null)
            setFrameId(initialFrameId || "classic")
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
