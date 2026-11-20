import { cn } from "@/lib/utils"

const MARKS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "玉"] as const

export function LevelBadgeIcon({
  index,
  className,
}: {
  index: number
  className?: string
}) {
  const mark = MARKS[index] ?? "玉"
  const accent =
    index >= 8 ? "var(--jade-gold)" : index >= 5 ? "var(--jade-accent)" : "var(--jade-ink)"

  return (
    <svg
      viewBox="0 0 64 80"
      className={cn("h-14 w-11", className)}
      aria-hidden
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="72"
        rx="6"
        fill="var(--bg-card)"
        stroke="var(--jade-ink)"
        strokeWidth="3"
      />
      <rect
        x="10"
        y="10"
        width="44"
        height="60"
        rx="3"
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
      />
      <circle cx="32" cy="28" r="10" fill="none" stroke={accent} strokeWidth="2" />
      <text
        x="32"
        y="33"
        textAnchor="middle"
        fontSize="12"
        fontFamily="var(--font-serif), serif"
        fill={accent}
      >
        {mark}
      </text>
      <path
        d="M18 48h28M22 54h20M26 60h12"
        stroke="var(--jade-ink)"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  )
}
