# Audit hover CTA — keterbacaan label (light + dark)

**Lingkup:** 20 CTA solid berisi teks di 13 file (latar hover `--wf-accent-hover`) — 9 `<Button variant="ghost">`, 2 `<Button variant="default">`, 9 elemen non-button — diuji pada dua tema (terang + gelap): **58 state elemen** (elemen × tema), termasuk 4 state tambahan untuk 2 CTA yang baru diukur pada run ini.
**Tanggal:** 2026-11-13 · **Run:** ke-2 (setelah perbaikan `hover:text-[var(--wf-accent-ink)]!` pada CTA `Button variant="ghost"`), dilengkapi pengukuran 2 CTA yang sebelumnya di luar cakupan.
**Metode:** Playwright (Chromium headless, `@playwright/test` 1.61.1), dev server Vite `127.0.0.1:5199` (port khusus), viewport 1280×900 (sticky CTA mobile diukur pada 390×844), `reducedMotion: 'reduce'`. Sumber kebenaran: `getComputedStyle()` sebelum/sesudah hover pointer nyata (diverifikasi `el.matches(':hover')`), transisi ditunggu 430 ms. Rasio = formula WCAG 2.x (linearisasi sRGB), latar ber-alpha dikompositkan ke ancestor.
**Ambang:** WCAG AA teks normal **≥ 4.5:1** (semua label 12–16 px, bukan large text).

## Ringkasan run 2

| Metrik | Run 1 (sebelum perbaikan) | Run 2 final (sesudah perbaikan) |
|---|---|---|
| State elemen teraudit (elemen × tema) | 54 | 58 |
| PASS | 34 | **58** |
| FAIL | 20 | **0** |
| Tidak terverifikasi | 0 | 0 |
| Elemen gagal (unik) | 10 | 0 |
| CTA terukur | — | **20/20** |
| Kontrol negatif "Kalender lengkap" | 2/2 PASS | 2/2 PASS |

Run 2 final = 54 state awal + 4 state tambahan dari 2 CTA yang sebelumnya belum pernah diukur
(submit form detail pameran dan sticky CTA mobile).

**Semua 58 state PASS.** Perbaikan menambahkan kembali `hover:text-[var(--wf-accent-ink)]!`
(important) sehingga `hover:text-foreground` dari varian `ghost` tidak lagi menimpa warna label:
label tetap `rgb(255, 255, 255)` (light) / `rgb(6, 18, 15)` (dark) di atas `--wf-accent-hover`
`rgb(0, 95, 94)` / `rgb(102, 207, 205)` → **7.50:1** dan **10.33:1**.

## Diff vs run 1

| Elemen (ghost, `data-variant="ghost"`) | Run 1 light | Run 1 dark | Run 2 light | Run 2 dark |
|---|---|---|---|---|
| `/events` — Lihat detail event (kartu event) | 2.21:1 FAIL | 1.63:1 FAIL | 7.50:1 PASS | 10.33:1 PASS |
| `/events` error — Coba lagi (3 elemen) | 2.21:1 FAIL | 1.63:1 FAIL | 7.50:1 PASS | 10.33:1 PASS |
| `/ajukan-event` — Kirim pengajuan | 2.21:1 FAIL | 1.63:1 FAIL | 7.50:1 PASS | 10.33:1 PASS |
| `/ajukan-event` sukses — Ajukan event lain | 2.21:1 FAIL | 1.63:1 FAIL | 7.50:1 PASS | 10.33:1 PASS |
| `/sponsor` — Kirim minat dukungan | 2.21:1 FAIL | 1.63:1 FAIL | 7.50:1 PASS | 10.33:1 PASS |
| `/kolaborasi-tenant` — Kirim pengajuan | 2.21:1 FAIL | 1.63:1 FAIL | 7.50:1 PASS | 10.33:1 PASS |
| `/partisipasi-tenant` — Kirim pengajuan | 2.21:1 FAIL | 1.63:1 FAIL | 7.50:1 PASS | 10.33:1 PASS |
| `/halaman-tidak-ada` — Kembali ke beranda | 2.21:1 FAIL | 1.63:1 FAIL | 7.50:1 PASS | 10.33:1 PASS |

