import type { Metadata } from "next"

import { HKOS_PAYOUT_ROWS, HKOS_SECTIONS } from "@/lib/mahjong/hkos-catalog"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "HK — Jade Mahjong",
  description:
    "Daftar pola Fan Hong Kong Old Style yang dipakai mesin skor Jade Mahjong.",
}

export default function HkPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Vol. 01 · Aturan meja
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[0.9] sm:text-7xl">
            HK
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed">
            Hong Kong Old Style — pola Fan yang sama dengan Scan. Bukan tebak-tebakan:
            angka di bawah mengikuti mesin skor rumah.
          </p>
        </div>
        <div className="stamp-mark" aria-hidden>
          港
        </div>
      </div>
      <div className="jade-divider mt-6" />

      <section className="jade-card mt-8 overflow-x-auto p-0" aria-label="Tabel bayaran">
        <div className="border-b-[1.5px] border-jade-ink px-4 py-3">
          <h2 className="font-serif text-2xl">Bayaran</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Per lawan · Ron / Tsumo
          </p>
        </div>
        <table className="w-full min-w-[28rem] border-collapse text-left">
          <thead className="bg-parchment font-mono text-[10px] uppercase tracking-[0.16em]">
            <tr className="border-b border-jade-ink/40">
              <th className="px-4 py-2">Fan</th>
              <th className="px-4 py-2 text-right">Ron</th>
              <th className="px-4 py-2 text-right">Tsumo</th>
              <th className="px-4 py-2">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {HKOS_PAYOUT_ROWS.map((row) => (
              <tr
                key={row.fan}
                className="border-b border-jade-ink/25 last:border-b-0"
              >
                <td className="px-4 py-2 font-mono text-sm">{row.fan}</td>
                <td className="px-4 py-2 text-right font-mono text-sm">{row.ron}</td>
                <td className="px-4 py-2 text-right font-mono text-sm">{row.tsumo}</td>
                <td className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-jade-gold">
                  {"note" in row ? row.note : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-10 flex flex-col gap-10">
        {HKOS_SECTIONS.map((section) => (
          <section key={section.id} aria-label={section.title}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-serif text-3xl">{section.title}</h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  {section.blurb}
                </p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {String(section.patterns.length).padStart(2, "0")} pola
              </p>
            </div>
            <div className="jade-rule mt-3" />
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {section.patterns.map((pattern) => (
                <li key={pattern.key} className="jade-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl leading-tight">{pattern.name}</h3>
                    <span
                      className={cn(
                        "shrink-0 border-[1.5px] border-jade-ink px-2 py-1 font-mono text-xs",
                        pattern.fan >= 10
                          ? "bg-jade-ink text-parchment"
                          : "bg-card text-jade-ink",
                      )}
                    >
                      {pattern.fan} FAN
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{pattern.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
