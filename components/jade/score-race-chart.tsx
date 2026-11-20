import { getPlayer } from "@/lib/mock/jade-data"
import { formatSignedPoints } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

const COLORS = [
  "var(--jade-gold)",
  "var(--jade-accent)",
  "var(--jade-ink)",
  "var(--jade-red)",
]

export function ScoreRaceChart({
  playerIds,
  race,
}: {
  playerIds: string[]
  race: Record<string, number[]>
}) {
  const width = 720
  const height = 280
  const pad = { top: 16, right: 16, bottom: 28, left: 48 }
  const series = playerIds.map((id) => race[id] ?? [0])
  const handCount = Math.max(...series.map((s) => s.length - 1), 1)
  const allValues = series.flat()
  const minY = Math.min(0, ...allValues)
  const maxY = Math.max(0, ...allValues)
  const spanY = maxY - minY || 1

  const x = (i: number) =>
    pad.left + (i / handCount) * (width - pad.left - pad.right)
  const y = (v: number) =>
    pad.top + (1 - (v - minY) / spanY) * (height - pad.top - pad.bottom)

  const zeroY = y(0)

  return (
    <div className="jade-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b-[2px] border-jade-ink px-4 py-3">
        <h2 className="font-serif text-2xl">Score race</h2>
        <div className="ml-auto flex flex-wrap gap-3">
          {playerIds.map((id, index) => {
            const player = getPlayer(id)
            const end = series[index][series[index].length - 1] ?? 0
            return (
              <div
                key={id}
                className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]"
              >
                <span
                  className="size-2.5 border border-jade-ink"
                  style={{ background: COLORS[index % COLORS.length] }}
                />
                <span>{player.nickname}</span>
                <span
                  className={cn(
                    end > 0 && "text-jade-accent",
                    end < 0 && "text-jade-red",
                  )}
                >
                  {formatSignedPoints(end)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="overflow-x-auto p-3 sm:p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[28rem]"
          role="img"
          aria-label="Running point totals after each hand"
        >
          <line
            x1={pad.left}
            y1={zeroY}
            x2={width - pad.right}
            y2={zeroY}
            stroke="var(--jade-ink)"
            strokeOpacity="0.25"
            strokeDasharray="4 4"
          />
          {Array.from({ length: handCount + 1 }, (_, i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-current"
              style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            >
              {String(i).padStart(2, "0")}
            </text>
          ))}
          <text
            x={8}
            y={y(maxY) + 4}
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            className="fill-current"
          >
            {formatSignedPoints(maxY)}
          </text>
          <text
            x={8}
            y={y(minY) + 4}
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            className="fill-current"
          >
            {formatSignedPoints(minY)}
          </text>
          {series.map((values, seriesIndex) => {
            const d = values
              .map((value, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(value)}`)
              .join(" ")
            const color = COLORS[seriesIndex % COLORS.length]
            return (
              <g key={playerIds[seriesIndex]}>
                <path d={d} fill="none" stroke={color} strokeWidth="2.5" />
                {values.map((value, i) => (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(value)}
                    r="3.5"
                    fill="var(--bg-card)"
                    stroke={color}
                    strokeWidth="2"
                  />
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
