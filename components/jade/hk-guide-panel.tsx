import Link from "next/link"

import {
  formatJadeMiles,
  HKOS_PAYOUT_ROWS,
} from "@/lib/mahjong/hkos-catalog"
import { cn } from "@/lib/utils"

const WIND_ROWS = [
  {
    num: 1,
    han: "東",
    wind: "Timur",
    windEn: "East — Dealer",
    flower: "1 春",
    season: "1 梅",
  },
  {
    num: 2,
    han: "南",
    wind: "Selatan",
    windEn: "South",
    flower: "2 夏",
    season: "2 蘭",
  },
  {
    num: 3,
    han: "西",
    wind: "Barat",
    windEn: "West",
    flower: "3 秋",
    season: "3 菊",
  },
  {
    num: 4,
    han: "北",
    wind: "Utara",
    windEn: "North",
    flower: "4 冬",
    season: "4 竹",
  },
] as const

const SEATING_STEPS = [
  "Empat pemain kocok 2 dadu — skor tertinggi jadi Timur (Dealer).",
  "Urutan duduk berlawanan arah jarum jam: Timur → Selatan → Barat → Utara.",
  "Timur di kanan layar; giliran main juga berputar arah tersebut.",
] as const

const DEALING_STEPS = [
  "Setiap pemain susun dinding (wall) — biasanya 18 stack per sisi.",
  "Timur lempar 3 dadu; hitung berlawanan arah jarum jam dari Dealer (1=Timur … 4=Utara, 5=Timur lagi).",
  "Pemain pada hitungan terakhir memisahkan dinding sejumlah total 3 dadu, dihitung dari kanan.",
  "Bagi tile: Timur → Selatan → Barat → Utara, 4 tile per putaran hingga 13, lalu Timur ambil ke-14.",
  "Pisahkan 7 stack dari ujung kanan sebagai Dinding Mati (kong box & pengganti Bunga).",
  "Dapat Bunga/Musim? Buka di depan dan ambil pengganti dari Dinding Mati.",
] as const

const CLAIM_ORDER = [
  { label: "Hu", sub: "Menang", note: "Prioritas tertinggi" },
  { label: "Pong / Kong", sub: "Kembar 3 atau 4", note: "Di atas Chi" },
  { label: "Chi", sub: "Urutan", note: "Hanya dari pemain kiri" },
] as const

type HkGuidePanelProps = {
  /** When true, combo list points to combos tab instead of duplicating patterns. */
  embedded?: boolean
}

