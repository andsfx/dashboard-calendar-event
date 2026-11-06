# CTA hero `/events`: anchor `Sorotan` turun ke perlakuan outline

Written against: 9f6091b (+ working tree 2026-11-06: `EventsLandingPage.tsx`, `CHANGELOG.md`)
Status: **diterapkan** 2026-11-06 atas permintaan user ("oke fix semua"). Tidak ada file lain di luar `src/pages/EventsLandingPage.tsx` yang diubah untuk keputusan ini.

## Evidence chain

- Surface: baris CTA hero `/events`, `src/pages/EventsLandingPage.tsx:620-644` — `<div className="mt-8 flex flex-wrap items-center gap-3">` berisi tiga kontrol: anchor in-page `Sorotan` (`:621-627`), `Daftar Event` → `/daftar` (`:628-633`), dan `Unduh PDF` (`:634-643`).
- Problem: `Sorotan` memakai isian solid `bg-[var(--brand-tosca-600)] … text-white shadow-sm` (perlakuan primer) dan berdiri paling depan, sedangkan CTA konversi sebenarnya `Daftar Event` di baris yang sama hanya outline putih. Pembaca melihat dua tingkat bobot yang terbalik: aksi navigasi dalam halaman tampil sebagai aksi utama, konversi tampil sebagai aksi pendukung.
- Design evidence: `DESIGN.md:200-215` (CTA Buttons) — primary landing CTA solid tosca-600 dengan "clear verb: `Daftar Event`, `Ajukan Kolaborasi`, or `Hubungi Kami`"; Secondary CTA "outline/ghost for non-conversion actions", "lower visual weight than primary CTA", "points to proof or supporting info". `Sorotan` adalah anchor ke section bukti (`#featured`), yaitu persis definisi Secondary di dokumen itu. `DESIGN.md:260-264` (Conversion Flow) menetapkan satu intent konversi per halaman dengan satu label dan satu tujuan; di `/events` label itu `Daftar Event` → `/daftar`. Preseden keputusan user beririsan: `design-plans/2026-11-03-public-header-letter-action-weight.md` menurunkan `Unduh PDF` dari `ui-btn-primary` karena berbagi bar dengan CTA konversi.
- Owner: `src/pages/EventsLandingPage.tsx` (markup per halaman). Kelas outline bukan milik primitif bersama: kontrol header memakai bentuk yang sama (`PublicSiteHeader.tsx:179`) dan tombol sebarisnya sendiri (`:630`, `:638`) memakai kelas yang identik.
- Scope and affected surfaces: satu anchor di satu baris `HeroEventsSection`. Tidak menyentuh `PublicSiteHeader`, `publicNav.ts`, panel mobile `:647-678` (yang memang sudah outline), rail, kalender, band CTA bawah `:922-938`, atau footer `:941-973` — semuanya sudah memakai bobot yang benar (solid hanya untuk `Daftar Event` → `/daftar`).
- Reconcile: `design-plans/2026-10-25-public-site-header.md` b.2 mengizinkan slot `actions` memilih gaya sendiri; keputusan ini tidak mengubah slot itu, hanya bobot di dalam marketing body. `design-plans/2026-11-03-public-header-letter-action-weight.md` menetapkan prinsip yang sama untuk bar header; plan ini menerapkannya di body.
- Uncertainty: tidak ada. Bila produk kelak ingin `Sorotan` menjadi aksi primer, itu harus ditulis sebagai pengecualian di `DESIGN.md` §CTA Buttons.

## Design decision

Turunkan `Sorotan` ke perlakuan outline yang sudah dipakai dua tombol sebarisnya, sehingga satu-satunya perlakuan solid di `/events` adalah CTA konversi (`Daftar Event`). Tidak ada kelas baru, token baru, atau varian komponen.

## Reuse

- Kelas outline yang dipakai apa adanya dari `src/pages/EventsLandingPage.tsx:630` (`border-black/10 bg-white text-slate-700`, hover `bg-slate-50`, varian dark `border-slate-600 bg-slate-900`), yaitu wujud sekunder yang sudah ada di baris yang sama.
- `ui-focus-ring` (`src/styles/utilities.css:1-6`) dipertahankan.
- Tidak ada primitive baru: kontrol ini tetap `<a href="#featured">` biasa.

## Changes

1. `src/pages/EventsLandingPage.tsx:623`
   - Change: `className` anchor `Sorotan` dari
     `"group inline-flex items-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[var(--brand-tosca-dark)] ui-focus-ring"`
     menjadi
     `"group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ui-focus-ring"`.
   - Preserve: elemen tetap `<a>`, `href="#featured"`, isi `Sorotan` + ikon `ArrowRight` dengan animasi `group-hover:translate-x-0.5` dan `motion-reduce:transform-none`; urutan tiga kontrol; `Daftar Event` dan `Unduh PDF` tidak berubah.
   - Verify: di browser, `getComputedStyle` pada `a[href="#featured"]` **di dalam baris `.mt-8`** menghasilkan `background-color: rgb(255,255,255)`, `color: rgb(74,85,76)`, `border-top-width: 1px`, `font-weight: 600` — identik dengan `Daftar Event` pada baris yang sama.

## Scope

- Inherit: hanya `/events` (rute `/` tidak memakai baris ini).
- Verify: `Daftar Event`/`Unduh PDF` di baris yang sama tetap outline; CTA konversi lain di halaman (header, band bawah, footer) tetap seperti semula.
- Exclude: `src/components/nav/**`, `publicNav.ts`, rail mobile `:647-678`, band CTA `:922-938`, footer `:941-973`.

## Validation

- Product: di `/events`, aksi utama yang tampil paling kuat adalah `Daftar Event` → `/daftar`, bukan anchor scroll.
- Interface: `/events` pada 375 px, 768 px, 1440 px, light dan dark.
- System: kelas outline berasal dari tombol sebaris yang sudah ada; tidak ada varian baru.
- Repository:
  - `node ./node_modules/typescript/bin/tsc --noEmit` → 0 error.
  - `node ./node_modules/vite/bin/vite.js build` → hijau.
  - `NODE_ENV=test node ./node_modules/vitest/vitest.mjs run src/pages/__tests__/EventsLandingPage.export.test.tsx src/pages/__tests__/EventsLandingPage.poster.test.tsx src/pages/__tests__/EventsLandingPage.recurring.test.tsx src/components/nav --maxWorkers=2` → **6 file / 62 test** lulus.

## Stop conditions

- Berhenti bila `Sorotan` ternyata satu-satunya jalan menuju section `#featured` di viewport mana pun (tidak: header `sectionLinks` dan panel menu memuat jalur yang sama).
- Berhenti bila produk ingin anchor scroll tetap setara CTA konversi; dalam kasus itu pengecualian harus ditulis di `DESIGN.md` §CTA Buttons, bukan dibiarkan tanpa catatan.

## Design documentation

- Setelah diterapkan: entri `CHANGELOG.md` `[Unreleased] → Changed` (2026-11-06). `DESIGN.md` §CTA Buttons sudah memuat aturannya (`:200-215`); tidak perlu tambahan, karena plan ini mengembalikan kepatuhan, bukan membuat aturan baru.
