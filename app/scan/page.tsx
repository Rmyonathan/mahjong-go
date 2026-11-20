import type { Metadata } from "next"

import { CalculatorWorkspace } from "@/components/mahjong/calculator-workspace"

export const metadata: Metadata = {
  title: "Scan — Jade Mahjong",
  description:
    "Pindai tangan Mahjong: susun ubin, lalu hitung Fan Hong Kong Old Style.",
}

export default function ScanPage() {
  return <CalculatorWorkspace />
}