export function HkGuidePanel({ embedded = false }: HkGuidePanelProps) {
  const exampleRow = HKOS_PAYOUT_ROWS.find((row) => row.fan === 3)

  return (
    <div className="flex flex-col gap-12">
      <section aria-label="Bunga dan Angin">
        <h2 className="font-serif text-3xl uppercase">1. Bunga &amp; Angin</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Flowers, seasons &amp; winds · mapping 1–4
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">
          Angka 1–4 menghubungkan Angin, Bunga, dan Musim.{" "}
          <strong className="font-normal text-jade-gold">Bunga Kursi</strong> /
          <strong className="font-normal text-jade-gold"> Bunga Meja</strong>{" "}
          memberi +1 Faan per tile yang cocok (lihat tab Combos).
        </p>
        <div className="jade-card mt-4 overflow-x-auto p-0">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead className="bg-parchment font-mono text-[10px] uppercase tracking-[0.14em]">
              <tr className="border-b border-jade-ink/40">
                <th className="px-4 py-2">No</th>
                <th className="px-4 py-2">Angin</th>
                <th className="px-4 py-2">Indonesia</th>
                <th className="px-4 py-2">Bunga</th>
                <th className="px-4 py-2">Musim</th>
              </tr>
            </thead>
            <tbody>
              {WIND_ROWS.map((row) => (
                <tr key={row.num} className="border-b border-jade-ink/20 last:border-0">
                  <td className="px-4 py-2 font-mono">{row.num}</td>
                  <td className="px-4 py-2 font-serif text-xl">{row.han}</td>
                  <td className="px-4 py-2">
                    {row.wind}
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {row.windEn}
                    </span>
                  </td>
                  <td className="px-4 py-2">{row.flower}</td>
                  <td className="px-4 py-2">{row.season}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          <li className="jade-card p-4 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Angin Kursi · Seat Wind
            </span>
            <p className="mt-1">Berubah mengikuti posisi Dealer di kursi.</p>
          </li>
          <li className="jade-card p-4 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Angin Meja · Round Wind
            </span>
            <p className="mt-1">Berubah setiap putaran penuh (mulai Timur).</p>
          </li>
        </ul>
      </section>

      <section aria-label="Penentuan Angin">
        <h2 className="font-serif text-3xl uppercase">2. Penentuan Angin</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Seat determination
        </p>
        <ol className="mt-4 flex flex-col gap-2">
          {SEATING_STEPS.map((step, i) => (
            <li key={step} className="jade-card flex gap-3 p-4 text-sm leading-relaxed">
              <span className="font-mono text-xs text-jade-gold">{String(i + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Bagi tile">
        <h2 className="font-serif text-3xl uppercase">3. Bagi Tile &amp; Dinding Mati</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Dealing · 3 dice · 7-stack dead wall
        </p>
        <ol className="mt-4 flex flex-col gap-2">
          {DEALING_STEPS.map((step, i) => (
            <li key={step} className="jade-card flex gap-3 p-4 text-sm leading-relaxed">
              <span className="font-mono text-xs text-jade-gold">{String(i + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Prioritas klaim">
        <h2 className="font-serif text-3xl uppercase">4. Prioritas Klaim</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Claim priority
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">
          Jika dua pemain mau <strong className="font-normal">Hu</strong> bersamaan,
          menang yang lebih dekat gilirannya setelah pembuang tile (berlawanan arah
          jarum jam).
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {CLAIM_ORDER.map((item, index) => (
            <li
              key={item.label}
              className={cn(
                "jade-card p-4",
                index === 0 && "jade-card-accent",
              )}
            >
              <p className="font-serif text-2xl">{item.label}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {item.sub}
              </p>
              <p className="mt-2 text-sm">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {embedded ? (
        <section className="jade-card p-5" aria-label="Daftar combo">
          <h2 className="font-serif text-2xl uppercase">5. Daftar Combo (Faan)</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Pola skor lengkap dengan thumbnail tile ada di tab{" "}
            <strong className="font-normal">Combos</strong> — mesin Scan memakai
            daftar yang sama.
          </p>
          <Link
            href="/combos?view=combos"
            className="mt-3 inline-flex font-mono text-[11px] uppercase tracking-[0.16em] text-jade-accent underline-offset-4 hover:underline"
          >
            Buka tab combos →
          </Link>
        </section>
      ) : null}

      <section aria-label="Faan ke Jade Miles">
        <h2 className="font-serif text-3xl uppercase">6. Faan → Jade Miles</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Social points per 1.000 · zero-sum payout
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">
          Total Faan dikonversi ke <strong className="font-normal">Base Points (B)</strong>.
          Faan di atas 10 tetap dihitung sebagai <strong className="font-normal">Limit 10 Faan</strong>.
          Mode <strong className="font-normal">Jade HK</strong> wajib min. 1 Faan untuk Hu.
        </p>

        <section className="jade-card mt-6 overflow-x-auto p-0" aria-label="Tabel Faan">
          <div className="border-b-[1.5px] border-jade-ink px-4 py-3">
            <h3 className="font-serif text-xl">Tabel konversi</h3>
          </div>
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead className="bg-parchment font-mono text-[10px] uppercase tracking-[0.16em]">
              <tr className="border-b border-jade-ink/40">
                <th className="px-4 py-2">Faan</th>
                <th className="px-4 py-2 text-right">Base B</th>
                <th className="px-4 py-2 text-right">Menang buangan</th>
                <th className="px-4 py-2 text-right">Menang zimo</th>
                <th className="px-4 py-2">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {HKOS_PAYOUT_ROWS.filter((row) => row.fan >= 1).map((row) => (
                <tr
                  key={row.fan}
                  className="border-b border-jade-ink/25 last:border-b-0"
                >
                  <td className="px-4 py-2 font-mono text-sm">{row.fan}</td>
                  <td className="px-4 py-2 text-right font-mono text-sm">
                    {formatJadeMiles(row.basePoints)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm text-jade-gold">
                    +{formatJadeMiles(row.winnerDiscard)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm">
                    +{formatJadeMiles(row.winnerSelfDraw)}
                  </td>
                  <td className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {"note" in row && row.note ? row.note : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {exampleRow ? (
          <article className="jade-card-gold mt-6 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-gold">
              Contoh · 3 Faan
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              <strong className="font-normal">3 Faan</strong> → B ={" "}
              <span className="font-mono">{formatJadeMiles(exampleRow.basePoints)}</span>
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed">
              <li>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Discard / Rong
                </span>
                — Penyuap bayar 2×B, dua lawan 1×B; pemenang{" "}
                <strong className="font-normal text-jade-gold">
                  +{formatJadeMiles(exampleRow.winnerDiscard)}
                </strong>
                .
              </li>
              <li>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Self-draw / Zimo
                </span>
                — Tiap lawan bayar 2×B; pemenang{" "}
                <strong className="font-normal">
                  +{formatJadeMiles(exampleRow.winnerSelfDraw)}
                </strong>
                .
              </li>
            </ul>
          </article>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="jade-card p-5">
            <h3 className="font-serif text-xl">Bonus rumah Jade HK</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed">
              <li>
                <strong className="font-normal">Double Chi</strong> — dua Chow
                identik (mis. dua 1-2-3 Bulatan) → +1 Faan per pasangan.
              </li>
              <li>
                <strong className="font-normal">Kong</strong> — setiap Kong → +1 Faan
                tambahan.
              </li>
            </ul>
            {embedded ? (
              <Link
                href="/combos?view=chicken"
                className="mt-4 inline-flex font-mono text-[10px] uppercase tracking-[0.14em] text-jade-accent underline-offset-4 hover:underline"
              >
                Aturan Chicken Hand →
              </Link>
            ) : null}
          </article>
          <article className="jade-card-accent p-5">
            <h3 className="font-serif text-xl">Jade HK Modified</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Min 1 Faan
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              Tangan tanpa Faan tidak sah Hu di hitungan ini. Pilih preset ini
              saat buat jadwal atau di kalkulator / scan.
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}