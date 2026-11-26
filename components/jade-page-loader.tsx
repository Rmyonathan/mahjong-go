import { cn } from "@/lib/utils"

/**
 * Branded page/route loading state matching Jade Mahjong's warm parchment & emerald seal aesthetic.
 * Safe in both Server Components (`loading.tsx`) and Client Components.
 */
export function JadePageLoader({
  kanji = "玉",
  label = "Loading…",
  showCards = false,
  className,
}: {
  kanji?: string
  label?: string
  showCards?: boolean
  className?: string
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-14 sm:px-6",
        className,
      )}
    >
      <div className="flex flex-col items-center">
        <div className="relative grid size-16 place-items-center">
          <span
            aria-hidden
            className="jade-boot-ring absolute inset-0 rounded-[1.25rem] border border-jade-accent/35"
          />
          <div className="jade-boot-tile relative grid size-14 place-items-center rounded-2xl border border-[#102A20]/12 bg-card shadow-[0_12px_28px_-10px_rgba(16,42,32,0.22)]">
            <span className="font-serif text-2xl font-semibold text-jade-accent">
              {kanji}
            </span>
          </div>
        </div>

        <div
          className="mt-4 flex items-center gap-1.5"
          aria-label={label}
          role="status"
        >
          <span
            className="jade-boot-pip size-1.5 rounded-full bg-jade-accent"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="jade-boot-pip size-1.5 rounded-full bg-jade-accent"
            style={{ animationDelay: "160ms" }}
          />
          <span
            className="jade-boot-pip size-1.5 rounded-full bg-jade-accent"
            style={{ animationDelay: "320ms" }}
          />
        </div>

        <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
      </div>

      {showCards ? (
        <div
          aria-hidden
          className="mt-10 grid w-full max-w-5xl gap-4 lg:grid-cols-2"
        >
          {[0, 1].map((idx) => (
            <div
              key={idx}
              className="jade-card overflow-hidden p-5"
            >
              <div className="flex gap-2">
                <div className="jade-skeleton h-5 w-28 rounded-full" />
                <div className="jade-skeleton h-5 w-20 rounded-full" />
              </div>
              <div className="jade-skeleton mt-4 h-7 w-3/5 rounded-lg" />
              <div className="jade-skeleton mt-2.5 h-4 w-2/5 rounded-md" />
              <div className="jade-skeleton mt-5 h-3 w-full rounded-sm" />
              <div className="mt-5 flex gap-2">
                <div className="jade-skeleton h-6 w-20 rounded-md" />
                <div className="jade-skeleton h-6 w-20 rounded-md" />
              </div>
              <div className="jade-skeleton mt-6 h-11 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : null}
    </main>
  )
}
