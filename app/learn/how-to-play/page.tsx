import type { Metadata } from "next"
import Link from "next/link"

import { RULESET_OPTIONS } from "@/lib/mahjong/rulesets"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "How to Play — Jade Mahjong",
  description:
    "Panduan pemula: tujuan permainan, Chi Pung Kong, Chicken Hand vs Jade HK, dan langkah pertama di meja.",
}

const WIN_SHAPE = [
  "14 tile di tangan (atau 13 + 1 tile menang).",
  "Empat set (masing-masing 3 atau 4 tile) plus satu pasangan (2 tile sama).",
  "Set = urutan Chi, kembar Pung, atau Kong (empat sama).",
  "Menang (Hu) saat bentuk ini lengkap — lalu Faan dihitung untuk skor.",
] as const

const SET_TYPES = [
  {
    title: "Chi · Urutan",
    sub: "3 tile berurutan, satu suit",
    note: "Hanya bisa klaim dari pemain di kiri (bukan sembarang buangan).",
    accent: false,
  },
  {
    title: "Pung · Kembar 3",
    sub: "Tiga tile identik",
    note: "Bisa dari buangan siapa saja — siapa cepat dia dapat.",
    accent: false,
  },
  {
    title: "Kong · Kembar 4",
    sub: "Empat tile identik",
    note: "Ambil pengganti dari Dinding Mati setelah buka Kong.",
    accent: true,
  },
  {
    title: "Pair · Jodoh",
    sub: "Dua tile sama",
    note: "Satu pasangan wajib — biasanya tile “menunggu” terakhir saat Hu.",
    accent: false,
  },
] as const

const TURN_BASICS = [
  "Giliran berputar berlawanan arah jarum jam: Timur → Selatan → Barat → Utara.",
  "Pada giliranmu: ambil 1 tile (dari dinding atau buangan khusus klaim), lalu buang 1 tile.",
  "Jangan buka tile lawan kecuali untuk Chi / Pung / Kong / Hu sesuai aturan.",
  "Bunga atau Musim di tangan? Buka di depan, ambil pengganti, tile itu bisa bantu Faan.",
] as const

const JADE_EXTRAS = [
  {
    name: "Double Chi",
    fan: "+1 Faan",
    text: "Dua set Chi identik (mis. dua kali 1-2-3 Bulatan) memberi +1 Faan per pasangan.",
  },
  {
    name: "Kong bonus",
    fan: "+1 Faan",
    text: "Setiap Kong di tangan memberi +1 Faan tambahan (di atas bonus Naga/Angin jika ada).",
  },
  {
    name: "Bunga & Angin",
    fan: "+1 each",
    text: "Bunga Kursi / Bunga Meja / Angin Kursi / Angin Meja yang cocok = +1 Faan per tile.",
  },
] as const

const NEXT_STEPS = [
  {
    href: "/combos?view=hk",
    label: "Panduan HK lengkap",
    desc: "Bagi tile, klaim, tabel Faan → Jade Miles.",
  },
  { href: "/combos", label: "Buku combo", desc: "Semua pola Faan dengan contoh tile." },
  { href: "/calculator", label: "Kalkulator tangan", desc: "Susun 14 tile dan cek skor." },
  { href: "/puzzle", label: "Daily WWYD", desc: "Latihan buang tile setiap hari." },
] as const

