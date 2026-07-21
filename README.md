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
- **Tabel** - Daftar event dalam bentuk tabel
- **Kalender** - Tampilan kalender monthly
- **Kanban** - Kolom status (Draft, Berlangsung, Mendatang, Selesai)
- **Timeline** - Garis waktu event

### Fitur Utama
- Filter berdasarkan status, kategori, prioritas, dan bulan
- Pencarian event
- Dark mode dengan auto-detect sistem
- Auto-detect kategori dari nama event
- Statistik dashboard (total, berlangsung, mendatang, selesai)
- Quarter timeline untuk tema tahunan
- **Community Hub** - Landing page publik dengan hero, upcoming events, gallery
- **Superadmin Mode** - Manajemen user, activity log, analytics
- **Survey System** - Form feedback venue & management
- **Venue Management** - Approval & monitoring feedback

### Admin Mode
- Login dengan email + password (Supabase Auth; legacy password off by default)
- Tambah event baru
- Edit event
- Hapus event
- Status draft untuk event yang belum dikonfirmasi
- Draft letter generator (PDF)

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
# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

Current test coverage:
- Unit tests: eventInput, eventDateTime utilities
- Component tests: StatCard

## Konfigurasi

Buat file `.env` dengan:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_R2_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY_ID
VITE_R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET_ACCESS_KEY
VITE_R2_BUCKET_NAME=YOUR_R2_BUCKET_NAME
VITE_R2_ENDPOINT=YOUR_R2_ENDPOINT
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

- [Live Demo](https://metmal-community-hub.vercel.app/)
- [Admin Dashboard](https://metmal-community-hub.vercel.app/dashboard)

## Lisensi

MIT