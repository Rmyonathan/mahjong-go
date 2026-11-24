import type { Metadata } from "next"
import { Suspense } from "react"

import {
  CombosBook,
  type CombosBookView,
} from "@/components/jade/combos-book"

export const metadata: Metadata = {
  title: "Combos — Jade Mahjong",
  description:
    "Katalog Faan, panduan HK, dan aturan Chicken Hand — Jade Mahjong scoring book.",
}

type PageProps = {
  searchParams: Promise<{ view?: string }>
}

function parseView(raw: string | undefined): CombosBookView {
  if (raw === "hk" || raw === "chicken" || raw === "combos") return raw
  return "combos"
}

export default async function CombosPage({ searchParams }: PageProps) {
  const params = await searchParams
  const initialView = parseView(params.view)

  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 top-0 select-none font-serif text-[12rem] leading-none text-jade-ink/[0.07] sm:text-[16rem]"
      >
        番
      </span>

      <div className="relative">
        <Suspense
          fallback={
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Loading scoring book…
            </p>
          }
        >
          <CombosBook initialView={initialView} />
        </Suspense>
      </div>
    </main>
  )
}