10 elemen (20 state) berubah FAIL → PASS. 24 state PASS lain tidak berubah angkanya, dan 4 state
tambahan (2 CTA yang baru diukur) juga PASS
(7.50:1 light / 10.33:1 dark untuk CTA solid; `.wf-btn`/link non-CTA tidak termasuk cakupan).

## Peta kategori lokasi

| # | Kategori | Rute | File sumber | CTA | Varian (ghost / default / non-button) | State teraudit | PASS | FAIL |
|---|---|---|---|---|---|---|---|---|
| 1 | Katalog event publik | `/events`, `/events/:id` | `EventsLandingPage.tsx`, `EventPhotoGallery.tsx` | 4 | 2 / 1 / 1 | 14 | 14 | 0 |
| 2 | Pengajuan & pameran | `/ajukan-event`, `/pameran`, `/pameran/:id` | `EventSubmissionPage.tsx`, `ExhibitionsLandingPage.tsx` | 4 | 3 / 0 / 1 | 10 | 10 | 0 |
| 3 | Sponsorship | `/sponsor` | `SponsorLandingPage.tsx` | 2 | 1 / 0 / 1 | 4 | 4 | 0 |
| 4 | Komunitas & pendaftaran | `/`, `/daftar` | `CommunityHero.tsx`, `CommunityBenefits.tsx`, `CommunityUpcomingEvents.tsx`, `CommunityRegistrationForm.tsx`, `CommunityLandingPage.tsx` | 7 | 0 / 1 / 6 | 24 | 24 | 0 |
| 5 | Kolaborasi tenant | `/kolaborasi-tenant`, `/partisipasi-tenant` | `TenantCollaborationPage.tsx`, `TenantParticipationPage.tsx` | 2 | 2 / 0 / 0 | 4 | 4 | 0 |
| 6 | Halaman status | `/halaman-tidak-ada` | `NotFoundPage.tsx` | 1 | 1 / 0 / 0 | 2 | 2 | 0 |
| | **Total** | | **13 file** | **20** | **9 / 2 / 9** | **58** | **58** | **0** |

## Kategori 1 — Katalog event publik

Rute `/events` (daftar + state error) dan `/events/:id` (state error galeri).

### `/events` — normal

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Lihat detail event | `<button>` | `ghost` | `src/pages/EventsLandingPage.tsx:376` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | light | Daftar event | `<a>` | — (bukan shadcn Button) | `src/pages/EventsLandingPage.tsx:1135` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 3 | dark | Lihat detail event | `<button>` | `ghost` | `src/pages/EventsLandingPage.tsx:376` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 4 | dark | Daftar event | `<a>` | — (bukan shadcn Button) | `src/pages/EventsLandingPage.tsx:1135` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

### `/events` — error state (fetch gagal)

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Coba lagi | `<button>` | `ghost` | `src/pages/EventsLandingPage.tsx:505` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | light | Coba lagi | `<button>` | `ghost` | `src/pages/EventsLandingPage.tsx:505` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 3 | light | Coba lagi | `<button>` | `ghost` | `src/pages/EventsLandingPage.tsx:505` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 4 | light | Daftar event | `<a>` | — (bukan shadcn Button) | `src/pages/EventsLandingPage.tsx:1135` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 5 | dark | Coba lagi | `<button>` | `ghost` | `src/pages/EventsLandingPage.tsx:505` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 6 | dark | Coba lagi | `<button>` | `ghost` | `src/pages/EventsLandingPage.tsx:505` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 7 | dark | Coba lagi | `<button>` | `ghost` | `src/pages/EventsLandingPage.tsx:505` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 8 | dark | Daftar event | `<a>` | — (bukan shadcn Button) | `src/pages/EventsLandingPage.tsx:1135` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

### `/events/:id` — error state galeri

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Coba lagi | `<button>` | `default` | `src/components/events/EventPhotoGallery.tsx:68` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | dark | Coba lagi | `<button>` | `default` | `src/components/events/EventPhotoGallery.tsx:68` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

Catatan lokasi kode:

