# Status `/events` memakai satu vocabulary

Written against: bc6f624

## Evidence chain

- Surface: `/events` (`src/App.tsx:354-369` merender `src/pages/EventsLandingPage.tsx`), termasuk chip status di `HighlightEventCard`, chip di `EventRailCard`, label stat hero, heading section, dan `CalendarView` (`src/components/views/CalendarView.tsx`, hanya diimpor oleh `EventsLandingPage.tsx:48`).
- Problem: state yang sama diberi label berbeda di satu surface. Ongoing: `Sedang Berlangsung` (`EventsLandingPage.tsx:218`), `Live` (`:342`, `:617`), `Berlangsung` (`StatusBadge.tsx:12`, legend `CalendarView.tsx:260`). Upcoming: `Segera Hadir` (`EventsLandingPage.tsx:218`, `:623`), `Akan Datang` (`:855`, `CalendarView.tsx:25`), `Mendatang` (`StatusBadge.tsx:17`, legend `CalendarView.tsx:261`). Past: `Sudah Selesai` (`CalendarView.tsx:26`), `Selesai` (`StatusBadge.tsx:22`, legend `CalendarView.tsx:262`).
- Design evidence: `StatusBadge` adalah primitive status bersama dan sudah menjadi vocabulary kanonis di panel kalender yang sama (`CalendarView.tsx:332,393,566,621`); legend dan ringkasan bulan memakai label yang sama (`:260-262`, `:497`). `EventsLandingPage.tsx:218` dan `CalendarView.tsx:24-26` adalah outlier. `DESIGN.md:343` juga menetapkan Indonesian-first labels; `Live` adalah satu-satunya label status berbahasa Inggris di surface ini.
- Owner: `src/pages/EventsLandingPage.tsx` (label lokal) dan `src/components/views/CalendarView.tsx` (`STATUS_GROUPS`). `src/components/ui/StatusBadge.tsx` adalah sumber label dan tidak diubah.
- Scope and affected surfaces: hanya route `/events`. `CalendarView` hanya dipakai `EventsLandingPage`; `StatusBadge` juga dipakai dashboard dan detail publik, tetapi plan ini tidak mengubah `StatusBadge`, jadi surface lain tidak berubah.
- Uncertainty: `Sedang berlangsung` di `EventsLandingPage.tsx:284` adalah prosa, bukan label; plan ini sengaja membiarkannya. Tidak ada uncertainty untuk pemilihan label karena `StatusBadge`, legend, dan ringkasan sudah sepakat pada `Berlangsung`/`Mendatang`/`Selesai`.

## Design decision

Pakai satu vocabulary status di `/events`: `Berlangsung`, `Mendatang`, `Selesai`, diambil dari `StatusBadge` yang sudah ada. Ganti semua label status lokal yang menyimpang, tetapi jangan ubah `StatusBadge` itu sendiri dan jangan ubah prosa, label tanggal, atau countdown.

## Reuse

- Label `StatusBadge`: `Berlangsung` (`src/components/ui/StatusBadge.tsx:12`), `Mendatang` (`:17`), `Selesai` (`:22`).
- `STATUS_GROUPS` (`src/components/views/CalendarView.tsx:23-27`) tetap menjadi satu-satunya sumber heading grup.
- Legend `CalendarView.tsx:260-262` dan ringkasan `:497` sudah memakai vocabulary yang sama; jadikan exemplar.
- Tidak ada primitive baru.

## Changes

1. `src/pages/EventsLandingPage.tsx`
   - Change:
     - `:218`: ganti ternary menjadi `isLive ? 'Berlangsung' : 'Mendatang'`.
     - `:342`: ganti teks `Live` menjadi `Berlangsung`.
     - `:617`: ganti label `Live` menjadi `Berlangsung`.
     - `:622-623`: ganti `Segera` dan `Segera Hadir` menjadi `Mendatang`. Kedua span responsif boleh tetap ada, tetapi keduanya harus membaca `Mendatang`.
     - `:855`: ganti heading `Akan Datang & Berlangsung` menjadi `Mendatang & Berlangsung`.
   - Preserve: `isLive` logic, chip styling, `aria-hidden` icons, stat layout, responsive spans, heading size/weight, filter copy, prosa `Sedang berlangsung` di `:284`, serta label tanggal/countdown (`relativeDayLabel`, `countdownLabel`).
   - Verify: chip hero, label stat, chip rail, heading section, dan `CalendarView` group headings menampilkan `Berlangsung`/`Mendatang`/`Selesai`; tidak ada `Live`, `Segera Hadir`, `Akan Datang`, `Sudah Selesai`, atau `Sedang Berlangsung` sebagai label status di `/events`.

2. `src/components/views/CalendarView.tsx`
   - Change: `STATUS_GROUPS` di `:24-26` menjadi `label: 'Berlangsung'`, `label: 'Mendatang'`, `label: 'Selesai'`.
   - Preserve: `key`, `dot`, urutan grup, `StatusBadge` di kartu, legend, ringkasan, empty state, day popup.
   - Verify: heading grup di month panel (`:373`) dan day popup (`:606`) sama dengan badge di kartu dan legend.

## Scope

- Inherit: `CalendarView` month panel dan day popup memakai `STATUS_GROUPS`; `EventRailCard` dan `HighlightEventCard` memakai label lokal yang diubah.
- Verify: `/events` light/dark; keadaan ongoing, upcoming, past; filter aktif; area grouping; day popup.
- Exclude: dashboard admin, `/` landing (`CommunityUpcomingEvents`), `EventPublicDetailPage`, isi `StatusBadge`, prosa `:284`, label tanggal/countdown.

## Validation

- Product: pengunjung melihat satu nama untuk tiap state di hero, rail, dan kalender.
- Interface: `/events` pada 375px dan 1440px, light dan dark; buka month panel dan day popup; pastikan `StatusBadge` dan heading grup kompak.
- System: hanya label existing; tidak ada komponen/token baru; `StatusBadge` tidak berubah.
- Repository:
  - `npm run build` menghasilkan 0 error TypeScript dan Vite build selesai.
  - `NODE_ENV=test npx vitest run src/pages/__tests__/EventsLandingPage.export.test.tsx src/pages/__tests__/EventsLandingPage.poster.test.tsx src/components/ui/__tests__/StatusBadge.test.tsx` semua lulus.
  - `npm run dev` lalu buka `http://localhost:5173/events` untuk smoke visual.
  - Jangan mengubah tes atau aset verifikasi untuk meloloskan pemeriksaan. Tes yang disebut tidak mengassert label status yang diubah; jika ada yang gagal karena copy lama, hentikan dan laporkan.

## Stop conditions

- Berhenti jika `StatusBadge` ternyata perlu diubah untuk mencapai konsistensi; plan ini sengaja memakai label yang sudah ada.
- Berhenti jika produk menginginkan `Live` atau `Segera Hadir` sebagai vocabulary kanonis; itu keputusan produk berbeda.
- Berhenti jika perubahan menyentuh surface di luar `/events`.

## Design documentation

- Setelah diterima dan divalidasi: tambahkan satu baris di `DESIGN.md` bagian `Copy Style`: "Status labels on the public schedule use the `StatusBadge` vocabulary: `Berlangsung`, `Mendatang`, `Selesai`; do not use `Live` or `Segera Hadir` as status labels." Dokumen tujuan: `DESIGN.md`.
