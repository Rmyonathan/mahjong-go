import type { Metadata } from "next"
import Link from "next/link"

import { CombosFilter } from "@/components/jade/combos-filter"
import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import {
  HONOR_OF_THE_DAY_ID,
  NUMBER_OF_THE_DAY_IDS,
} from "@/lib/mock/jade-combos"
import { TILE_BY_ID } from "@/lib/mahjong/tiles"

export const metadata: Metadata = {
  title: "Combos — Jade Mahjong",
  description:
    "Jade Mahjong scoring patterns, daily bonus tiles, and house combo catalog.",
}

export default function CombosPage() {
  const honor = TILE_BY_ID[HONOR_OF_THE_DAY_ID]
  const numbers = NUMBER_OF_THE_DAY_IDS.map((id) => TILE_BY_ID[id]).filter(Boolean)

  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 top-0 select-none font-serif text-[12rem] leading-none text-jade-ink/[0.07] sm:text-[16rem]"
      >
        番
      </span>

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Vol. 01 · Scoring book
          </p>
          <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl">
            The Combos
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed">
            Scoring patterns used at Jade Mahjong tables — house stamps mixed
            with MCR-flavoured fan. Points here feed the weekly ledger, not the
            Scan calculator alone.
          </p>
          <Link
            href="/hk"
            className="mt-4 inline-flex items-center font-mono text-[11px] uppercase tracking-[0.16em] text-jade-accent underline-offset-4 hover:underline"
          >
            Combo exclusions rules →
          </Link>
        </div>
      </div>
      <div className="jade-divider mt-6" />

      <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="Daily bonus">
        <article className="jade-card-accent flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-jade-accent">
              Daily stamp
            </p>
            <h2 className="mt-2 font-serif text-3xl uppercase leading-none">
              Honor of the day
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed">
              {honor
                ? `${honor.label}. Pung or seat wind of this honor carries the
                  house bonus tonight.`
                : "Honor tile bonus for tonight’s tables."}
            </p>
          </div>
          {honor ? (
            <MahjongTile tile={honor} size="lg" className="rounded-none shadow-[3px_3px_0_0_var(--jade-ink)] ring-0" />
          ) : null}
        </article>

        <article className="jade-card-gold flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-jade-gold">
              Daily stamp
            </p>
            <h2 className="mt-2 font-serif text-3xl uppercase leading-none">
              Number of the day
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed">
              Fours across all three suits. Collect a pung of any 4 for the
              number bonus.
            </p>
          </div>
          <div className="flex items-end gap-2">
            {numbers.map((tile) => (
              <MahjongTile
                key={tile.id}
                tile={tile}
                size="md"
                className="rounded-none shadow-[3px_3px_0_0_var(--jade-ink)] ring-0"
              />
            ))}
          </div>
        </article>
      </section>

      <section className="mt-12" aria-label="Scoring patterns">
        <div className="mb-6">
          <h2 className="font-serif text-3xl uppercase">Scoring patterns</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Filter by point value. Thumbnails are example shapes, not full hands.
          </p>
        </div>
        <CombosFilter />
      </section>
    </main>
  )
}
