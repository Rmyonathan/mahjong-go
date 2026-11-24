# Jade Mahjong — Official House Rules & HK Scoring Specification

> **Purpose:** Single source of truth for Cursor / developers to update `/combos`, `/hk` (Rules Guide), `lib/mahjong/hkos-catalog.ts`, `lib/mahjong/engine.ts`, and `lib/mahjong/payout.ts`.  
> **Note:** All payouts use **Social Points / Jade Miles (per 1.000)**—never real-money gambling terminology.

---

## 1. Bunga dan Angin (Flowers, Seasons & Winds)

### Mapping Angin & Bunga
| Nomor | Angin | Indonesia | Bunga (Flowers) | Musim (Seasons) |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **東** | **Timur** (East — Dealer) | `1 春` (Spring) | `1 梅` (Plum) |
| **2** | **南** | **Selatan** (South) | `2 夏` (Summer) | `2 蘭` (Orchid) |
| **3** | **西** | **Barat** (West) | `3 秋` (Autumn) | `3 菊` (Chrysanthemum) |
| **4** | **北** | **Utara** (North) | `4 冬` (Winter) | `4 竹` (Bamboo) |

### Terminologi Putaran
* **a. Angin Kursi (Seat Wind):** Berubah sesuai posisi Dealer (Timur → Selatan → Barat → Utara).
* **b. Angin Meja (Round Wind):** Berubah per putaran penuh (Dimulai dari Timur, lalu Selatan, dst.).
* **c. Bunga Kursi (Seat Flower):** Bunga/Musim dengan angka yang cocok dengan **Angin Kursi** pemain (`+1 Faan` per tile).
* **d. Bunga Meja (Round Flower):** Bunga/Musim dengan angka yang cocok dengan **Angin Meja** (`+1 Faan` per tile).

---

## 2. Penentuan Angin (Seat Determination)
1. **4 Player kocok 2 dadu** → pemain dengan jumlah dadu tertinggi menjadi **Timur (Dealer / orang pertama)**.
2. **Urutan duduk (berlawanan arah jarum jam / counter-clockwise):**
   * Dari Timur (kanan), giliran berputar ke Selatan (atas), Barat (kiri), lalu Utara (bawah): **Timur → Selatan → Barat → Utara**.

---

## 3. Bagi Tiles (Dealing & Dead Wall)
1. **Susun Dinding (Wall):** Setiap pemain menyusun 18 stack (atau sesuai jumlah tile yang dipakai).
2. **Lempar 3 Dadu:** Timur melempar **3 dadu** dan menghitung berlawanan arah jarum jam dimulai dari Dealer (`1 = Timur`, `2 = Selatan`, `3 = Barat`, `4 = Utara`, `5 = Timur`, dst.).
3. **Pisahkan Dinding:** Pemain yang mendapat hitungan terakhir memisahkan dinding sejumlah hasil **3 dadu** dihitung dari **kanan**.
4. **Bagi Tiles:** Dimulai dari **Timur → Selatan → Barat → Utara** (4 tile per putaran hingga 13 tile, lalu Timur ambil 1 tile ke-14).
5. **Dinding Mati (Dead Wall / Kong Box):** Pisahkan **7 stack** dari ujung dinding sebelah kanan sebagai **Dinding Mati** (sumber pengganti Kong dan Bunga).
6. **Ganti Bunga:** Jika mendapat tile **Bunga / Musim**, langsung dibuka di depan dan ambil tile pengganti dari **Dinding Mati**.

---

## 4. Prioritas Klaim (Claim Priority)
* **Urutan prioritas:** **`Hu` (Menang) > `Pong` / `Kong` > `Chi`**
* **Jika 2 player mau `"Hu"` secara bersamaan:** Tentukan berdasarkan urutan giliran pemain terdekat setelah orang yang membuang tile (berlawanan arah jarum jam).

---

## 5. Daftar Scoring / Combos (Jade Mahjong HK Rules)

