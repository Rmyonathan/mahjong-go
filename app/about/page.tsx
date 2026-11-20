import type { Metadata } from "next"
import Link from "next/link"

const WHATSAPP_JOIN_URL = "https://wa.me/6281234567890"

const GALLERY = [
  { id: "teluk", label: "Teluk Betung · Friday open", tone: "accent" },
  { id: "metro", label: "Metro morning table", tone: "ink" },
  { id: "score", label: "Score sheet after lights", tone: "gold" },
  { id: "tiles", label: "Wall before the deal", tone: "ink" },
] as const

export const metadata: Metadata = {
  title: "About — Jade Mahjong",
  description:
    "Jade Mahjong is a Mahjong social community in Bandar Lampung — weekly tables, house scoring, beginners welcome.",
}

export default function AboutPage() {
  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-8 select-none font-serif text-[10rem] leading-none text-jade-ink/[0.07] sm:right-10 sm:text-[14rem]"
      >
        玉
      </span>

      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          About
        </p>
        <h1 className="mt-3 max-w-4xl font-serif text-5xl uppercase leading-[0.88] tracking-tight sm:text-7xl lg:text-8xl">
          Pull up a chair
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
          Jade Mahjong is a Mahjong social community in Bandar Lampung — part
          kedai, part scorebook, part weekly ritual around the same four winds.
        </p>
      </div>

      <div className="jade-divider mt-8" />

      <div className="mt-8 max-w-3xl space-y-6 text-base leading-relaxed">
        <p>
          We keep a house ledger for friends who play across Teluk Betung, Metro,
          Pringsewu, and Kalianda. Every scored hand lands in the book before the
          lights go out — who won, how, and which stamp the table claimed.
        </p>
        <p>
          Weekly scorekeeping is the spine of the house. Experience climbs with
          tables played. Skill rating shifts after each session. The leaderboard
          is not a tournament bracket; it is the kedai wall, updated every time
          the tiles are put away.
        </p>
        <p>
          Beginners sit next to veterans. If you still mix up the dragons, someone
          will point at the wall and deal again. If you already chase Jade Immortal,
          there is still a chair — and a WhatsApp thread for the next open table.
        </p>
      </div>

      <section className="relative mt-14" aria-label="Inside the house">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl uppercase">Inside the house</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gallery placeholder — frames ready for real table photos.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GALLERY.map((frame) => (
            <figure
              key={frame.id}
              className="border-[2px] border-jade-ink bg-card shadow-[4px_4px_0_0_var(--jade-ink)]"
            >
              <div
                className={
                  frame.tone === "accent"
                    ? "aspect-[4/5] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--jade-accent)_18%,var(--bg-card)),var(--bg-card))]"
                    : frame.tone === "gold"
                      ? "aspect-[4/5] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--jade-gold)_22%,var(--bg-card)),var(--bg-card))]"
                      : "aspect-[4/5] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--jade-ink)_10%,var(--bg-card)),var(--bg-card))]"
                }
              >
                <div className="flex h-full items-center justify-center">
                  <span className="font-serif text-5xl text-jade-ink/20">玉</span>
                </div>
              </div>
              <figcaption className="border-t-[2px] border-jade-ink px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                {frame.label}
              </figcaption>
            </figure>
          ))}
        </div>

        <Link
          href={WHATSAPP_JOIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="scan-cta-accent fixed bottom-5 right-5 z-30 inline-flex h-12 items-center rounded-none px-4 font-mono text-[11px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_var(--jade-ink)] sm:bottom-8 sm:right-8"
        >
          Join WhatsApp
        </Link>
      </section>
    </main>
  )
}
