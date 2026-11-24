import type { Metadata } from "next"
import { Suspense } from "react"

import { CalculatorWorkspace } from "@/components/mahjong/calculator-workspace"

export const metadata: Metadata = {
  title: "Scan — Jade Mahjong",
  description:
    "Foto tangan Mahjong (Gemini detect) lalu hitung Fan lewat mesin HKOS deterministik.",
}

/**
 * `/scan` calculator — photo capture lives in CalculatorWorkspace (Scan foto).
 * AI only returns tile IDs; scoring always uses `lib/mahjong/engine.ts`.
 */
export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Loading calculator…
          </p>
        </main>
      }
    >
      <CalculatorWorkspace />
    </Suspense>
  )
}