### A. Bonus & Dasar (Base & Bonus Faan)
| Nama Combo | Faan | Syarat / Penjelasan |
| :--- | :---: | :--- |
| **Pong / Kong Naga** | **+1 Faan** | Pong atau Kong dari salah satu Naga: Merah (`中` Chong), Hijau (`發` Fa Cai), atau Putih (`白` Pak Phan). |
| **Pong / Kong Angin Kursi** | **+1 Faan** | Pong atau Kong dari Angin yang sesuai dengan kursi pemain sendiri. |
| **Pong / Kong Angin Meja** | **+1 Faan** | Pong atau Kong dari Angin yang sesuai dengan Angin Meja saat ini. |
| **Dapat Bunga Sendiri** | **+1 Faan** | Mendapat Bunga/Musim yang angkanya sama dengan Angin Kursi (bisa dapat sampai 2 jika punya Bunga & Musim yang cocok). |
| **Dapat Bunga Meja** | **+1 Faan** | Mendapat Bunga/Musim yang angkanya sama dengan Angin Meja. |
| **All Chi (Ping Hu)** | **1 Faan** | Semua 4 set berupa urutan (`Chi`) + 1 pair bebas. |
| **All Pong (Toi Toi Hu)** | **3 Faan** | Semua 4 set berupa kembar 3/4 (`Pong`/`Kong`) + 1 pair bebas. |
| **Half Flush (Hun Yi Se)** | **3 Faan** | Semua tile terdiri dari **1 jenis suit angka** (Man / Bulat / Bambu) dicampur dengan **Honor** (Angin / Naga). |
| **Flush (Qing Yi Se)** | **6 Faan** | Semua 14 tile berasal dari **1 jenis suit angka saja** tanpa Honor sama sekali. |

---

### B. Special & Limit Hands (4 Faan & 10 Faan)
*(Catatan: Sesuai sheet resmi Jade Mahjong, syarat `"last draw boleh buka"` / `"boleh dibuka"` berarti hand tetap sah meskipun sudah membuka set Pong/Chi/pair terakhir dari buangan lawan).*

| Nama Combo | Faan | Syarat & Komposisi Tile |
| :--- | :---: | :--- |
| **Seven Pair (Qi Dui)** | **4 Faan** | 7 pasang tile (`pair`), gambar bebas, *last draw boleh buka*. |
| **Little Dragon (Xiao San Yuan)** | **4 Faan** | 2 Pong/Kong Naga + 1 Pair Naga + sisa set Pong/Kong/Chi bebas, *boleh dibuka*. |
| **Three Great Scholars (Da San Yuan)** | **10 Faan** | 3 Pong/Kong Naga lengkap (`中`, `發`, `白`) + 1 set Pong/Kong/Chi bebas + 1 pair bebas, *boleh dibuka*. |
| **Jade Dragon (Lu Yi Se / Green Dragon)** | **10 Faan** | Pong/Kong Naga Hijau (`發`) + semua sisa set Pong/Kong dan pair hanya dari suit **Bambu** (tanpa Chi), *boleh dibuka*. |
| **Ruby Dragon (Red Dragon)** | **10 Faan** | Pong/Kong Naga Merah (`中`) + semua sisa set Pong/Kong dan pair hanya dari suit **Karakter (Man)** (tanpa Chi), *boleh dibuka*. |
| **Pearl Dragon (White Dragon)** | **10 Faan** | Pong/Kong Naga Putih (`白` — *catatan: pada sheet tertulis merah, secara visual tile di gambar adalah Naga Putih*) + semua sisa set Pong/Kong dan pair hanya dari suit **Roda / Bulat** (tanpa Chi), *boleh dibuka*. |
| **All Honors (Zi Yi Se)** | **10 Faan** | 4 Pong/Kong Honor bebas (Angin / Naga) + 1 pair Honor bebas, *boleh dibuka*. |
| **Little Three Winds (Xiao Si Xi)** | **10 Faan** | 3 Pong/Kong Angin + 1 Pair Angin + 1 set Pong/Kong/Chi bebas, *boleh dibuka*. |
| **Big Four Winds (Da Si Xi)** | **10 Faan** | 4 Pong/Kong Angin lengkap (`東`, `南`, `西`, `北`) + 1 pair bebas, *boleh dibuka*. |
| **Nine Gates (Jiu Lian Bao Deng)** | **10 Faan** | 1 suit angka yang sama: `1-1-1`, `2, 3, 4, 5, 6, 7, 8`, `9-9-9` + 1 tile kembar dari suit yang sama sebagai pair, *last draw boleh buka*. |
| **All Terminals (Qing Yao Jiu)** | **10 Faan** | 4 Pong/Kong dan 1 Pair hanya dari angka **1 dan 9** saja, *boleh dibuka*. |
| **Thirteen Orphans (Shi San Yao)** | **10 Faan** | `1 & 9 Bulat` + `1 & 9 Bambu` + `1 & 9 Karakter` + ke-7 jenis Honor (`東 南 西 北 中 發 白`) + 1 pair dari salah satu tile tersebut, *last draw boleh buka*. |

