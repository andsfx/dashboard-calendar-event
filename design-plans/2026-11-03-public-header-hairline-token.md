# Hairline header publik memakai token border warm, bukan slate dingin

Written against: e9792f8
Status: plan only. Tidak ada file `src/**` yang dibuat atau diubah oleh plan ini.

## Evidence chain

- Surface: `<header>` `src/components/nav/PublicSiteHeader.tsx:91`, garis `border-b` 1 px yang tampil di 18 file halaman di `src/pages/` yang memakai header bersama.
- Problem: kelas `ui-dashboard-chrome` menetapkan `border-color: rgba(15, 23, 42, 0.06)` — slate dingin — dan nilai itulah yang dipakai `border-b` pada header, bukan token border hangat. Ini satu-satunya literal `rgba(15, 23, 42, …)` yang tersisa di `src/styles/*.css`.
- Design evidence: `DESIGN.md:134` — "Shadow ink is warm (`rgba(22, 33, 27, …)`), matching `--brand-ink`. Do not use cool slate (`rgba(15, 23, 42, …)`) on campaign surfaces". `DESIGN.md:126-132` menetapkan `--border-subtle` `rgba(22, 33, 27, 0.06)` sebagai "Default card/panel border", didefinisikan di `src/styles/tokens.css:67`. Header publik adalah campaign surface (`DESIGN.md:10`).
- Owner: `src/styles/utilities.css:135-139`, kelas `.ui-dashboard-chrome`. Warna border adalah milik kelas itu; pemakainya hanya menambahkan `border-b`.
- Scope and affected surfaces: tiga konsumen kelas — `src/components/nav/PublicSiteHeader.tsx:91` (semua file halaman pemakai header), `src/components/ui/Navbar.tsx:57` (chrome `DashboardShell`), `src/pages/AdminLoginPage.tsx:47` (login admin). Hanya aturan light yang berubah; override dark `utilities.css:141-144` (`rgb(74 85 76 / 0.5)`, warm) tidak disentuh.
- Reconcile dengan plan yang ada: `design-plans/2026-10-25-public-site-header.md` § b.7 mengutip nama kelas ini pada header (`utilities.css:135`) dan § b.6 mengukur kontras teks di atas komposit latar kelas itu; nama kelas, latar, dan `backdrop-filter` tidak berubah, jadi kedua bagian tetap berlaku. `design-plans/2026-10-25-events-rail-card-shadow.md` menerapkan larangan DESIGN.md yang sama pada shadow kartu di `/events` — surface berbeda, tidak beririsan.
- Uncertainty: tidak ada. Alpha dan lebar garis tetap 0,06 / 1 px; yang berubah hanya hue, dari navy ke ink hangat.

## Design decision

Ganti literal cool slate di `.ui-dashboard-chrome` dengan token border yang sudah terdokumentasi sebagai default panel. Perbaikan ditaruh di pemilik warna, bukan ditambal di konsumen, sehingga satu baris menghapus pelanggaran untuk header publik sekaligus dua pemakai admin tanpa menambah kelas baru. Dampak di permukaan admin hanya pergeseran hue pada hairline 6% — struktur, alpha, dan latar identik.

## Reuse

- `--border-subtle` (`src/styles/tokens.css:67`; `rgba(22, 33, 27, 0.06)`), token yang sama dengan baris `--border-subtle` di `DESIGN.md:132`.
- Exemplar pemakaian sebagai warna border: `src/pages/DocsPage.tsx:143` dan `src/components/community/CommunityContact.tsx:52` (`border border-[var(--border-subtle)]`).
- Tidak ada primitive baru, tidak ada kelas baru, tidak ada perubahan token.

## Changes

1. `src/styles/utilities.css`
   - Change: pada `.ui-dashboard-chrome` (`:136`), ganti `border-color: rgba(15, 23, 42, 0.06);` menjadi `border-color: var(--border-subtle);`.
   - Preserve: `background: color-mix(in srgb, var(--brand-card-light) 88%, transparent);` (`:137`) dan `backdrop-filter: blur(12px);` (`:138`); seluruh blok `.dark .ui-dashboard-chrome` (`:141-144`); nama kelas dan pemakainya.
   - Verify: di dev server, `getComputedStyle(document.querySelector('header')).borderBottomColor` pada halaman publik mana pun menghasilkan `rgba(22, 33, 27, 0.06)`, bukan `rgba(15, 23, 42, 0.06)`.

## Scope

- Inherit: `PublicSiteHeader` (18 file halaman di `src/pages/`), `Navbar` di `DashboardShell`, `AdminLoginPage`.
- Verify: hairline header publik, nav dashboard, dan login admin tetap terlihat dengan ketebalan dan opasitas yang sama; latar translusen dan `backdrop-filter` tetap bekerja saat halaman digulir (header `sticky top-0`).
- Exclude: aturan `utilities.css` lain, token, `DESIGN.md`, `AGENTS.md`, dan literal di file `src/**` lain. Baris `:136` adalah satu-satunya sisa `rgba(15, 23, 42, …)` di `src/styles/*.css`; jangan memperluas ke literal lain tanpa temuan terpisah.

## Validation

- Product: hairline di bawah header publik bernuansa ink hangat yang sama dengan border kartu di `DocsPage`, bukan navy dingin.
- Interface: `/` dan `/events` pada 375 px dan 1440 px, light dan dark; `/dashboard` (nav `DashboardShell`); `/dashboard` login (`AdminLoginPage`) di light dan dark; gulir halaman untuk memastikan latar translusen + blur masih bekerja.
- System: hanya `--border-subtle` yang dipakai; tidak ada kelas atau token baru; tidak ada literal `rgba(15, 23, 42, …)` tersisa di `src/styles/*.css`.
- Repository:
  - `npm run build` → 0 error TypeScript, Vite selesai.
  - `NODE_ENV=test npx vitest run src/components/nav --maxWorkers=2` → `PublicSiteHeader.test.tsx`, `NavDropdown.test.tsx`, `ScrollToTop.test.tsx` lulus.
  - `grep -rn "15, *23, *42" src/styles` → tidak ada hasil.
  - jsdom tidak menerapkan CSS, jadi tidak ada tes unit yang bisa membuktikan warna ini; buktinya `getComputedStyle` di browser seperti pada langkah Verify. Jangan menambah tes yang mengunci string CSS, dan jangan mengubah tes atau aset verifikasi untuk meloloskan pemeriksaan.

## Stop conditions

- Berhenti jika `--border-subtle` tidak resolve saat runtime (mis. karena urutan impor `src/index.css`), karena hasilnya border transparan dan bukan sekadar ganti hue.
- Berhenti jika perubahan ternyata memengaruhi properti selain `border-color` pada ketiga konsumen, atau jika ada konsumen keempat yang muncul.
- Berhenti jika produk ingin admin chrome tetap memakai slate dingin; dalam kasus itu jangan ubah kelas bersama — ajukan kelas border khusus campaign sebagai keputusan terpisah.

## Design documentation

- Setelah diterima dan divalidasi: tidak ada catatan baru yang diperlukan. `DESIGN.md:126-134` sudah memuat token border dan larangan cool slate; plan ini menghapus satu-satunya penyimpangan yang tersisa di `src/styles/*.css`.
