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
- **Supabase** - Backend (database, auth, storage)
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
- Login email + password (Supabase Auth)
- **Event** (jadwal resmi) + **Draft** (antrian pra-jadwal) — dua entitas; publish Draft → spawn Event
- Status Event dihitung dari tanggal (bukan workflow manual)
- Surat: generator PDF → **GeneratedLetter** (Supabase); bukan Google Apps Script
- Pendaftaran komunitas: approve **tidak** auto-buat Draft (CTA manual “Buat Draft dari pendaftaran”)
- **Foto Area Event** — CRUD area & foto (cover, urutan, aktif/nonaktif); yang aktif tampil di landing
- Event bisa dikaitkan ke **organisasi terdaftar** (dropdown pencarian EO; nama organisasi terisi otomatis)

## Cara Menjalankan

```bash
# Install dependencies
npm install

# Development
npm run dev

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
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_R2_PUBLIC_URL=YOUR_R2_PUBLIC_URL
# Opsional — auto-login saat dev:
# VITE_DEV_AUTO_LOGIN=true
```

Env var **server-only** (secret, set di Vercel / `.env.supabase`, jangan commit):

```env
SUPABASE_SERVICE_ROLE_KEY
R2_ACCOUNT_ID   R2_ACCESS_KEY_ID   R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME  R2_PUBLIC_URL
ADMIN_PASSWORD  ADMIN_SESSION_TOKEN  ALLOW_LEGACY_ADMIN
APPS_SCRIPT_URL ADMIN_API_TOKEN      APIFY_API_TOKEN  MID_API_KEY
```

## Struktur Folder

```
src/
├── components/     # React components
│   ├── admin/      # Superadmin components
│   ├── community/  # Community hub components
│   ├── dashboard/  # Dashboard components
│   └── survey/     # Survey components
├── hooks/          # Custom hooks (useEvents, useToast, dll)
├── utils/          # Utility functions
├── types.ts        # TypeScript types
├── App.tsx         # Main app component
└── main.tsx        # Entry point
```

## Demo

- [Live Demo](https://www.metmalcommunityspace.web.id/)
- [Jadwal Event](https://www.metmalcommunityspace.web.id/events)
- [Admin Dashboard](https://www.metmalcommunityspace.web.id/dashboard)

## Lisensi

MIT