---

## 6. Cara Hitung Faan ke Points (Per 1.000) / Chips

Di Jade Mahjong, total **Faan** dikonversi menjadi **Base Points (per 1.000)** menggunakan tabel eksponensial HK Old Style (dengan batas maksimum / **Limit = 10 Faan**):

### Tabel Konversi Faan → Base Points (Per 1.000)
```ts
// // EDIT HERE: Jade Mahjong Faan-to-Points Table (in units of 1.000 points)
export const FAAN_TO_BASE_POINTS: Record<number, number> = {
  0: 1000,    // Chicken Hand (jika diizinkan, min 1 Faan biasanya)
  1: 1000,    // 1 Faan  = 1.000
  2: 2000,    // 2 Faan  = 2.000
  3: 4000,    // 3 Faan  = 4.000
  4: 8000,    // 4 Faan  = 8.000
  5: 12000,   // 5 Faan  = 12.000 (atau 16.000 tergantung house rule)
  6: 16000,   // 6 Faan  = 16.000
  7: 24000,   // 7 Faan  = 24.000
  8: 32000,   // 8 Faan  = 32.000
  9: 48000,   // 9 Faan  = 48.000
  10: 64000,  // 10 Faan (Limit / Max) = 64.000
};
```
*(Catatan: Jika Faan > 10, tetap dihitung sebagai **Limit 10 Faan = 64.000**).*

---

### Rumus Pembayaran (Payout Deltas per Seat)

Misalkan **`B`** adalah `Base Points` dari tabel di atas (contoh: `3 Faan` → `B = 4.000`):

1. **Menang dari Buangan Lawan (`Discard / Rong`):**
   * **Penyuap (Yang buang tile kemenangan):** Membayar **`2 × B`** (contoh: `-8.000`)
   * **2 Pemain lainnya:** Membayar masing-masing **`1 × B`** (contoh: `-4.000` dan `-4.000`)
   * **Pemenang (`Hu`):** Menerima total **`4 × B`** (`2B + 1B + 1B` = `+16.000`)
   * *Total semua seat selalu seimbang (`Zero-Sum`: `+16.000 - 8.000 - 4.000 - 4.000 = 0`).*

2. **Menang Ambil Sendiri (`Self-Draw / Zimo`):**
   * **Semua 3 pemain lawan:** Membayar masing-masing **`2 × B`** (contoh: `-8.000`, `-8.000`, `-8.000`)
   * **Pemenang (`Hu`):** Menerima total **`6 × B`** (`2B × 3` = `+24.000`)
   * *Total semua seat selalu seimbang (`Zero-Sum`: `+24.000 - 8.000 - 8.000 - 8.000 = 0`).*

*(Opsi Alternatif — Full Shooter / Bao jika dipakai meja khusus: Penyuap membayar seluruh `4 × B` sendirian saat Discard; sediakan toggle di `// EDIT HERE` di `lib/mahjong/payout.ts` jika suatu saat dibutuhkan).*
```

---

### Prompt untuk Cursor (Update Combos, Engine, Payout & Halaman Rules)

Sekarang kamu tinggal copy-paste prompt di bawah ini ke **Cursor Composer (Agent Mode)** supaya `JADE_HK_RULES.md` langsung dipakai untuk meng-update kalkulator, daftar combo, dan halaman penjelasan rules:

```text
Read `JADE_HK_RULES.md` carefully. We are aligning our entire Jade Mahjong scoring engine, combos catalog, payout math, and rules guide page with the official Jade Mahjong HK Rules in `JADE_HK_RULES.md`.

