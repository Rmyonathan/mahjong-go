import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "HK — Panduan Jade Mahjong",
  description:
    "Panduan pemula Jade Mahjong HK: Bunga & Angin, bagi tile, klaim, Faan, dan Jade Miles.",
}

export default function HkPage() {
  redirect("/combos?view=hk")
}