# Dashboard Admin - Route-Based Navigation

## Perubahan yang Dilakukan

Dashboard admin telah diubah dari **scroll-based navigation** menjadi **route-based navigation**. Setiap menu di sidebar sekarang mengarah ke halaman/route terpisah.

## Struktur Route Baru

### Public Routes
- `/` - Community Landing Page
- `/gallery` - Gallery Index
- `/gallery/:slug` - Album Detail
- `/survey/:eventId` - Survey Form
- `/dashboard` - Public Event Schedule (untuk user yang belum login)

### Admin Routes
- `/dashboard` - Dashboard Overview (Stats + Featured Events)
- `/dashboard/analytics` - Analytics Dashboard
- `/dashboard/events` - Jadwal Event (Table/Calendar/Kanban/Timeline)
- `/dashboard/drafts` - Draft Queue
- `/dashboard/themes` - Tema Tahunan
- `/dashboard/registrations` - Pendaftaran Community
- `/dashboard/survey` - Survey Kepuasan
- `/dashboard/activity-log` - Activity Log

### Superadmin Routes
- `/dashboard/users` - User Management (hanya untuk superadmin)

## Perubahan Teknis

### 1. AdminSidebar Component
- **Sebelum**: Menggunakan `scrollIntoView()` untuk navigasi ke section
- **Sesudah**: Menggunakan `<Link>` dari react-router-dom untuk navigasi ke route
- **Perubahan**:
  - Mengganti `action: 'scroll'` menjadi `action: 'route'`
  - Menambahkan property `route` untuk setiap nav item
  - Menggunakan `useLocation()` untuk menentukan active state
  - Menghapus `IntersectionObserver` logic

### 2. App.tsx
- **Sebelum**: Semua section ditampilkan dalam satu halaman panjang
- **Sesudah**: Conditional rendering berdasarkan route
- **Perubahan**:
  - Menambahkan `useLocation()` hook
  - Menambahkan variable `dashboardPath` untuk menentukan route saat ini
  - Setiap section dibungkus dengan kondisi `dashboardPath === '/path'`
  - Menambahkan header (title + description) untuk setiap halaman admin

### 3. Route Configuration
- Route `/dashboard` diubah menjadi `/dashboard/*` untuk mendukung nested routes
- Setiap section admin sekarang memiliki route sendiri

## Keuntungan

1. **Better UX**: User tidak perlu scroll panjang untuk mencari section tertentu
2. **Faster Loading**: Hanya section yang aktif yang di-render
3. **Better Navigation**: URL mencerminkan posisi user di aplikasi
4. **Bookmarkable**: User bisa bookmark halaman tertentu
5. **Browser History**: User bisa menggunakan tombol back/forward browser

## Backward Compatibility

- Public view tetap berfungsi seperti sebelumnya
- Semua modal (CRUD, Detail, Settings) tetap berfungsi
- Semua fitur existing tetap berfungsi tanpa perubahan
- Settings (Landing Page, Album Gallery, Buat Surat) tetap membuka modal

## Testing

Build berhasil tanpa error:
```
✓ built in 2.30s
```

Dev server berjalan normal di `http://localhost:5173`

## File yang Diubah

1. `src/App.tsx` - Conditional rendering berdasarkan route; chrome via `DashboardShell`
2. `src/components/dashboard/AdminSidebar.tsx` - Mengubah dari scroll-based ke route-based navigation
3. ~~`src/hooks/useDashboardSection.ts`~~ — **dihapus 2026-07-23** (dead, 0 import; R1+R7). SoT path: `dashboardNavigation.tsx`
4. `src/components/dashboard/DashboardShell.tsx` — **added 2026-07-23** (R4): skip-link, sidebar, navbar, main frame, footer, modals/toasts slots. Sections + handlers tetap di App.

## File Backup

- `src/App_backup.tsx` - Backup dari App.tsx original (bisa dihapus setelah testing selesai)
