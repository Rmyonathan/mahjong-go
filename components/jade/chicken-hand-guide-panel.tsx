import Link from "next/link"

import { TileStrip } from "@/components/jade/tile-strip"
import { formatJadeMiles, HKOS_PAYOUT_ROWS } from "@/lib/mahjong/hkos-catalog"
import { RULESET_OPTIONS } from "@/lib/mahjong/rulesets"

const CHICKEN_RULES = [
  {
    title: "Bentuk menang",
    body: "Sama seperti meja lain: 14 tile = 4 set (Chi / Pung / Kong) + 1 pair. Bunga tetap dibuka seperti biasa.",
  },
  {
    title: "0 Faan boleh Hu",
    body: "Tidak wajib punya pola bonus. Tangan “polos” yang sah = Chicken Hand — tetap menang dan dapat skor.",
  },
  {
    title: "Skor dasar",
    body: "0 Faan → base 1.000 Jade Miles (B). Pembayaran buangan / zimo mengikuti tabel yang sama, hanya Faan-nya nol.",
  },
  {
    title: "Faan di Chicken",
    body: "Bunga/Musim, Double Chi (+1), dan Kong bonus (+1) tetap dihitung. Pola HK besar (Flush, Toitoi, Limit, …) tidak — bisa menang 0 Faan.",
  },
] as const

const CHICKEN_VS_JADE = [
  { label: "Minimum Faan untuk Hu", chicken: "0", jade: "1" },
  { label: "Chicken Hand (tangan polos)", chicken: "Sah", jade: "Tidak sah" },
  { label: "Tabel Jade Miles", chicken: "Sama", jade: "Sama" },
  { label: "Cocok untuk", chicken: "Pemula · meja santai", jade: "Sesi rumah Jade" },
] as const

export function ChickenHandGuidePanel() {
  const chicken = RULESET_OPTIONS.find((r) => r.id === "chicken")!
  const row0 = HKOS_PAYOUT_ROWS.find((row) => row.fan === 0)

  return (
    <div className="flex flex-col gap-10">
      <div className="jade-card-accent p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-jade-accent">
          Hitungan opsional
        </p>
        <h2 className="mt-2 font-serif text-3xl uppercase">{chicken.label}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">{chicken.summaryId}</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {CHICKEN_RULES.map((item) => (
          <li key={item.title} className="jade-card p-4">
            <h3 className="font-serif text-xl">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed">{item.body}</p>
          </li>
        ))}
      </ul>

      <section aria-label="Contoh skor">
        <h2 className="font-serif text-3xl uppercase">Contoh pembayaran</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          0 Faan · chicken hand
        </p>
        {row0 ? (
          <article className="jade-card mt-4 p-5">
            <p className="text-sm leading-relaxed">
              Base B ={" "}
              <span className="font-mono">{formatJadeMiles(row0.basePoints)}</span>
              {" · "}
              Menang buangan{" "}
              <span className="font-mono text-jade-gold">
                +{formatJadeMiles(row0.winnerDiscard)}
              </span>
              {" · "}
              Zimo{" "}
              <span className="font-mono">+{formatJadeMiles(row0.winnerSelfDraw)}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Angka persis mengikuti mesin kalkulator dengan preset Chicken dipilih.
            </p>
          </article>
        ) : null}
      </section>

      <section aria-label="Bukan Ping Hu">
        <h2 className="font-serif text-3xl uppercase">Chicken vs Ping Hu</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">
          <strong className="font-normal">Chicken Hand</strong> = menang tanpa Faan apa pun
          (boleh campur Chi dan Pung).{" "}
          <strong className="font-normal">All Chi (Ping Hu)</strong> adalah pola khusus
          (hanya urutan + pair) yang di Jade HK memberi +1 Faan — bukan sinonim Chicken.
        </p>
      </section>

      <section aria-label="Bonus yang sama">
        <h2 className="font-serif text-3xl uppercase">Bonus rumah (jika ada Faan)</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Berlaku saat pola terdeteksi
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li className="jade-card p-4">
            <h3 className="font-serif text-xl">Double Chi</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              +1 Faan
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Dua set Chi identik, misalnya dua kali 1-2-3 Bulatan.
            </p>
            <div className="mt-3">
              <TileStrip
                ids={["dots-1", "dots-2", "dots-3", "dots-1", "dots-2", "dots-3"]}
              />
            </div>
          </li>
          <li className="jade-card p-4">
            <h3 className="font-serif text-xl">Kong bonus</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              +1 Faan per Kong
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Empat tile sama di tangan; di buku combo, Pung ditampilkan dengan 3 tile,
              Kong contoh dengan 4.
            </p>
            <div className="mt-3">
              <TileStrip ids={["dots-5", "dots-5", "dots-5", "dots-5"]} />
            </div>
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Lihat thumbnail pola di tab{" "}
          <Link
            href="/combos?view=combos"
            className="text-jade-accent underline-offset-2 hover:underline"
          >
            Combos
          </Link>
          .
        </p>
      </section>

      <section className="jade-card overflow-x-auto p-0" aria-label="Perbandingan">
        <div className="border-b border-jade-ink/30 px-4 py-3">
          <h2 className="font-serif text-2xl uppercase">Chicken vs Jade HK</h2>
        </div>
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <thead className="bg-parchment font-mono text-[10px] uppercase tracking-[0.14em]">
            <tr className="border-b border-jade-ink/40">
              <th className="px-4 py-2">Aturan</th>
              <th className="px-4 py-2">Chicken</th>
              <th className="px-4 py-2">Jade HK</th>
            </tr>
          </thead>
          <tbody>
            {CHICKEN_VS_JADE.map((row) => (
              <tr key={row.label} className="border-b border-jade-ink/20 last:border-0">
                <td className="px-4 py-2">{row.label}</td>
                <td className="px-4 py-2 font-mono text-xs">{row.chicken}</td>
                <td className="px-4 py-2 font-mono text-xs">{row.jade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-sm text-muted-foreground">
        Pemula bisa mulai dari{" "}
        <Link
          href="/learn/how-to-play"
          className="text-jade-accent underline-offset-2 hover:underline"
        >
          How to Play
        </Link>
        ; aturan meja lengkap di tab{" "}
        <Link
          href="/combos?view=hk"
          className="text-jade-accent underline-offset-2 hover:underline"
        >
          Panduan HK
        </Link>
        .
      </p>
    </div>
  )
}