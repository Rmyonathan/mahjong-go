import type { SkillTierBand } from "@/lib/mock/jade-levels"
import { SKILL_SUBRANKS } from "@/lib/mock/jade-levels"
import { cn } from "@/lib/utils"

function Glyph({
  kind,
  filled,
}: {
  kind: SkillTierBand["icon"]
  filled: boolean
}) {
  const stroke = "currentColor"
  const fill = filled ? "currentColor" : "none"

  switch (kind) {
    case "diamond":
      return (
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" fill={fill} stroke={stroke} strokeWidth="1.4" />
        </svg>
      )
    case "chevron":
      return (
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <path
            d="M3 10.5 8 5.5l5 5"
            fill="none"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="square"
          />
          {filled ? (
            <path
              d="M3 13 8 8l5 5"
              fill="none"
              stroke={stroke}
              strokeWidth="1.6"
              strokeLinecap="square"
            />
          ) : null}
        </svg>
      )
    case "bar":
      return (
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <rect x="3" y="10" width="3" height="4" fill={stroke} />
          <rect x="6.5" y={filled ? 6 : 8} width="3" height={filled ? 8 : 6} fill={stroke} />
          <rect x="10" y={filled ? 3 : 7} width="3" height={filled ? 11 : 7} fill={stroke} />
        </svg>
      )
    case "star":
      return (
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <path
            d="M8 1.8 9.7 6h4.5L10.9 8.8l1.5 4.4L8 10.9 3.6 13.2 5.1 8.8 1.8 6H6.3Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.1"
          />
        </svg>
      )
    case "square":
      return (
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <rect x="3" y="3" width="10" height="10" fill={fill} stroke={stroke} strokeWidth="1.4" />
        </svg>
      )
    case "ring":
      return (
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <circle cx="8" cy="8" r="5" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </svg>
      )
    case "leaf":
      return (
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <path
            d="M8 2c4 2 6 5.5 6 8.5S11 14 8 14 2 13.5 2 10.5 4 4 8 2Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.3"
          />
          <path d="M8 5v8" stroke={stroke} strokeWidth="1.2" />
        </svg>
      )
  }
}

export function SkillSubrankIcons({
  icon,
  className,
}: {
  icon: SkillTierBand["icon"]
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {SKILL_SUBRANKS.map((label, index) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          <span className="text-jade-ink">
            <Glyph kind={icon} filled={index === 0} />
          </span>
          {label}
        </span>
      ))}
    </div>
  )
}
