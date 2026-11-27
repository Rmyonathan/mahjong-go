import {
  getAvatarFrame,
  getPresetAvatar,
} from "@/lib/players/avatar-frames"
import { cn } from "@/lib/utils"

export type PlayerAvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

const SIZE_CLASSES: Record<
  PlayerAvatarSize,
  { box: string; text: string; glyph: string; badge: string }
> = {
  xs: {
    box: "size-8",
    text: "text-[10px]",
    glyph: "text-sm",
    badge: "hidden",
  },
  sm: {
    box: "size-10",
    text: "text-xs",
    glyph: "text-base",
    badge: "-bottom-1 -right-1 px-1 text-[7px]",
  },
  md: {
    box: "size-12",
    text: "text-sm",
    glyph: "text-xl",
    badge: "-bottom-1 -right-1 px-1 text-[8px]",
  },
  lg: {
    box: "size-16",
    text: "text-lg",
    glyph: "text-2xl",
    badge: "-bottom-1.5 -right-1.5 px-1.5 py-0.5 text-[9px]",
  },
  xl: {
    box: "size-20",
    text: "text-xl",
    glyph: "text-3xl",
    badge: "-bottom-1.5 -right-1.5 px-1.5 py-0.5 text-[9px]",
  },
}

export function PlayerAvatar({
  initials,
  name,
  avatarUrl,
  frameId,
  size = "md",
  rounded = "square",
  showBadge = true,
  className,
}: {
  initials: string
  name?: string
  avatarUrl?: string | null
  frameId?: string | null
  size?: PlayerAvatarSize
  rounded?: "square" | "full"
  showBadge?: boolean
  className?: string
}) {
  const frame = getAvatarFrame(frameId)
  const preset = getPresetAvatar(avatarUrl)
  const isImage = Boolean(avatarUrl && avatarUrl.startsWith("data:image/"))
  const dims = SIZE_CLASSES[size]
  const radiusClass = rounded === "full" ? "rounded-full" : "rounded-none"

  return (
    <div
      className={cn(
        "relative inline-grid shrink-0 place-items-center select-none",
        dims.box,
        radiusClass,
        frame.frameClass,
        preset
          ? cn(preset.bgClass, preset.textClass)
          : isImage
            ? "bg-parchment"
            : "bg-jade-gold text-jade-ink",
        className,
      )}
      title={name}
    >
      <div
        className={cn(
          "grid h-full w-full place-items-center overflow-hidden",
          radiusClass,
        )}
      >
        {isImage && avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name ?? initials}
            className="h-full w-full object-cover"
          />
        ) : preset ? (
          <span className={cn("font-serif font-bold leading-none", dims.glyph)}>
            {preset.glyph}
          </span>
        ) : (
          <span className={cn("font-mono font-semibold leading-none", dims.text)}>
            {initials}
          </span>
        )}
      </div>

      {showBadge && frame.badge ? (
        <span
          className={cn(
            "pointer-events-none absolute z-10 border border-jade-ink font-mono font-bold uppercase leading-none",
            dims.badge,
            frame.badgeClass ?? "bg-jade-ink text-white",
          )}
        >
          {frame.badge}
        </span>
      ) : null}
    </div>
  )
}
