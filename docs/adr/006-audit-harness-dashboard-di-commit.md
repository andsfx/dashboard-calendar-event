# Harness audit dashboard di-commit, bukan gitignored

## Status

accepted

## Konteks

Konvensi repo menaruh spec audit ad-hoc di `e2e/__*` yang **gitignored**
(`.gitignore:42`), mis. `__audit-admin.spec.ts` dan `__admin-chrome-port.spec.ts`.
Spec itu berguna untuk sesi audit tunggal, tetapi baseline-nya tidak dapat
direproduksi setelah clone atau di CI — hasil audit hilang bersama file-nya.

Audit UI/UX dashboard 2026-10-04 berfungsi sebagai **baseline untuk redesign**
dan akan dipakai lagi setelah remediasi, jadi temuan harus bisa diukur ulang
oleh orang lain, bukan hanya oleh sesi yang menulisnya.

## Keputusan

Harness audit dashboard ditulis sebagai spec **ter-track** di
`e2e/audit-dashboard.spec.ts`, dengan data mock + pemasangan di
`e2e/audit-dashboard.config.ts` dan primitif pengukuran di
`e2e/audit-dashboard.measure.ts`; config Playwright-nya `playwright.audit.config.ts`
(port sendiri 5175, tanpa reuse server) dan script `npm run test:audit` /
`npm run test:audit:a11y`. Strategi mock sama dengan `__audit-admin.spec.ts`
(REST `/api/v1` di-intercept, tanpa backend/seed). Spec `__*` lama tetap
gitignored dan tidak diubah.

## Alternatif yang ditolak

- **Perluas `e2e/__audit-admin.spec.ts` yang sudah ada** — paling cepat, tetapi
  baseline tetap tidak reproducible dari repo dan tidak bisa jadi gate CI.
- **Live dev + seed Postgres nyata** — paling setia, tetapi menambah
  ketergantungan DB/VPS dan risiko flaky yang tidak sepadan untuk audit visual.

## Konsekuensi

- Baseline audit bisa dijalankan ulang & di-diff (before/after) oleh siapa pun.
- Gate a11y yang ada (`npm run test:a11y`) **tetap publik-only**; axe untuk
  rute admin hidup di harness dashboard ini dan dilaporkan terpisah. Jangan
  mengklaim `test:a11y` sebagai gate admin.
- Dark mode disemai lewat `localStorage['theme'] = 'dark'` (kunci nyata yang
  dibaca `src/App.tsx`), bukan `mmb-dark-mode`.
