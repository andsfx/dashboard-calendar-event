# Dashboard Calendar Event

Aplikasi dashboard untuk mengelola dan memantau jadwal event di Metropolitan Mall Bekasi.

## Tech Stack

- **React 19** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **Lucide React** - Icons
- **date-fns** - Date manipulation
- **Google Apps Script** - Backend (Google Sheets integration)

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

### Admin Mode
- Login dengan password (`admin123`)
- Tambah event baru
- Edit event
- Hapus event
- Status draft untuk event yang belum dikonfirmasi

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
VITE_APPS_SCRIPT_URL=YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL
```

## Struktur Folder

```
src/
├── components/     # React components
├── hooks/          # Custom hooks (useEvents, useToast, dll)
├── utils/          # Utility functions
├── types.ts        # TypeScript types
├── App.tsx         # Main app component
└── main.tsx        # Entry point
```

## Google Sheets Setup

1. Buat Google Sheet dengan nama sheet `SCHEDULE EVENT`
2. Struktur kolom: Tanggal, Jam, Acara, Lokasi, EO, Keterangan
3. Deploy Google Apps Script sebagai Web App
4. Copy URL ke `.env`

## Lisensi

MIT