CRITICAL RULES:
- Keep all existing UI styling, fluid cards, and mobile nav intact.
- Use "Social Points / Jade Miles (per 1.000)" — never real-money gambling terms.
- Mark configurable payout tables and house rule toggles with `// EDIT HERE`.

Tasks:

1. Update Combos Catalog (`lib/mahjong/hkos-catalog.ts` & `lib/mock/jade-combos.ts`):
   - Sync every combo name, Indonesian/English description, and Faan value with Section 5 of `JADE_HK_RULES.md`:
     - Bonus/Base: Pong/Kong Naga (+1), Angin Kursi (+1), Angin Meja (+1), Bunga Sendiri (+1), Bunga Meja (+1), All Chi (1 Faan), All Pong (3 Faan), Half Flush (3 Faan), Flush (6 Faan).
     - Special & 10-Faan Limit Hands: Seven Pair (4 Faan), Little Dragon (4 Faan), Three Great Scholars (10 Faan), Jade Dragon (10 Faan), Ruby Dragon (10 Faan), Pearl Dragon (10 Faan), All Honors (10 Faan), Little Three Winds (10 Faan), Big Four Winds (10 Faan), Nine Gates (10 Faan), All Terminals (10 Faan), Thirteen Orphans (10 Faan).
   - Ensure the `/combos` page (`app/combos/page.tsx`) displays these exact Faan values and clear Indonesian + English explanations (including `"boleh dibuka"` / `"last draw boleh buka"` notes).

2. Update Scoring Engine & Payout Math (`lib/mahjong/engine.ts` & `lib/mahjong/payout.ts`):
   - Ensure `engine.ts` detects and scores all combos in `JADE_HK_RULES.md` accurately (including Jade Dragon = Bambu + Green Dragon, Ruby Dragon = Man + Red Dragon, Pearl Dragon = Bulat + White Dragon, and capping total Faan at Limit 10 Faan).
   - Update `lib/mahjong/payout.ts` to use the exact `FAAN_TO_BASE_POINTS` table (per 1.000) and Zero-Sum payout formulas from Section 6 of `JADE_HK_RULES.md`:
     - Discard (`DISCARD`): Discard player pays `2 * B`, other 2 players pay `1 * B` each, Winner gets `+4 * B`.
     - Self-Draw (`SELF_DRAW`): All 3 opponents pay `2 * B` each, Winner gets `+6 * B`.
   - Show the clear breakdown in `components/mahjong/win-score-dialog.tsx` and `components/session/hand-log-modal.tsx` (e.g. `3 Faan = Base 4.000 pts → Winner +16.000 pts`).

3. Update Rules Guide Page (`app/hk/page.tsx` & `app/about/page.tsx`):
   - Format `app/hk/page.tsx` into a super clear, beginner-friendly visual guide in Bahasa Indonesia (with clean English sub-labels) covering Sections 1–6 of `JADE_HK_RULES.md`:
     1. Bunga & Angin (with visual 1–4 mapping)
     2. Penentuan Angin & Urutan Duduk (Timur → Selatan → Barat → Utara)
     3. Cara Bagi Tiles & Dinding Mati (3 Dadu + 7 Stack)
     4. Prioritas Klaim (`Hu > Pong/Kong > Chi`)
     5. Tabel Hitung Faan ke Points (per 1.000) lengkap dengan contoh perhitungan Discard vs Self-Draw.
```

Kalau ada angka di tabel `FAAN_TO_BASE_POINTS` (misalnya `5 Faan` di meja kalian biasa pakai `12.000` atau `16.000`) yang mau disesuaikan, tinggal ubah di bagian `// EDIT HERE` di `lib/mahjong/payout.ts` nanti.