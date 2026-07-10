import type { Metadata } from "next"

import { CalculatorWorkspace } from "@/components/mahjong/calculator-workspace"

export const metadata: Metadata = {
  title: "Kalkulator — Mahjong-Go",
  description:
    "Susun tangan Mahjong Anda dengan drag-and-drop dan hitung poinnya.",
}

export default function CalculatorPage() {
  // [BARU] Halaman penuh — meja digital tanpa wrapper sempit.
  return <CalculatorWorkspace />
}
