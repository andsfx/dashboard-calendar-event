# Dashboard Calendar Event — Metropolitan Mall Bekasi

Aplikasi dashboard untuk mengelola, memantau, dan mempublikasikan jadwal event di **Metropolitan Mall Bekasi**, lengkap dengan **Community Hub** publik, direktori komunitas & tenant, galeri, survey, dan generator surat.

> SPA (React 19 + Vite) di Vercel → REST API (Express + Postgres 16) di VPS. Media di Cloudflare R2.

---

## Daftar Isi

- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Fitur](#fitur)
- [Cara Menjalankan](#cara-menjalankan)
- [Testing](#testing)
- [Konfigurasi](#konfigurasi)
- [Struktur Folder](#struktur-folder)
- [Domain docs](#domain-docs)
- [Demo](#demo)
- [Lisensi](#lisensi)

---

## Screenshots

### Community Hub (Landing)

| Hero | Jadwal Terdekat |
|---|---|
| ![Community Hub Hero](./public/screenshots/landing-hero.png) | ![Upcoming Events](./public/screenshots/landing-upcoming-events.png) |

#### Foto Area Event — Lightbox Galeri

Kartu area bisa diklik untuk membuka lightbox galeri foto (navigasi prev/next, tutup dengan `Esc`).

![Foto Area Lightbox](./public/screenshots/landing-foto-area-lightbox.png)

### Halaman Publik

| Jadwal Event (`/events`) | Detail Event (`/events/:id`) |
|---|---|
| ![Jadwal Event](./public/screenshots/public-events.png) | ![Detail Event](./public/screenshots/public-event-detail.png) |

| Galeri (`/gallery`) | Direktori Komunitas (`/community`) |
|---|---|
| ![Galeri](./public/screenshots/public-gallery.png) | ![Komunitas](./public/screenshots/public-community.png) |

| Direktori Tenant (`/tenants`) | Pameran & Aktivasi (`/pameran`) |
|---|---|
| ![Tenant](./public/screenshots/public-tenants.png) | ![Pameran](./public/screenshots/public-pameran.png) |

| Berita (`/news`) | Sponsorship (`/sponsor`) |
|---|---|
| ![Berita](./public/screenshots/public-news.png) | ![Sponsor](./public/screenshots/public-sponsor.png) |

| Pendaftaran Komunitas (`/daftar`) | Pengajuan Event (`/ajukan-event`) |
|---|---|
| ![Daftar](./public/screenshots/public-register.png) | ![Ajukan Event](./public/screenshots/public-ajukan-event.png) |

| Dokumentasi (`/docs`) | |
|---|---|
| ![Dokumentasi](./public/screenshots/public-docs.png) | |

### Survey & Evaluasi (Publik)

| Survey Kepuasan (`/survey/:eventId`) | Evaluasi Tenant — Pilih Event (`/tenant-survey`) |
|---|---|
| ![Survey Kepuasan](./public/screenshots/public-survey-form.png) | ![Evaluasi Tenant Picker](./public/screenshots/public-tenant-survey-picker.png) |

| Form Evaluasi Tenant (`/tenant-survey/:eventId`) | |
|---|---|
| ![Form Evaluasi Tenant](./public/screenshots/public-tenant-survey-form.png) | |

### Dashboard Admin

#### Pusat Komando & Analitik

| Pusat Komando | Analitik |
|---|---|
| ![Pusat Komando](./public/screenshots/dashboard-command-center.png) | ![Analitik](./public/screenshots/dashboard-analytics.png) |

#### Jadwal Event — 4 Mode Tampilan

| Tabel + Pencarian/Filter | Kalender Bulanan |
|---|---|
| ![Tabel & Filter](./public/screenshots/dashboard-search-filter.png) | ![Kalender](./public/screenshots/dashboard-calendar.png) |

| Kanban (Berlangsung / Mendatang / Selesai) | Timeline |
|---|---|
| ![Kanban](./public/screenshots/dashboard-kanban.png) | ![Timeline](./public/screenshots/dashboard-timeline-content.png) |

#### Kelola Event

| Antrian Draft | Tema Tahunan |
|---|---|
| ![Draft](./public/screenshots/dashboard-drafts.png) | ![Tema Tahunan](./public/screenshots/dashboard-themes.png) |

| Pameran & Aktivasi | |
|---|---|
| ![Pameran Admin](./public/screenshots/dashboard-exhibitions.png) | |

#### Interaksi

| Pendaftaran Community | Survey Kepuasan |
|---|---|
| ![Pendaftaran](./public/screenshots/dashboard-registrations.png) | ![Survey](./public/screenshots/dashboard-survey.png) |

| Evaluasi Tenant | Hasil Evaluasi Tenant |
|---|---|
| ![Evaluasi Tenant](./public/screenshots/dashboard-tenant-surveys.png) | ![Hasil Evaluasi Tenant](./public/screenshots/dashboard-tenant-survey-results.png) |

#### Sistem

| Manajemen Pengguna | Log Aktivitas |
|---|---|
| ![Pengguna](./public/screenshots/dashboard-users.png) | ![Log Aktivitas](./public/screenshots/dashboard-activity-log.png) |

#### Konten

| Halaman Landing | Galeri Album |
|---|---|
| ![Halaman Landing](./public/screenshots/dashboard-content-landing.png) | ![Galeri Admin](./public/screenshots/dashboard-gallery-admin.png) |

| Foto Area Event | Buat Surat |
|---|---|
| ![Foto Area](./public/screenshots/dashboard-foto-area.png) | ![Buat Surat](./public/screenshots/dashboard-letters.png) |

| Berita | Sponsorship |
|---|---|
| ![Berita Admin](./public/screenshots/dashboard-news-admin.png) | ![Sponsorship Admin](./public/screenshots/dashboard-sponsorship.png) |

---

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 6** — build tool
- **Tailwind CSS v4** — styling
- **Material Web 3** (`@material/web`) — komponen UI dashboard admin (wrapper bertipe di `src/components/md/`); permukaan publik tetap Tailwind
- **React Router v7** — routing (route lazy per halaman)
- **Lucide React** — ikon
- **date-fns** — manipulasi tanggal
- **GSAP** — animasi hero & reveal scroll (lazy chunk)
- **jsPDF + jspdf-autotable** — generator PDF (jadwal & surat)
- **qr-creator** — QR code (link survey)
- **Express + pg + Postgres 16** — backend REST di VPS (Opsi B; Supabase sudah dilepas total — lihat [ADR 005](./docs/adr/005-vps-postgres-lepas-supabase.md))
- **bcrypt + jose (JWT)** — autentikasi (cookie HttpOnly)
- **Cloudflare R2** — media (foto/proposal)
- **@vercel/analytics** + **@vercel/speed-insights** — analytics
- **Vitest** + **Testing Library** + **Playwright (incl. axe-core)** — unit & e2e/a11y

---

## Fitur

### Community Hub (Publik)

- **Landing** dengan hero beranimasi, jadwal terdekat, section venue/fasilitas, dan alur pendaftaran 4 langkah.
- **Foto Area Event** — kartu area (Panggung, Lorong, Atrium, Parkir) bisa diklik → **lightbox galeri foto** (prev/next, `Esc` untuk tutup).
- **Jadwal publik** (`/events`) + **permalink detail event** (`/events/:id`) yang shareable + **unduh PDF jadwal**.
- **Direktori Komunitas** (`/community`) — EO/komunitas yang pernah membuat event, beserta statistik & aktivitas.
- **Direktori Tenant** (`/tenants`) — tenant di mall.
- **Pameran & Aktivasi** (`/pameran`) — jadwal pameran, tautan aktivasi, pengajuan brand/EO.
- **Berita** (`/news`) & **Sponsorship** (`/sponsor`).
- **Galeri** (`/gallery`) — album foto event.
- **Pendaftaran** (`/daftar`) — form pengajuan event komunitas + upload proposal.
- **Pengajuan Event** (`/ajukan-event`) — EO/komunitas mengajukan event (masuk antrian draft).
- **Kolaborasi Tenant** (`/kolaborasi-tenant`) — tenant mengajukan event kerja sama; tenant dipilih dari master tenant MID, lampiran proposal opsional (PDF/Word/PNG/JPEG).
- **Booth & Voucher Tenant** (`/partisipasi-tenant`) — tenant ikut memeriahkan event terjadwal dengan open booth dan/atau voucher; pemantauan status lewat kode pengajuan (`TPR-XXXXXX`), dan yang disetujui tampil di halaman detail event.
- **Dokumentasi** (`/docs`).

### Survey & Evaluasi

- **Survey Kepuasan** (`/survey/:eventId`) — responden **pengunjung** (public) / **organizer**; skala 1–10; tanpa login.
- **Evaluasi Tenant** (`/tenant-survey`) — self-assessment anonim tenant: picker event → form publik (`/tenant-survey/:eventId`) tanpa login; skala 1–5.
- **Hasil Evaluasi Tenant** (`/tenant-survey-results`) — agregat publik untuk admin & `tenant_relation`; panduan membaca hasil + export PDF.

### Dashboard Admin

#### View Modes

- **Tabel** — daftar event + pencarian/filter
- **Kalender** — bulanan (multi-day bars)
- **Kanban** — Berlangsung / Mendatang / Selesai (+ kolom Internal opsional)
- **Timeline** — garis waktu event + quarter timeline tahunan

#### Fitur Utama

- Filter status, kategori, prioritas, bulan + pencarian; **statistik** (total, berlangsung, mendatang, selesai).
- **Dark mode** (deteksi sistem) + toggle manual.
- **Auto-detect kategori** dari nama event.
- **Tema Tahunan** — payung visual timeline (rentang tanggal, nama, warna).
- **Pusat Komando** — papan triage: strip status antrian, register "Perlu tindakan", band "Hari ini di mall", dan direktori "Semua modul" (lihat [ADR 009](./docs/adr/009-pusat-komando-papan-triage.md)).
- **Insight Cerdas** (`/dashboard/insights`) — analisis otomatis dari data event & modul lain, dengan tombol tindak lanjut berfilter, saringan tingkat kepentingan, sembunyikan/pulihkan, dan "Salin ringkasan"; ringkasan AI opsional di atasnya.
- **Analitik** — tren bulanan, perbandingan tahun, kategori, model event, top lokasi, jam tersibuk.
- **Manajemen Pengguna** & **Log Aktivitas** (superadmin).

#### Kelola Event

- **Event** (jadwal resmi) + **Draft** (antrian pra-jadwal) — dua entitas; publish Draft → spawn Event.
- Status Event **dihitung dari tanggal** (bukan workflow manual) — lihat [ADR 002](./docs/adr/002-event-status-from-dates.md).
- Bentuk waktu: **single / multi-day / recurring** (`recurrenceGroupId`, hapus series terpisah dari hapus satu occurrence).
- **Pameran & Aktivasi** — kelola pameran, tautan aktivasi, pengajuan brand/EO.
- **Surat** — generator PDF → **GeneratedLetter** (Postgres VPS via REST); bukan Google Apps Script.

#### Interaksi

- **Pendaftaran komunitas** — list + detail, ubah status + `adminNote`; approve **tidak** auto-buat Draft (CTA manual "Buat Draft dari pendaftaran") — lihat [ADR 003](./docs/adr/003-registration-not-auto-draft.md).
- **Kolaborasi Tenant** — antrean pengajuan event kerja sama dari tenant: saringan status, kartu ringkas + detail yang bisa dibuka, catatan internal, dan koreksi isian per-field.
- **Partisipasi Tenant** — antrean open booth & voucher per event: status review (Menunggu/Dihubungi/Disetujui/Ditolak), koreksi isian tenant, serta **Kelola opsi** untuk mengatur pilihan dropdown form publik (skema/ukuran booth, jenis/format voucher).
- **Survey Kepuasan** — config per event (`is_active`, auto-activate), hasil & analytics.
- **Evaluasi Tenant** — submit/own (eo_tenant) + results/export (tenant_relation).

#### Konten

- **Halaman Landing** — editor konten landing.
- **Galeri Album** — CRUD album foto.
- **Foto Area Event** — CRUD area & foto (cover, urutan, aktif/nonaktif); yang aktif tampil di landing.
- **Buat Surat** — generator surat.
- **Berita** & **Sponsorship** — editor konten.

### Model Domain & Aturan

- **Event** bisa dikaitkan ke **organisasi terdaftar** (dropdown pencarian EO; nama organisasi terisi otomatis).
- **Area = master lokasi kanonis** (`event_areas`); Event → Area lewat `areaId` (opsional, `ON DELETE SET NULL`); tanpa `areaId` tetap tampil di bucket "Lokasi Lainnya".
- **Publish Draft**: buat Event baru, set `sourceDraftId`, set Draft `published=true` — Draft tetap di antrian sebagai arsip.
- **Kolaborasi Tenant** (`tenant_event_proposals`): pengajuan event kerja sama dari tenant — status `pending → contacted → approved / rejected`; menyetujui **tidak** membuat Event (ADR 003); tenant dipilih dari master tenant MID (`tenant_id`), isian manual ditandai kosong.
- **Partisipasi Tenant** (`tenant_participations`): pengajuan open booth/voucher pada event terjadwal — satu kode cek status `TPR-XXXXXX` per pengajuan, cutoff otomatis H-1 sebelum event mulai, dan daftar yang disetujui tampil tanpa PII di halaman detail event.
- **Multi-role**: `superadmin`, `admin`, `viewer`, `demo` (read-only penuh), `eo_tenant`, `tenant_relation` — capability matrix di [docs/SPEC.md](./docs/SPEC.md).

### Admin Mode

- Login **email + password** (backend VPS, bcrypt + JWT cookie HttpOnly).
- **Demo mode** — akun peragaan read-only; seluruh permukaan dashboard terlihat, semua mutasi ditegakkan backend (`READ_ONLY_ACTIONS`).

---

## Cara Menjalankan

```bash
# Install dependencies
npm install

# Development — SPA (Vite). Tanpa backend, panggilan /api/v1/* akan 404.
npm run dev

# Development — backend REST (Express + Postgres). Wajib dijalankan
# berdampingan untuk fitur yang menyentuh server (login, sync Instagram,
# simpan konten, dsb.), karena `npm run dev` hanyalah Vite.
npm run dev:api

# Build untuk production
npm run build
```

### Migrasi database

Skema baru ditulis di `server/schema.sql` (untuk DB baru) **dan** sebagai migrasi idempoten di `server/migrations/*.sql` (untuk DB yang sudah jalan). Migrasi dijalankan manual di VPS **sebelum** kode terkait di-deploy:

```bash
# di VPS, dari /opt/metmal/deploy/vps
docker compose exec -T postgres psql -U metmal -d metmal < ../../server/migrations/<nama-migrasi>.sql
```

Migrasi terakhir: `2026-10-15-tenant-participations.sql` dan `2026-10-15-tenant-participation-options.sql` (partisipasi tenant). Daftar lengkap ada di `server/migrations/`.

## Testing

```bash
# Watch mode
npm run test

# UI mode
npm run test:ui

# Coverage
npm run test:coverage

# Sekali jalan (tanpa watch) — penting di Windows:
NODE_ENV=test npx vitest run

# E2E (Playwright)
npm run test:e2e

# Accessibility (Playwright + axe-core)
npm run test:a11y

# Audit harness dashboard + gate axe admin
npm run test:audit
npm run test:audit:a11y
```

Unit (vitest) men-cover domain guards: status derive, publish Draft, permission matrix, letter no-GAS, schedule PDF filter, mapper REST tenant, dsb. Suite penuh: **118 file / 960 tes** (verifikasi 2026-10-16).

## Domain docs (bahasa bersama)

- [CONTEXT.md](./CONTEXT.md) — glossary + bounded contexts
- [docs/SPEC.md](./docs/SPEC.md) — product behavior
- [docs/SPEC-hygiene.md](./docs/SPEC-hygiene.md) — repo hygiene + letter cutover
- [docs/tickets/](./docs/tickets/) — board T-* / H-*
- [docs/adr/](./docs/adr/) — keputusan keras (Draft/Event, status, registration, letter, VPS, Pusat Komando)
- [docs/features/](./docs/features/) — brief fitur (`update-fitur-*.md`)
- [src/data/featureDocs.ts](./src/data/featureDocs.ts) — isi halaman publik `/docs` (tata cara penggunaan tiap fitur)

## Konfigurasi

Env var **client** (Vite, prefix `VITE_`) — buat file `.env` di root:

```env
# Base API backend. Lokal: biarkan kosong bila SPA dan backend satu host.
# Produksi (SPA di Vercel → api domain lain). Host kanonik:
VITE_API_URL=https://metmal.metmalcommunityspace.web.id
VITE_R2_PUBLIC_URL=YOUR_R2_PUBLIC_URL
# Opsional — auto-login saat dev:
# VITE_DEV_AUTO_LOGIN=true
```

Env var **server-only** (secret, di `deploy/vps/.env` di host VPS, jangan commit — template: `deploy/vps/.env.example`):

```env
DATABASE_URL  POSTGRES_PASSWORD  JWT_SECRET
COOKIE_DOMAIN COOKIE_SAMESITE  CORS_ORIGIN
R2_ACCOUNT_ID   R2_ACCESS_KEY_ID   R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME  R2_PUBLIC_URL
MID_API_KEY  APIFY_API_TOKEN
```

Stack produksi — SPA deploy ke Vercel (project `metmal-community-hub`); backend: lihat `deploy/vps/README-DEPLOY.md` (docker compose postgres+api+nginx, backup cron, reset password admin).

## Struktur Folder

```
src/
├── pages/          # Komponen level-route (publik + login), 1 file = 1 rute lazy
├── components/     # Komponen — semua berkelompok, tanpa file flat di akar
│   ├── md/         # Wrapper bertipe Material Web 3 (button, dialog, chip, …)
│   ├── admin/      # Superadmin (user, activity log, analytics, pameran) + antrean tenant
│   ├── community/  # Community hub + registrasi
│   ├── dashboard/  # Shell, sidebar, navigasi, modul dashboard, panel Insight Cerdas
│   ├── survey/     # Survey kepuasan + evaluasi tenant
│   ├── modals/     # Dialog/overlay (CRUD, konfirmasi, lightbox modal)
│   ├── views/      # Mode tampilan: kalender, kanban, timeline
│   ├── events/     # Widget domain event (tabel, galeri foto, letter, partisipasi tenant)
│   ├── drafts/     # Antrian pra-jadwal (queue, history, progress)
│   ├── media/      # Header galeri + lightbox foto
│   ├── ui/         # Primitif bersama (badge, search, filter, tooltip) + index.ts barrel
│   ├── forms/      # Field form event (recurring, multi-day, model)
│   ├── nav/        # Navigasi dropdown
│   └── pdf/        # Dokumen PDF (jadwal, surat)
├── hooks/          # Custom hooks (useEvents, useTenantParticipations, useToast, dll)
├── utils/          # Utility functions + utils/api/ (modul REST per domain)
├── data/           # featureDocs.ts — satu sumber isi halaman /docs
├── lib/            # rest.ts (apiGet/apiPost), schemas.ts (zod), download.ts
├── constants/      # survey-options.ts — enum survey sumber kebenaran
├── styles/         # Tailwind v4 tokens & utilities
├── types/          # TypeScript types (domain)
├── App.tsx         # Main app component
└── main.tsx        # Entry point

server/             # Backend REST (Express + Postgres) — lihat server/src/routes/
├── src/routes/     # public, auth, admin, survey, tenant, exhibitions, extra,
│                   # tenantProposals (kolaborasi tenant), tenantParticipations
├── migrations/     # Migrasi SQL idempoten (dijalankan manual di VPS sebelum deploy)
└── schema.sql      # DDL untuk DB baru
docs/
├── features/       # Brief fitur (update-fitur-*.md, draft-voucher-tenant.md)
├── research/       # Riset platform/venue
├── reports/        # Laporan audit (lokal, tidak di-commit)
├── adr/            # Keputusan arsitektur
├── tickets/        # Board T-* / H-*
└── agents/         # Panduan alur agent (triage, issue tracker, akses DB VPS)
public/screenshots/ # Tangkapan layar fitur (README)
```

Test colocated di `__tests__/` milik folder masing-masing (`src/components/ui/__tests__/`, dst.).

## Demo

- [Live Demo](https://www.metmalcommunityspace.web.id/)
- [Jadwal Event](https://www.metmalcommunityspace.web.id/events)
- [Direktori Komunitas](https://www.metmalcommunityspace.web.id/community)
- [Galeri](https://www.metmalcommunityspace.web.id/gallery)
- [Admin Dashboard](https://www.metmalcommunityspace.web.id/dashboard)

## Lisensi

MIT