- Tiga baris "Coba lagi" memakai baris kode yang sama (`EventsLandingPage.tsx:505`) karena tiga state error berbeda (daftar event, sorotan, kalender) memakai komponen retry yang sama.
- "Daftar event" di `EventsLandingPage.tsx:1135` dirender di dua state (normal dan error), jadi muncul di kedua tabel dengan baris kode yang sama.
- "Coba lagi" galeri hanya muncul di `/events/:id` saat `GET /api/v1/albums` gagal, bukan di `/events`.

## Kategori 2 — Pengajuan & pameran

Rute `/ajukan-event` (normal + state sukses) dan `/pameran`.

### `/ajukan-event` — normal

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Kirim pengajuan | `<button>` | `ghost` | `src/pages/EventSubmissionPage.tsx:404` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | dark | Kirim pengajuan | `<button>` | `ghost` | `src/pages/EventSubmissionPage.tsx:404` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

### `/ajukan-event` — state sukses

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Ajukan event lain | `<button>` | `ghost` | `src/pages/EventSubmissionPage.tsx:190` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | dark | Ajukan event lain | `<button>` | `ghost` | `src/pages/EventSubmissionPage.tsx:190` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

### `/pameran` — normal

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Ajukan kolaborasi | `<a>` | — (bukan shadcn Button) | `src/pages/ExhibitionsLandingPage.tsx:157` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | light | Lihat detail | `<a>` | — (bukan shadcn Button) | `src/pages/ExhibitionsLandingPage.tsx:157` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 3 | dark | Ajukan kolaborasi | `<a>` | — (bukan shadcn Button) | `src/pages/ExhibitionsLandingPage.tsx:157` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 4 | dark | Lihat detail | `<a>` | — (bukan shadcn Button) | `src/pages/ExhibitionsLandingPage.tsx:157` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

### `/pameran/:id` — normal (detail + form pengajuan)

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Kirim pengajuan | `<button>` | `ghost` | `src/pages/ExhibitionsLandingPage.tsx:296` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | dark | Kirim pengajuan | `<button>` | `ghost` | `src/pages/ExhibitionsLandingPage.tsx:296` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

Catatan lokasi kode:

- Dua baris `/pameran` memakai baris kode yang sama (`ExhibitionsLandingPage.tsx:157`): satu `<Link>` per kartu pameran, dirender dua kali untuk dua pameran pada data uji.
- `Kirim pengajuan` di `ExhibitionsLandingPage.tsx:296` hanya dirender di rute detail `/pameran/:id` (form pengajuan), bukan di `/pameran`; diukur di sana dengan mock `GET /api/v1/exhibitions/exh-1`. Elemen berada di dalam `<form>`.

## Kategori 3 — Sponsorship

Rute `/sponsor`.

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Saya tertarik mendukung event | `<a>` | — (bukan shadcn Button) | `src/pages/SponsorLandingPage.tsx:220` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | light | Kirim minat dukungan | `<button>` | `ghost` | `src/pages/SponsorLandingPage.tsx:375` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 3 | dark | Saya tertarik mendukung event | `<a>` | — (bukan shadcn Button) | `src/pages/SponsorLandingPage.tsx:220` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 4 | dark | Kirim minat dukungan | `<button>` | `ghost` | `src/pages/SponsorLandingPage.tsx:375` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

## Kategori 4 — Komunitas & pendaftaran

Rute `/` (data terisi dan data kosong) dan `/daftar`.

### `/` — normal

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Daftar event | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityHero.tsx:155` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | light | Lihat detail event | `<span>` | — (bukan shadcn Button) | `src/components/community/CommunityUpcomingEvents.tsx:203` | `group-hover` kartu | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 3 | light | Lihat peluang sponsor | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityBenefits.tsx:56` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 4 | light | Ajukan event | `<a>` | — (bukan shadcn Button) | `src/pages/CommunityLandingPage.tsx:146` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 5 | light | Kirim pendaftaran | `<button>` | `default` | `src/components/community/CommunityRegistrationForm.tsx:496` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 6 | dark | Daftar event | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityHero.tsx:155` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 7 | dark | Lihat detail event | `<span>` | — (bukan shadcn Button) | `src/components/community/CommunityUpcomingEvents.tsx:203` | `group-hover` kartu | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 8 | dark | Lihat peluang sponsor | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityBenefits.tsx:56` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 9 | dark | Ajukan event | `<a>` | — (bukan shadcn Button) | `src/pages/CommunityLandingPage.tsx:146` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 10 | dark | Kirim pendaftaran | `<button>` | `default` | `src/components/community/CommunityRegistrationForm.tsx:496` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

