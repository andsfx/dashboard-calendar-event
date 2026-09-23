# Dashboard Calendar Event

Aplikasi dashboard untuk mengelola dan memantau jadwal event di Metropolitan Mall Bekasi.

## Screenshots

### Community Hub (Landing)

#### Hero Section
![Community Hub Hero](./public/screenshots/landing-hero.png)

#### Upcoming Events
![Upcoming Events](./public/screenshots/landing-upcoming-events.png)

### Dashboard

#### Search & Filter Bar
![Dashboard Search & Filter](./public/screenshots/dashboard-search-filter.png)

#### Tabel View (Content)
![Dashboard Tabel Content](./public/screenshots/dashboard-table-content.png)

#### Timeline View (Content)
![Dashboard Timeline Content](./public/screenshots/dashboard-timeline-content.png)

## Tech Stack

- **React 19** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **Lucide React** - Icons
- **date-fns** - Date manipulation
- **Express + pg + Postgres 16** - Backend REST di VPS (Opsi B; Supabase sudah dilepas total — lihat ADR 005)
- **Cloudflare R2** - Media (foto/proposal)
- **React Router v7** - Routing
- **@vercel/analytics** - Analytics

## Fitur

### View Modes
- **Tabel** - Daftar event
- **Kalender** - Monthly (admin)
- **Kanban** - Berlangsung / Mendatang / Selesai (+ kolom Internal opsional)
- **Timeline** - Garis waktu event

### Fitur Utama
- Filter status, kategori, prioritas, bulan + pencarian
- Dark mode (system detect)
- Auto-detect kategori dari nama event
- Statistik (total, berlangsung, mendatang, selesai)
- Tema tahunan (quarter timeline)
- **Community Hub** + **Jadwal publik** (`/events`) + unduh PDF jadwal
- **Foto Area Event** di landing — kartu area bisa diklik, membuka lightbox galeri foto (prev/next, Escape untuk tutup)
- **Direktori Komunitas** publik (`/community`) — EO/komunitas yang pernah buat event, statistik & aktivitas
- Halaman pendaftaran publik **`/daftar`** — form pengajuan event komunitas + upload proposal; form landing di community hub mengarah ke sini
- **Gallery** album foto
- **Survey Kepuasan** (pengunjung/organizer) — terpisah dari **Evaluasi Tenant**
- **Evaluasi Tenant** (`/tenant-survey`) — self-assessment anonim tenant untuk event; picker event → form publik (`/tenant-survey/:eventId`) tanpa login; hasil agregat publik `/tenant-survey-results`
- **Superadmin** — user management, activity log

### Admin Mode
- Login email + password (backend VPS, bcrypt + JWT cookie)
- **Event** (jadwal resmi) + **Draft** (antrian pra-jadwal) — dua entitas; publish Draft → spawn Event
- Status Event dihitung dari tanggal (bukan workflow manual)
- Surat: generator PDF → **GeneratedLetter** (Postgres VPS via REST); bukan Google Apps Script
- Pendaftaran komunitas: approve **tidak** auto-buat Draft (CTA manual “Buat Draft dari pendaftaran”)
- **Foto Area Event** — CRUD area & foto (cover, urutan, aktif/nonaktif); yang aktif tampil di landing
- Event bisa dikaitkan ke **organisasi terdaftar** (dropdown pencarian EO; nama organisasi terisi otomatis)

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
```

Unit (vitest) men-cover domain guards: status derive, publish Draft, permission matrix, letter no-GAS, schedule PDF filter, dsb.

## Domain docs (bahasa bersama)

- [CONTEXT.md](./CONTEXT.md) — glossary + bounded contexts
- [docs/SPEC.md](./docs/SPEC.md) — product behavior
- [docs/SPEC-hygiene.md](./docs/SPEC-hygiene.md) — repo hygiene + letter cutover
- [docs/tickets/](./docs/tickets/) — board T-* / H-*
- [docs/adr/](./docs/adr/) — keputusan keras (Draft/Event, status, registration, letter)

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
MID_API_KEY
```

Stack produksi — SPA deploy ke Vercel (project `metmal-community-hub`); backend: lihat `deploy/vps/README-DEPLOY.md` (docker compose postgres+api+nginx, backup cron, reset password admin).

## Struktur Folder

```
src/
├── pages/          # Komponen level-route (publik + login), 1 file = 1 rute lazy
├── components/     # Komponen — semua berkelompok, tanpa file flat di akar
│   ├── admin/      # Superadmin (user, activity log, analytics, pameran)
│   ├── community/  # Community hub + registrasi
│   ├── dashboard/  # Shell, sidebar, navigasi, modul dashboard
│   ├── survey/     # Survey kepuasan + evaluasi tenant
│   ├── modals/     # Dialog/overlay (CRUD, konfirmasi, lightbox modal)
│   ├── views/      # Mode tampilan: kalender, kanban, timeline
│   ├── events/     # Widget domain event (tabel, galeri foto, letter)
│   ├── drafts/     # Antrian pra-jadwal (queue, history, progress)
│   ├── media/      # Header galeri + lightbox foto
│   ├── ui/         # Primitif bersama (badge, search, filter) + index.ts barrel
│   ├── forms/      # Field form event (recurring, multi-day, model)
│   ├── nav/        # Navigasi dropdown
│   └── pdf/        # Dokumen PDF (jadwal, surat)
├── hooks/          # Custom hooks (useEvents, useToast, dll)
├── utils/          # Utility functions + utils/api/ (modul REST per domain)
├── styles/         # Tailwind v4 tokens & utilities
├── types.ts        # TypeScript types (domain)
├── App.tsx         # Main app component
└── main.tsx        # Entry point

docs/
├── features/       # Brief fitur (update-fitur-*.md, draft-voucher-tenant.md)
├── research/       # Riset platform/venue
├── reports/        # Laporan audit (lokal, tidak di-commit)
├── adr/            # Keputusan arsitektur
├── tickets/        # Board T-* / H-*
└── agents/         # Panduan alur agent (triage, issue tracker)
```

Test colocated di `__tests__/` milik folder masing-masing (`src/components/ui/__tests__/`, dst.).

## Demo

- [Live Demo](https://www.metmalcommunityspace.web.id/)
- [Jadwal Event](https://www.metmalcommunityspace.web.id/events)
- [Admin Dashboard](https://www.metmalcommunityspace.web.id/dashboard)

## Lisensi

MIT