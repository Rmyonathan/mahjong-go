"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { ChickenHandGuidePanel } from "@/components/jade/chicken-hand-guide-panel"
import { CombosFilter } from "@/components/jade/combos-filter"
import { HkGuidePanel } from "@/components/jade/hk-guide-panel"
import { cn } from "@/lib/utils"

export type CombosBookView = "combos" | "hk" | "chicken"

const VIEWS: { id: CombosBookView; label: string; stamp: string }[] = [
  { id: "combos", label: "Combos", stamp: "番" },
  { id: "hk", label: "Panduan HK", stamp: "港" },
  { id: "chicken", label: "Chicken Hand", stamp: "鸡" },
]

const VIEW_BLURB: Record<CombosBookView, string> = {
  combos:
    "Pola Faan resmi Jade Mahjong HK Old Style — thumbnail tile, filter menurut Faan. Nilai = Faan; bayar pakai Jade Miles.",
  hk:
    "Aturan meja: Bunga & Angin, bagi tile, prioritas klaim, dan tabel Faan → Jade Miles (min. 1 Faan untuk Hu).",
  chicken:
    "Hitungan Chicken: menang 0 Faan tetap sah. Panduan singkat, skor dasar, dan beda dengan Jade HK.",
}

function parseView(raw: string | null): CombosBookView {
  if (raw === "hk" || raw === "chicken" || raw === "combos") return raw
  return "combos"
}

export function CombosBook({ initialView }: { initialView?: CombosBookView }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [view, setView] = useState<CombosBookView>(
    initialView ?? parseView(searchParams.get("view")),
  )

  useEffect(() => {
    setView(parseView(searchParams.get("view")))
  }, [searchParams])

  const selectView = useCallback(
    (next: CombosBookView) => {
      setView(next)
      const params = new URLSearchParams(searchParams.toString())
      if (next === "combos") params.delete("view")
      else params.set("view", next)
      const qs = params.toString()
      router.replace(qs ? `/combos?${qs}` : "/combos", { scroll: false })
    },
    [router, searchParams],
  )

  const activeStamp = VIEWS.find((v) => v.id === view)?.stamp ?? "番"

  return (
  <>
    <div className="relative flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Vol. 01 · Scoring book
        </p>
        <h1 className="mt-3 font-serif text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl">
          {view === "combos" ? "The Combos" : view === "hk" ? "Panduan HK" : "Chicken Hand"}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed">{VIEW_BLURB[view]}</p>

        <div
          className="mt-5 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Buku skor"
        >
          {VIEWS.map((tab) => {
            const active = view === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectView(tab.id)}
                className={cn(
                  "border-[2px] border-jade-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                  active
                    ? "bg-jade-ink text-parchment shadow-[3px_3px_0_0_var(--jade-gold)]"
                    : "bg-card hover:bg-muted",
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
      <span
        aria-hidden
        className="stamp-mark hidden font-serif text-4xl sm:inline"
      >
        {activeStamp}
      </span>
    </div>
    <div className="jade-divider mt-6" />

    {view === "combos" ? (
      <>
        <section className="mt-8" aria-label="Scoring patterns">
          <div className="mb-6">
            <h2 className="font-serif text-3xl uppercase">Scoring patterns</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Filter menurut Faan. Thumbnail hanya contoh bentuk, bukan tangan penuh.
            </p>
          </div>
          <CombosFilter />
        </section>
      </>
    ) : null}

    {view === "hk" ? (
      <section className="mt-10" aria-label="Panduan HK">
        <HkGuidePanel embedded />
      </section>
    ) : null}

    {view === "chicken" ? (
      <section className="mt-10" aria-label="Chicken Hand">
        <ChickenHandGuidePanel />
      </section>
    ) : null}
  </>
  )
}