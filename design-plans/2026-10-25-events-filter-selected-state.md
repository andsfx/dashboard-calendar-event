# Filter kategori `/events` memakai selected state tosca

Written against: bc6f624

## Evidence chain

- Surface: `/events`, section `#filter` di `src/pages/EventsLandingPage.tsx:708-755`, berisi filter waktu dan filter kategori.
- Problem: filter waktu memakai selected state tosca-600, sedangkan filter kategori memakai state netral hitam di light mode dan putih di dark mode. Keduanya adalah kontrol single-select dengan `aria-pressed` di section yang sama, sehingga satu baris filter memakai dua bahasa selected-state.
- Design evidence: `DESIGN.md:33` mewajibkan tosca untuk selected states. Branch aktif filter waktu di `EventsLandingPage.tsx:719` sudah memakai `bg-[var(--brand-tosca-600)] text-white`; branch aktif kategori di `:735` dan `:749` memakai `bg-slate-900 text-white dark:bg-white dark:text-slate-900`. Token `--brand-tosca-600` adalah `#007a78` (`src/styles/tokens.css:15`, `src/styles/theme.css:21`) dengan teks putih 5.18:1.
- Owner: `src/pages/EventsLandingPage.tsx`, filter section.
- Scope and affected surfaces: dua branch aktif kategori (`Semua Kategori` di `:735` dan setiap kategori di `:749`). Hanya route `/events`; tidak ada consumer lain.
- Uncertainty: tidak ada. Jika grup kategori memang sengaja memakai selected state netral sebagai pengecualian desain, hentikan dan minta pengecualian itu didokumentasikan; jangan diam-diam mempertahankan dua bahasa selected-state.

## Design decision

Samakan selected state filter kategori dengan filter waktu: `bg-[var(--brand-tosca-600)] text-white`. Inactive state, ukuran, padding, `aria-pressed`, dan perilaku URL tidak berubah. Tidak ada token atau komponen baru.

## Reuse

- Token `--brand-tosca-600` (`src/styles/tokens.css:15`; alias `--color-brand-primary-600` di `src/styles/theme.css:21`).
- Utility yang sudah dipakai filter waktu: `bg-[var(--brand-tosca-600)] text-white` (`EventsLandingPage.tsx:719`).
- `ui-focus-ring`, `aria-pressed`, dan struktur `role="group"` tetap dipakai apa adanya.
- Tidak ada primitive baru.

## Changes

1. `src/pages/EventsLandingPage.tsx`
   - Change: pada dua branch aktif kategori, ganti string `bg-slate-900 text-white dark:bg-white dark:text-slate-900` menjadi `bg-[var(--brand-tosca-600)] text-white`.
     - Branch `Semua Kategori`: `:735`.
     - Branch setiap kategori: `:749`.
   - Preserve: `aria-pressed={!kategori}` dan `aria-pressed={kategori === cat}`, label, `text-[11px] font-semibold`, `px-3.5 py-1`, `rounded-full`, `transition`, `ui-focus-ring`, string inactive `border border-black/10 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800`.
   - Verify: di light dan dark, pill kategori aktif berwarna tosca-600 dengan teks putih, sama seperti pill waktu aktif; pill kategori inactive tidak berubah; tidak ada layout shift.

## Scope

- Inherit: kedua branch aktif kategori, termasuk `Semua Kategori` dan setiap kategori yang dirender dari `categoryOptions`.
- Verify: filter waktu tetap tosca-600; filter kategori tetap bisa di-toggle; URL `?kategori=` dan `?waktu=` tetap bekerja; kombinasi filter tetap bekerja.
- Exclude: filter waktu, status chip, kartu event, kalender, halaman lain.

## Validation

- Product: memilih kategori terlihat sebagai state aktif yang sama dengan memilih waktu.
- Interface: `/events` pada 375px dan 1440px, light dan dark; klik `Semua`, `Hari Ini`, `Besok`, `Akhir Pekan Ini`, `Semua Kategori`, lalu satu kategori; cek `aria-pressed`, warna, dan URL.
- System: hanya token `--brand-tosca-600`; tidak ada komponen/token baru; filter waktu tetap menjadi exemplar.
- Repository:
  - `npm run build` menghasilkan 0 error TypeScript dan Vite build selesai.
  - `NODE_ENV=test npx vitest run src/pages/__tests__/EventsLandingPage.export.test.tsx src/pages/__tests__/EventsLandingPage.poster.test.tsx` semua lulus.
  - `npm run dev` lalu buka `http://localhost:5173/events` untuk smoke visual.
  - Jangan mengubah tes atau aset verifikasi untuk meloloskan pemeriksaan. Tidak ada tes yang mengassert kelas warna filter; jika ada yang gagal, hentikan dan laporkan.

## Stop conditions

- Berhenti jika grup kategori memerlukan selected state netral sebagai keputusan desain yang terdokumentasi.
- Berhenti jika `--brand-tosca-600` tidak resolve ke `#007a78` atau teks putih tidak lagi lolos AA 5.18:1.
- Berhenti jika perubahan menyentuh filter waktu atau surface di luar `/events`.

## Design documentation

- Tidak ada. `DESIGN.md:33` sudah mengatur selected states dan tidak perlu aturan baru.
