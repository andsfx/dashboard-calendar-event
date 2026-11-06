# Aksi `Unduh PDF` di header `/letter/:id` turun ke perlakuan outline

Written against: e9792f8
Status: plan only. Tidak ada file `src/**` yang dibuat atau diubah oleh plan ini.

## Evidence chain

- Surface: klaster kanan bar `PublicSiteHeader` di rute `/letter/:id`, yaitu slot `actions` yang diisi `src/pages/PublicLetterViewer.tsx:116-124` dan dirender oleh `src/components/nav/PublicSiteHeader.tsx:148-151`.
- Problem: tombol `Unduh PDF` memakai `ui-btn-primary` (latar solid `--brand-tosca-600`, teks putih) dan duduk sebaris dengan CTA konversi `Daftar Event` (`PublicSiteHeader.tsx:164-171`) yang juga `ui-btn-primary`. Di bar yang sama tampil dua pil tosca identik, jadi bobot visual berhenti menandai mana aksi konversi.
- Design evidence: `DESIGN.md:210-215` menetapkan **Secondary CTA**: "outline/ghost for non-conversion actions", "lower visual weight than primary CTA". `DESIGN.md:260-264` menyatakan landing/public punya satu intent konversi dengan satu label dan satu tujuan, dan header adalah salah satu dari lima penempatan CTA itu. `Unduh PDF` bukan salah satu verb konversi yang disebut (`Daftar Event`, `Ajukan Kolaborasi`, `Hubungi Kami`, `DESIGN.md:208`), jadi ia aksi non-konversi. Latar `ui-btn-primary` didefinisikan di `src/styles/utilities.css:85-89` (`background: var(--brand-tosca-600); color: #fff`).
- Owner: `src/pages/PublicLetterViewer.tsx` sebagai konsumen slot. Kontrak slot: `PublicSiteHeader.tsx:28-43` (`actions?: ReactNode`) dan `:148-151` (dirender sebagai anak pertama klaster kanan).
- Scope and affected surfaces: satu tombol di satu bar pada satu rute. `PublicSiteHeader`, `publicNav.ts`, dan halaman lain tidak berubah. Tombol `ui-btn-primary` lain di halaman yang sama (`:96` "Kembali ke Beranda" di kartu error, `:163` "Buat & Unduh PDF" di state PDF kosong) berada di badan halaman, bukan di bar, dan tidak berbagi baris dengan CTA konversi — keduanya **tidak** disentuh.
- Reconcile dengan plan yang ada: `design-plans/2026-10-25-public-site-header.md` § b.2 menyatakan slot `actions` dirender apa adanya "agar halaman bebas memakai `ui-btn-primary` atau tombol outline". Kebebasan itu dipertahankan; plan ini hanya menetapkan bahwa bila bar sudah membawa CTA konversi, aksi non-konversi memakai jalur outline sesuai `DESIGN.md:213`. Tidak ada pertentangan: b.2 mengatur apa yang diizinkan slot, `DESIGN.md` mengatur hierarki di dalam bar.
- Uncertainty: bila produk memang menginginkan `Unduh PDF` sebagai aksi primer halaman ini, hentikan dan minta pengecualian itu ditulis di `DESIGN.md`. Jangan mempertahankan dua CTA primer dalam satu bar tanpa pengecualian terdokumentasi.

## Design decision

Turunkan `Unduh PDF` ke perlakuan outline yang sudah dipakai kontrol header sendiri, supaya hanya CTA konversi yang tampil solid. Kelas yang dipakai adalah kelas tombol `Menu` (`PublicSiteHeader.tsx:172-187`) apa adanya, tanpa `lg:hidden` — tidak ada varian tombol baru, tidak ada token baru, dan `actions` tetap bebas memilih gaya di halaman lain.

## Reuse

