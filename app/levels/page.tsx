import type { Metadata } from "next"

import { LevelBadgeIcon } from "@/components/jade/level-badge"
import { SkillSubrankIcons } from "@/components/jade/skill-rank-icons"
import {
  EXPERIENCE_BANDS,
  SKILL_RATING_TIERS,
  SKILL_START_RATING,
} from "@/lib/mock/jade-levels"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Levels & Skill — Jade Mahjong",
  description:
    "Experience levels and Elo-style skill rating for the Jade Mahjong house in Bandar Lampung.",
}

export default function LevelsPage() {
  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 top-2 select-none font-serif text-[11rem] leading-none text-jade-ink/[0.06] sm:text-[14rem]"
      >
        级
      </span>

      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Rank Tiers · Levels & skill
        </p>
        <h1 className="mt-3 max-w-3xl font-serif text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl">
          Rank tiers & skill
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed">
          Two stamps on every player card.{" "}
          <strong className="font-medium">Experience Level</strong> climbs from
          lifetime XP (sessions + weekly bounties) —{" "}
          <span className="font-mono">25 XP</span> per LV, up to LV 100.{" "}
          <strong className="font-medium">Skill Rating</strong> is Elo and moves
          up or down after every scored session. New seats start at{" "}
          <span className="font-mono">{SKILL_START_RATING}</span>.
        </p>
        <div className="jade-divider mt-6" />
      </div>

      <section className="relative mt-10" aria-label="Experience levels">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl uppercase">Experience levels</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Ten house bands from Pemula to Jade Immortal. Lifetime only — never
              demoted.
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            LV 1–100
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {EXPERIENCE_BANDS.map((band, index) => (
            <li key={band.id} className="jade-card flex flex-col items-center p-4 text-center">
              <LevelBadgeIcon index={index} />
              <h3 className="mt-3 font-serif text-xl leading-none">{band.title}</h3>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-jade-accent">
                {band.levelRange}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {band.summary}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative mt-12" aria-label="Skill rating">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl uppercase">Skill rating</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Elo-style house rating. Wins push you up a band; cold weeks slide
              you down. Each tier carries ranks I, II, and III.
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Start · {SKILL_START_RATING}
          </p>
        </div>

        <div className="jade-card overflow-hidden">
          <div className="border-b-[2px] border-jade-ink bg-jade-ink px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-parchment">
            Tier ladder · high to low
          </div>
          <ol>
            {SKILL_RATING_TIERS.map((tier, index) => (
              <li
                key={tier.id}
                className={cn(
                  "grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,11rem)_minmax(0,8rem)_minmax(0,1fr)] sm:items-center",
                  index < SKILL_RATING_TIERS.length - 1 &&
                    "border-b border-jade-ink/25",
                )}
              >
                <div>
                  <p className="font-serif text-2xl leading-none uppercase">
                    {tier.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{tier.summary}</p>
                </div>
                <p className="font-mono text-sm tracking-wide">{tier.rangeLabel}</p>
                <SkillSubrankIcons icon={tier.icon} />
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}
