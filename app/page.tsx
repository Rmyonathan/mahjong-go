import Link from "next/link"
import { ArrowRight, BookOpen, Calculator, Layers, Sparkles } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MahjongTile } from "@/components/mahjong/mahjong-tile"
import { TILE_BY_ID, TOTAL_TILE_COUNT } from "@/lib/mahjong/tiles"
import { cn } from "@/lib/utils"

const HERO_TILES = [
  "dots-5",
  "bamboo-3",
  "characters-8",
  "wind-east",
  "dragon-red",
  "flower-plum",
]

const FEATURES = [
  {
    icon: Calculator,
    title: "Kalkulator Poin",
    description:
      "Susun tangan dengan drag-and-drop, lalu hitung poin secara deterministik.",
  },
  {
    icon: Layers,
    title: "144 Ubin Lengkap",
    description:
      "Bulatan, Bambu, Karakter, Angin, Naga, Bunga, dan Musim — semuanya siap pakai.",
  },
  {
    icon: BookOpen,
    title: "Multi-Varian",
    description:
      "Mendukung Hong Kong Old Style dan Hokkien, dengan logika aturan yang modular.",
  },
]

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-primary)/8%,transparent)] opacity-70"
        />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-28">
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="size-3" />
            Panduan &amp; Kalkulator Mahjong Interaktif
          </Badge>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Kuasai Mahjong bersama{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
              Mahjong-Go
            </span>
          </h1>
          <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            Belajar, berlatih, dan hitung poin tangan Mahjong Anda dengan
            antarmuka drag-and-drop yang bersih dan modern.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/calculator"
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              Buka Kalkulator
              <ArrowRight />
            </Link>
            <Link
              href="/calculator"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Pelajari Ubin
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {HERO_TILES.map((id) => {
              const tile = TILE_BY_ID[id]
              if (!tile) return null
              return <MahjongTile key={id} tile={tile} size="md" />
            })}
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Semua yang Anda butuhkan
          </h2>
          <p className="max-w-lg text-sm text-muted-foreground">
            Dari mengenal {TOTAL_TILE_COUNT} ubin hingga menghitung poin akhir,
            Mahjong-Go menemani setiap langkah permainan Anda.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <span className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </span>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-10 overflow-hidden">
          <CardContent className="flex flex-col items-center justify-between gap-4 py-8 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="text-xl font-semibold">Siap menghitung poin?</h3>
              <p className="text-sm text-muted-foreground">
                Mulai susun tangan Mahjong Anda sekarang juga.
              </p>
            </div>
            <Link
              href="/calculator"
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              Mulai Sekarang
              <ArrowRight />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