- `ui-focus-ring` (`src/styles/utilities.css:1-6`) — dipertahankan.
- Exemplar outline di klaster yang sama: tombol `Menu` `src/components/nav/PublicSiteHeader.tsx:179` (`border border-black/8`, `text-slate-700 dark:text-slate-200`, `hover:bg-slate-100`, `dark:hover:bg-slate-800`, `min-h-11`, `text-[13px] font-semibold`).
- Tidak ada primitive baru. `ui-btn-primary` tetap menjadi satu-satunya gaya CTA solid di bar.

## Changes

1. `src/pages/PublicLetterViewer.tsx`
   - Change: pada tombol aksi di `:120`, ganti seluruh `className` dari
     `"ui-btn-primary ui-focus-ring flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-tosca-dark)]"`
     menjadi
     `"ui-focus-ring inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-black/8 px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"`.
   - Preserve: `type="button"`, `onClick={handleDownload}`, label teks `Unduh PDF`, `<Download size={16} aria-hidden />`, `shrink-0`, dan posisi tombol sebagai nilai prop `actions` (klaster kanan bar, sebelum toggle tema).
   - Verify: di `/letter/:id` bar hanya memuat satu elemen berlatar `--brand-tosca-600` (CTA `Daftar Event`); `Unduh PDF` tampil sebagai pil bergaris dengan teks slate; klik tetap mengunduh PDF yang sama.

## Scope

- Inherit: hanya instance tombol di slot `actions` pada `/letter/:id`.
- Verify: `PublicSiteHeader` tidak berubah, jadi header di 17 file halaman lain tidak berubah; tombol `Kembali ke Beranda` (`:96`) dan `Buat & Unduh PDF` (`:163`) tetap `ui-btn-primary`; state error dan state PDF kosong tetap berfungsi.
- Exclude: `PublicSiteHeader.tsx`, `publicNav.ts`, `utilities.css`, dan tombol `ui-btn-primary` di badan halaman.

## Validation

- Product: buka `/letter/:id` dengan surat yang punya PDF. Diharapkan tombol `Unduh PDF` tetap terlihat dan berfungsi, tetapi satu tingkat di bawah CTA `Daftar Event` secara visual.
- Interface: 375 px, 768 px, 1024 px, 1440 px; light dan dark; urutan Tab sampai kedua tombol; `focus-visible` ring tosca pada tombol outline; aktifkan `prefers-reduced-motion` (warna hover tetap, tanpa transisi).
- System: `grep -rn "ui-btn-primary" src/pages/PublicLetterViewer.tsx` → tidak ada hasil di baris `:120`; `grep -rn "ui-btn-primary" src/components/nav/PublicSiteHeader.tsx` → hanya CTA `Daftar Event` (`:167`). Tidak ada kelas tombol baru di `src/styles/utilities.css`.
- Repository:
  - `npm run build` → 0 error TypeScript, Vite selesai.
  - `NODE_ENV=test npx vitest run src/components/nav --maxWorkers=2` → `PublicSiteHeader.test.tsx`, `NavDropdown.test.tsx`, `ScrollToTop.test.tsx` lulus.
  - Tidak ada tes yang mengassert kelas tombol di `PublicLetterViewer` (tidak ada file tes untuk halaman itu) dan tidak ada tes yang mengassert `ui-btn-primary`. Jangan menambah tes yang mengunci string kelas; buktinya smoke visual.
  - Jangan mengubah tes atau aset verifikasi untuk meloloskan pemeriksaan.

## Stop conditions

- Berhenti jika produk menyatakan `Unduh PDF` adalah aksi primer halaman ini; minta pengecualian ditulis di `DESIGN.md` sebelum menyimpang dari `:213`.
- Berhenti jika perubahan mengharuskan mengubah `PublicSiteHeader`, `publicNav.ts`, atau menambah varian tombol di `utilities.css`.
- Berhenti jika CTA `Daftar Event` ternyata tidak lagi dirender di bar pada rute ini (`showCta`, `PublicSiteHeader.tsx:88`) — prasyarat temuan ini hilang dan plan perlu dinilai ulang.

## Design documentation

- Tidak ada. `DESIGN.md:210-215` sudah mengatur hierarki CTA primer/sekunder; plan ini hanya menerapkannya pada satu konsumen.
