# `/events`: literal radius ditulis ulang ke token radius bernama

Written against: 9f6091b (+ working tree 2026-11-06: `EventsLandingPage.tsx`, `CHANGELOG.md`)
Status: **diterapkan** 2026-11-06 atas permintaan user ("oke fix semua").

## Evidence chain

- Surface: seluruh kelas radius di `src/pages/EventsLandingPage.tsx` — kartu highlight `:179`, kartu rail `:335`, lalu sepuluh panel skeleton/error/empty pada `:683`, `:685`, `:695`, `:769`, `:773`, `:799`, `:882`, `:910`, `:912`.
- Problem: file memakai 11 literal `rounded-[2rem]` / `rounded-[1.5rem]`, padahal kedua nilai itu adalah token bernama dan `DESIGN.md` memerintahkan kepatuhannya. Akibatnya nilai nominal radius tidak bisa ditelusuri lewat token, dan tabel token di `DESIGN.md:94-107` kehilangan satu konsumen lamanya.
- Design evidence: `DESIGN.md:94-107` — tabel Radius: `--radius-card-lg` = 1.5rem ("Admin panels / larger product cards"), `--radius-campaign-card` = 2rem ("Landing / campaign cards only"); `DESIGN.md:96` — "Prefer CSS vars (or utilities that wrap them) over hard-coded `rounded-[2rem]` / raw rgba". Token terdefinisi di `src/styles/tokens.css:51-53`. Utilitas `.ui-campaign-card` (`utilities.css:68`) sudah membuktikan pola `border-radius: var(--radius-campaign-card)` ada di sistem.
- Owner: `src/pages/EventsLandingPage.tsx` (pemakai kelas utilitas Tailwind; token di `tokens.css` tidak diubah).
- Scope and affected surfaces: satu file `EventsLandingPage.tsx`. Tidak menyentuh `tokens.css`, `theme.css`, `utilities.css`, komponen lain (termasuk `CommunityHero.tsx` yang memakai `rounded-[var(--radius-campaign-card)]` — itu sudah token).
- Reconcile dengan plan lain: `design-plans/2026-10-25-events-rail-card-shadow.md` menerapkan larangan shadow cool-slate di kartu rail yang sama; plan ini hanya menyentuh kelas radiusnya, tidak beririsan properti.
- Uncertainty: tidak ada — ini kepatuhan value-identik, bukan keputusan visual.

## Design decision

Tulis ulang literal ke token bernama **dengan pemetaan dari nilai ke token yang berlaku di tabel `DESIGN.md`**: `rounded-[2rem]` → `rounded-[var(--radius-campaign-card)]`, `rounded-[1.5rem]` → `rounded-[var(--radius-card-lg)]`. Dua tier kartu dipertahankan apa adanya (kartu highlight + skeleton/full-bleed `#featured` memakai campaign radius; kartu rail + panel Error/Empty/Calendar memakai card-lg) karena tabel token menjelaskan kedua nilai itu dan tidak ada aturan yang menyeragamkannya.

## Reuse

- `--radius-campaign-card` dan `--radius-card-lg` (`src/styles/tokens.css:52-53`).
- Pola utilitarian: `rounded-[var(--radius-campaign-card)]` sudah dipakai `src/components/community/CommunityHero.tsx:172` — contoh yang sama, tanpa kelas baru.
- Tidak ada primitive baru, tidak ada perubahan token.

## Changes

1. `src/pages/EventsLandingPage.tsx` (11 kelas: `:179`, `:335`, `:683`, `:685`, `:695`, `:769`, `:773`, `:799`, `:882`, `:910`, `:912`)
   - Change: perbarui string `'rounded-[2rem]'` → `'rounded-[var(--radius-campaign-card)]'` dan `'rounded-[1.5rem]'` → `'rounded-[var(--radius-card-lg)]'`.
   - Preserve: tidak ada perubahan ukuran, spacing, shadow, atau nilai nominal lainnya.
   - Verify: hasil render border-radius tidak berubah — di browser card-lg menghitung 24 px dan campaign menghitung 32 px persis seperti sebelumnya.

## Scope

- Inherit: semua viewer `/events` (tidak ada perubahan terlihat).
- Verify: kedua tier radius tetap terbaca sesuai nilai lamanya di 375 / 768 / 1440 px, light dan dark.
- Exclude: `tokens.css`, `theme.css`, `utilities.css`, komponen di luar `EventsLandingPage.tsx`, dan pemakaian `rounded-[1.5rem]`/`rounded-[2rem]` di `MotionLabPage.tsx` (sandaran dev-only, jangan di-take-silently), `pdfExport` (di luar `src/`), dan literal di komponen lain yang tidak dipantau plan ini.

## Validation

- Product: halaman `/events` render identik.
- Interface: `/events` di 375 / 768 / 1440 px, light dan dark; kartu highlight, kartu rail, panel Error/Empty/Section, dan kalender.
- System: tidak ada literal radius baru di file; `grep -c 'rounded-\[1\|rounded-\[2' EventsLandingPage.tsx` → 0.
- Repository:
  - `node ./node_modules/typescript/bin/tsc --noEmit` → 0 error.
  - `node ./node_modules/vite/bin/vite.js build` → hijau, dan CSS hasil build memuat rule `.rounded-\[var\(--radius-campaign-card\)\]{border-radius:var(--radius-campaign-card)}` dan pasangan `--radius-card-lg`.
  - `NODE_ENV=test node ./node_modules/vitest/vitest.mjs run src/pages/__tests__/EventsLandingPage.export.test.tsx src/pages/__tests__/EventsLandingPage.poster.test.tsx src/pages/__tests__/EventsLandingPage.recurring.test.tsx src/components/nav --maxWorkers=2` → **6 file / 62 test** lulus.

## Stop conditions

- Berhenti bila `--radius-campaign-card` atau `--radius-card-lg` ternyata tidak resolve di build (akan menghasilkan radius 0 dan itu terlihat langsung di smoke).
- Berhenti bila editorial menginginkan semua kartu rail memakai radius kampanye atau sebaliknya — itu keputusan desain baru, bukan bagian plan ini.

## Design documentation

- Setelah diterapkan: entri `CHANGELOG.md` `[Unreleased] → Changed` (2026-11-06) memuat keduanya. `DESIGN.md` §Token Reference sudah menjelaskan `rounded-[2rem]` setara `--radius-campaign-card` (`:107`), jadi tidak perlu update dokumen.
