# Rail card `/events` memakai shadow/elevation token warm

Written against: bc6f624

## Evidence chain

- Surface: `EventRailCard` di `src/pages/EventsLandingPage.tsx:301-380`, dirender di `/events` pada tiga branch: hasil filter (`:793`), group per area (`:844`), dan rail default (`:864`).
- Problem: root `<button>` kartu memakai `shadow-[0_4px_12px_rgba(15,23,42,0.02)]` di rest dan `hover:shadow-[var(--shadow-card-soft)]` saat hover. Literal cool slate itu satu-satunya di surface yang tertelusur, dan hover tidak pernah mencapai elevation raised yang terdokumentasi.
- Design evidence: `DESIGN.md:130-134` menetapkan `--shadow-card-soft` untuk default card rest, `--shadow-card-raised` untuk hover/elevated interactive, warm ink `rgba(22, 33, 27, …)`, dan melarang cool slate `rgba(15, 23, 42, …)` di campaign surface. Token ada di `src/styles/tokens.css:56-57`. Sibling `HighlightEventCard` di `EventsLandingPage.tsx:173` sudah memakai `shadow-[var(--shadow-card-soft)]`.
- Owner: `src/pages/EventsLandingPage.tsx`, `EventRailCard`.
- Scope and affected surfaces: semua instance `EventRailCard` di `/events`; tiga render branch. Tidak ada importer lain karena komponen ini lokal dan tidak diekspor.
- Uncertainty: tidak ada. Kartu adalah elemen interaktif, jadi `--shadow-card-raised` pada hover sesuai dengan tabel token. Jika produk menginginkan hover tetap flat, hentikan dan minta pengecualian didokumentasikan; jangan membuat shadow literal baru.

## Design decision

Ganti shadow ad-hoc dengan pasangan token yang sudah ada: `shadow-[var(--shadow-card-soft)]` di rest dan `hover:shadow-[var(--shadow-card-raised)]` saat hover. Semua kelas lain dipertahankan, termasuk radius 1.5rem, background, border, translasi hover, `motion-reduce`, dan focus ring.

## Reuse

- `--shadow-card-soft` (`src/styles/tokens.css:56`; `0 1px 3px rgba(22, 33, 27, 0.06)`).
- `--shadow-card-raised` (`src/styles/tokens.css:57`; `0 18px 45px rgba(22, 33, 27, 0.08)`).
- Exemplar rest: `HighlightEventCard` di `src/pages/EventsLandingPage.tsx:173`.
- Tidak ada primitive baru.

## Changes

1. `src/pages/EventsLandingPage.tsx`
   - Change: pada class root `EventRailCard` di `:323`, ganti dua substring:
     - `shadow-[0_4px_12px_rgba(15,23,42,0.02)]` menjadi `shadow-[var(--shadow-card-soft)]`.
     - `hover:shadow-[var(--shadow-card-soft)]` menjadi `hover:shadow-[var(--shadow-card-raised)]`.
   - Preserve: `rounded-[1.5rem]`, `border border-[var(--border-subtle)]`, `bg-white`, `dark:border-slate-700`, `dark:bg-slate-900`, `hover:-translate-y-0.5`, `motion-reduce:hover:translate-y-0`, `ui-focus-ring`, `transition`, dan seluruh isi kartu.
   - Verify: di rest, shadow kartu memakai warm ink yang sama dengan `HighlightEventCard`; saat hover, shadow naik ke elevation raised; di dark mode dan `prefers-reduced-motion`, tidak ada regresi layout atau fokus.

## Scope

- Inherit: semua `EventRailCard` di tiga branch `/events`.
- Verify: `HighlightEventCard` tidak berubah; `CalendarView` dan kartu lain tidak berubah; hover dan focus state tetap bekerja.
- Exclude: `HighlightEventCard`, `CalendarView`, radius, background, border, dan komponen lain.

## Validation

- Product: kartu rail dan kartu sorotan memakai elevation warm yang sama; hover terasa sebagai elevation yang lebih tinggi.
- Interface: `/events` pada 375px dan 1440px, light dan dark; cek rail default, hasil filter, dan group per area; hover dan keyboard focus; aktifkan reduced motion.
- System: hanya `--shadow-card-soft` dan `--shadow-card-raised`; tidak ada token/komponen baru.
- Repository:
  - `npm run build` menghasilkan 0 error TypeScript dan Vite build selesai.
  - `NODE_ENV=test npx vitest run src/pages/__tests__/EventsLandingPage.export.test.tsx src/pages/__tests__/EventsLandingPage.poster.test.tsx` semua lulus.
  - `npm run dev` lalu buka `http://localhost:5173/events` untuk smoke visual.
  - Jangan mengubah tes atau aset verifikasi untuk meloloskan pemeriksaan. Tidak ada tes yang mengassert kelas shadow; jika ada yang gagal, hentikan dan laporkan.

## Stop conditions

- Berhenti jika `--shadow-card-raised` terlalu kuat untuk kartu kompak dan produk menginginkan pengecualian yang didokumentasikan.
- Berhenti jika token shadow tidak resolve di `tokens.css` atau jika perubahan menyentuh kartu selain `EventRailCard`.
- Berhenti jika solusi yang muncul memerlukan shadow literal baru.

## Design documentation

- Tidak ada. `DESIGN.md:130-134` sudah mengatur shadow card dan larangan cool slate.