export default function HowToPlayPage() {
  const chicken = RULESET_OPTIONS.find((r) => r.id === "chicken")!
  const jadeHk = RULESET_OPTIONS.find((r) => r.id === "jade-hk")!

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Club &amp; Learn · Vol. 00
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[0.9] sm:text-7xl">
            How to Play
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Mahjong dasar · meja Jade
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed">
            Kamu tidak perlu hafal semua combo di hari pertama. Pahami bentuk
            menang, tiga jenis set, dan beda{" "}
            <strong className="font-normal">Chicken Hand</strong> vs{" "}
            <strong className="font-normal">Jade HK</strong> — sisanya bisa
            sambil main.
          </p>
        </div>
        <div className="stamp-mark" aria-hidden>
          學
        </div>
      </div>
      <div className="jade-divider mt-6" />

      <section className="mt-10" aria-label="Tujuan permainan">
        <h2 className="font-serif text-3xl">1. Apa yang kamu kejar?</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Winning shape
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {WIN_SHAPE.map((line, i) => (
            <li key={line} className="jade-card flex gap-3 p-4 text-sm leading-relaxed">
              <span className="font-mono text-xs text-jade-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Suit: Bulatan, Bambu, Karakter (masing-masing 1–9). Honor: Angin &
          Naga. Bunga/Musim bonus — tidak dipakai untuk Chi/Pung biasa.
        </p>
      </section>

      <section className="mt-12" aria-label="Chi Pung Kong">
        <h2 className="font-serif text-3xl">2. Chi, Pung, Kong, Pair</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Melds
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {SET_TYPES.map((item) => (
            <li
              key={item.title}
              className={cn("jade-card p-4", item.accent && "jade-card-accent")}
            >
              <p className="font-serif text-2xl">{item.title}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {item.sub}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{item.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed">
          Prioritas klaim saat ada buangan:{" "}
          <strong className="font-normal">Hu</strong> dulu, lalu{" "}
          <strong className="font-normal">Pung / Kong</strong>, baru{" "}
          <strong className="font-normal">Chi</strong> (hanya dari kiri). Detail
          meja di{" "}
          <Link
            href="/combos?view=hk"
            className="text-jade-accent underline-offset-2 hover:underline"
          >
            panduan HK
          </Link>
          .
        </p>
      </section>

      <section className="mt-12" aria-label="Satu putaran">
        <h2 className="font-serif text-3xl">3. Satu giliran, singkat</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Turn flow
        </p>
        <ol className="mt-4 flex flex-col gap-2">
          {TURN_BASICS.map((step, i) => (
            <li key={step} className="jade-card flex gap-3 p-4 text-sm leading-relaxed">
              <span className="font-mono text-xs text-jade-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-label="Hitungan meja">
        <h2 className="font-serif text-3xl">4. Chicken Hand vs Jade HK</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Dua hitungan di aplikasi ini
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">
          Setelah Hu, mesin menghitung <strong className="font-normal">Faan</strong>{" "}
          (poin pola). Faan dikonversi ke{" "}
          <strong className="font-normal">Jade Miles</strong> (per 1.000) —
          skor sosial rumah, bukan uang tunai. Meja memilih hitungan saat jadwal
          dibuat; kalkulator bisa ganti preset.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="jade-card p-5">
            <h3 className="font-serif text-2xl">{chicken.label}</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Min {chicken.minFan} Faan
            </p>
            <p className="mt-3 text-sm leading-relaxed">{chicken.summaryId}</p>
            <ul className="mt-4 space-y-2 border-t border-jade-ink/20 pt-4 text-sm leading-relaxed">
              <li>
                <strong className="font-normal">Chicken Hand</strong> = tangan
                sah tanpa pola bonus — 0 Faan tetap menang dan dapat base{" "}
                <span className="font-mono">1.000</span> Jade Miles.
              </li>
              <li>
                Cocok untuk pemula atau meja santai: fokus bentuk 4 set + pair,
                tanpa wajib punya Dragon Pung atau Flush.
              </li>
              <li>
                Bukan &ldquo;All Chi (Ping Hu)&rdquo; otomatis — itu pola tersendiri (+1 Faan
                di Jade HK kalau seluruh set urutan).
              </li>
            </ul>
          </article>

          <article className="jade-card-accent p-5">
            <h3 className="font-serif text-2xl">{jadeHk.label}</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Min {jadeHk.minFan} Faan
            </p>
            <p className="mt-3 text-sm leading-relaxed">{jadeHk.summaryId}</p>
            <ul className="mt-4 space-y-2 border-t border-jade-ink/20 pt-4 text-sm leading-relaxed">
              <li>
                Tangan <strong className="font-normal">tanpa Faan tidak boleh Hu</strong>{" "}
                — kamu perlu minimal satu combo (mis. All Chi, Half Flush, Red
                Dragon Pung, Double Chi, …).
              </li>
              <li>
                Default di banyak sesi Jade Mahjong; lihat daftar lengkap di{" "}
                <Link href="/combos" className="text-jade-accent underline-offset-2 hover:underline">
                  Combos
                </Link>
                .
              </li>
              <li>Limit skor: 10 Faan = 64.000 Jade Miles (mesin memotong di sana).</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="mt-12" aria-label="Bonus rumah">
        <h2 className="font-serif text-3xl">5. Bonus yang sering ketinggalan</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Jade HK · rumah
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {JADE_EXTRAS.map((item) => (
            <li key={item.name} className="jade-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-lg">{item.name}</h3>
                <span className="shrink-0 border border-jade-ink px-2 py-0.5 font-mono text-[10px]">
                  {item.fan}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-label="Tips pemula">
        <h2 className="font-serif text-3xl">6. Tips kursi pertama</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Etiket &amp; strategy ringan
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="jade-card p-4 text-sm leading-relaxed">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Jangan buru-buru Chi
            </p>
            <p className="mt-1">
              Chi mengunci suit — kadang lebih baik tahan untuk Half Flush atau
              menunggu Pung honor.
            </p>
          </div>
          <div className="jade-card p-4 text-sm leading-relaxed">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Perhatikan buangan
            </p>
            <p className="mt-1">
              Tile aman untuk lawan = tile yang sudah keluar banyak atau buangan
              mereka sendiri.
            </p>
          </div>
          <div className="jade-card p-4 text-sm leading-relaxed">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Dealer (Timur)
            </p>
            <p className="mt-1">
              Dealer main lebih dulu dan sering dapat bonus putaran — jangan
              panik kalau bukan kursimu.
            </p>
          </div>
          <div className="jade-card p-4 text-sm leading-relaxed">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Tanya di meja
            </p>
            <p className="mt-1">
              Rumah Jade boleh koreksi langkah — aplikasi ini mencatat skor, bukan
              menggantikan sopan santun meja.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14" aria-label="Lanjut belajar">
        <h2 className="font-serif text-3xl">Lanjut belajar</h2>
        <div className="jade-rule mt-4" />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {NEXT_STEPS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="jade-card group block p-4 transition-colors hover:bg-parchment"
              >
                <p className="font-serif text-xl group-hover:text-jade-accent">
                  {item.label} →
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">
          Mau duduk di meja nyata?{" "}
          <Link href="/about" className="text-jade-accent underline-offset-2 hover:underline">
            Tentang klub
          </Link>{" "}
          &middot;{" "}
          <Link href="/schedule" className="text-jade-accent underline-offset-2 hover:underline">
            Jadwal open table
          </Link>
        </p>
      </section>
    </main>
  )
}