### `/` — data kosong

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Daftar event | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityHero.tsx:155` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | light | Hubungi kami | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityUpcomingEvents.tsx:22` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 3 | light | Lihat peluang sponsor | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityBenefits.tsx:56` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 4 | light | Ajukan event | `<a>` | — (bukan shadcn Button) | `src/pages/CommunityLandingPage.tsx:146` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 5 | light | Kirim pendaftaran | `<button>` | `default` | `src/components/community/CommunityRegistrationForm.tsx:496` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 6 | dark | Daftar event | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityHero.tsx:155` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 7 | dark | Hubungi kami | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityUpcomingEvents.tsx:22` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 8 | dark | Lihat peluang sponsor | `<a>` | — (bukan shadcn Button) | `src/components/community/CommunityBenefits.tsx:56` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 9 | dark | Ajukan event | `<a>` | — (bukan shadcn Button) | `src/pages/CommunityLandingPage.tsx:146` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |
| 10 | dark | Kirim pendaftaran | `<button>` | `default` | `src/components/community/CommunityRegistrationForm.tsx:496` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

### `/daftar` — normal

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Kirim pendaftaran | `<button>` | `default` | `src/components/community/CommunityRegistrationForm.tsx:496` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | dark | Kirim pendaftaran | `<button>` | `default` | `src/components/community/CommunityRegistrationForm.tsx:496` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

### `/` — mobile 390×844 (sticky CTA)

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Daftar event | `<a>` | — (bukan shadcn Button) | `src/pages/CommunityLandingPage.tsx:161` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | dark | Daftar event | `<a>` | — (bukan shadcn Button) | `src/pages/CommunityLandingPage.tsx:161` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

Catatan lokasi kode:

- `CommunityRegistrationForm.tsx:496` muncul di tiga state (`/` terisi, `/` kosong, `/daftar`) karena komponen form dirender di beranda dan di rute `/daftar`. Saat diaudit, elemen berada di dalam `<form>`, terlihat, dan tidak `disabled`.
- `CommunityLandingPage.tsx:161` adalah sticky bar `sm:hidden` yang muncul setelah sentinel terlewati; diukur pada viewport 390×844 (scroll melewati sentinel) karena pada 1280 px elemen ini tidak dirender.

## Kategori 5 — Kolaborasi tenant

Rute `/kolaborasi-tenant` dan `/partisipasi-tenant`.

### `/kolaborasi-tenant` — normal

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Kirim pengajuan | `<button>` | `ghost` | `src/pages/TenantCollaborationPage.tsx:613` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | dark | Kirim pengajuan | `<button>` | `ghost` | `src/pages/TenantCollaborationPage.tsx:613` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

### `/partisipasi-tenant` — normal

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Kirim pengajuan | `<button>` | `ghost` | `src/pages/TenantParticipationPage.tsx:924` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | dark | Kirim pengajuan | `<button>` | `ghost` | `src/pages/TenantParticipationPage.tsx:924` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

Catatan lokasi kode: tombol `/partisipasi-tenant` ber-`disabled` saat daftar event kosong (pointer-events: none); state hover terukur setelah `GET /api/v1/tenant-participations/events` di-mock sehingga tombol aktif.

## Kategori 6 — Halaman status

Rute `/halaman-tidak-ada`.

| # | Tema | Label mikro | Tag | `data-variant` | Lokasi kode | Pemicu hover | `color` (hover) | `backgroundColor` (hover) | Rasio | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | light | Kembali ke beranda | `<button>` | `ghost` | `src/pages/NotFoundPage.tsx:22` | `:hover` elemen | `rgb(255, 255, 255)` | `rgb(0, 95, 94)` | **7.5:1** | PASS |
| 2 | dark | Kembali ke beranda | `<button>` | `ghost` | `src/pages/NotFoundPage.tsx:22` | `:hover` elemen | `rgb(6, 18, 15)` | `rgb(102, 207, 205)` | **10.33:1** | PASS |

## Kontrol negatif

Link "Kalender lengkap" memakai `hover:bg-[var(--wf-page)]`, bukan `--wf-accent-hover`. Elemen ini tidak ikut diubah; hover hanya mengubah latar ke `--wf-page`, warna teks tetap `--wf-ink`.

| Tema | `color` (hover) | `backgroundColor` (hover) | Latar berubah saat hover | Rasio | Verdict |
|---|---|---|---|---|---|
| light | `rgb(22, 33, 27)` | `rgb(248, 247, 240)` | ya (ke `--wf-page`) | **15.43:1** | PASS |
| dark | `rgb(238, 242, 234)` | `rgb(14, 22, 18)` | ya (ke `--wf-page`) | **16.22:1** | PASS |

Kesimpulan: tetap kontras (15.43:1 light, 16.22:1 dark) dan tidak terpengaruh penggantian `hover:bg` pada CTA solid.

## Varian shadcn dan mengapa tinta hover bersyarat

`Button` shadcn membawa kelas varian yang ikut berlaku saat hover:

- `variant="ghost"` → `hover:bg-muted hover:text-foreground` (menimpa warna teks).
- `variant="default"` → `bg-primary text-primary-foreground hover:bg-primary/80` (hanya latar, tidak menimpa warna teks saat hover).

`cn()` di repo ini **bukan** clsx + tailwind-merge, melainkan resolver prefix-based di `src/utils/cn.ts`. `conflictKey()` mengambil prefix sebelum tanda hubung terakhir pada segmen terakhir kelas:

- `conflictKey('hover:text-foreground')` = `hover:text`
- `conflictKey('hover:text-[var(--wf-accent-ink)]!')` = `hover:text-[var(--wf-accent` (dipotong di tanda hubung terakhir segmen)

Kuncinya **berbeda**, jadi keduanya dipertahankan berdampingan dan pemenangnya ditentukan urutan aturan CSS hasil build — bukan urutan kelas di atribut. Saat hover, `hover:text-foreground` menang (regresi run 1: 2.21:1 light / 1.63:1 dark pada `--wf-accent-hover`). Karena itu perbaikan memakai `!` (important): important mengalahkan urutan CSS, sehingga tinta label tetap `--wf-accent-ink`.

Untuk latar berlaku mekanisme yang sama: `hover:bg-primary/80` (varian `default`) berkunci `hover:bg`, sedangkan `hover:bg-[var(--wf-accent-hover)]!` berkunci `hover:bg-[var(--wf-accent`. Kuncinya berbeda, jadi keduanya bertahan dan `!` yang memutuskan — bukan `cn()`. Varian `default` juga tidak membawa aturan warna teks hover, jadi labelnya tidak perlu tambahan `hover:text-…!`.

## Tidak terverifikasi

Tidak ada. 58 state terukur, 58 PASS, dan **20/20 CTA terukur** — termasuk `ExhibitionsLandingPage.tsx:296` (rute `/pameran/:id`, mock `GET /api/v1/exhibitions/exh-1`) dan `CommunityLandingPage.tsx:161` (viewport 390×844).

## Catatan cakupan

- `/events` "Coba lagi" berasal dari state error daftar/kalender (`EventsLandingPage.tsx`); retry galeri (`EventPhotoGallery.tsx`) hanya ada di `/events/:id` dan diaudit di sana.
- Dua CTA yang sebelumnya di luar cakupan diukur pada kondisi mount aslinya: submit form pameran `ExhibitionsLandingPage.tsx:296` di `/pameran/:id`, dan sticky CTA mobile `CommunityLandingPage.tsx:161` pada viewport 390×844 setelah sentinel terlewati.
- "Ajukan event lain" dicapai dengan submit form ke mock `POST /api/v1/drafts` (state sukses nyata, tanpa ubah source).
- `/partisipasi-tenant`: tombol `disabled` saat daftar event kosong; dengan `GET /api/v1/tenant-participations/events` di-mock tombol aktif.
- Data REST di-mock via `page.route` dengan payload bentuk nyata; `/api/v1/albums` sengaja gagal agar state error galeri muncul.
- Tidak ada file `src/**` yang diubah; tidak ada commit.

Tidak ada page error selama audit.
