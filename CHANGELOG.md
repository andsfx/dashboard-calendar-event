# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Script migrasi domain media** `server/scripts/migrate-cdn-domain.mjs` —
  memindahkan URL di database dari `cdn.andotherstori.my.id` ke
  `cdn.metmalcommunityspace.web.id` (67 baris: `events.poster_url`,
  `event_areas.cover_photo_url`, `photo_albums.cover_photo_url`,
  `event_photos.url`, `area_photos.url`, `event_proposals.file_url`,
  `site_settings.value`). Objek R2 tidak dipindah — hanya hostname, jadi
  penggantian string sudah cukup. Idempotent.
  **Bawaan script adalah LAPOR SAJA**; menulis wajib `--apply`. Konvensi ini
  sengaja dibalik: script pernah dijalankan tanpa sengaja ke produksi karena
  flag `--dry-run` tertelan pembungkus shell, sehingga perubahan langsung
  diterapkan. Dengan bawaan aman, kegagalan meneruskan flag berakibat
  "tidak terjadi apa-apa".
- **Execution plan doc** (`docs/PLAN_2026-09-17_15-30.md`) — mencatat dua fase audit: Impeccable a11y contrast + Hallmark anti-pattern.
- **Role `demo`** — akun peragaan yang bisa MELIHAT seluruh permukaan dashboard (termasuk Manajemen Pengguna & Log Aktivitas) tetapi TIDAK bisa mengubah apa pun. Ditegakkan di **backend**, bukan hanya menyembunyikan tombol:
  - `server/src/auth.js`: `DEMO_ROLE`, `DEMO_READ_ROLES`, `DEMO_READ_ACTIONS` (allowlist 9 aksi baca), `canPerformAdminAction()`, `maskEmail()`.
  - `server/src/routes/admin.js`: gate `POST /admin/:action` menolak 403 semua aksi di luar allowlist untuk demo (allowlist → aksi baru otomatis tertutup).
  - `server/src/routes/{survey,tenant,extra}.js`: endpoint baca (`/survey/stats|responses|config|export`, `/tenant/list|get|analytics|summary|roster|config|export`, `/users`, `/activity-log`) dibuka untuk demo; mutasi tetap staff-only.
  - `GET /users` untuk demo menyamarkan email (`s***i@mail.com`) — struktur terlihat, PII tidak.
  - `server/migrations/2026-09-18-demo-role.sql`: `ALTER TABLE users` menambah `demo` ke CHECK constraint (idempoten; `schema.sql` saja tidak cukup untuk DB yang sudah ada).
  - Frontend: `UserRole` + `usePermission` (`isDemo` + 8 flag `canView*` yang memisahkan "lihat" dari "kelola"), navigasi & kartu command center pakai flag view, `UserManagement`/`ExhibitionManager`/`SurveyDashboard`/`TenantSurveyPage` + 5 modal konten menerima `readOnly` untuk menyembunyikan aksi mutasi.
  - Dev: `VITE_DEV_AUTO_LOGIN_ROLE` untuk menguji UI per-role tanpa backend.
- **Superadmin bisa mengedit user langsung dari dashboard** — sebelumnya hanya ada toggle aktif/nonaktif dan hapus; tombol `Pencil` bahkan sudah di-import di `UserManagement.tsx` tapi tidak pernah dipakai (niat yang belum diimplementasi). Kini tiap baris punya tombol Edit yang membuka `UserEditModal` untuk mengubah **email, nama tampilan, role, dan password**.
  - `server/src/routes/extra.js`: `POST /users-update` menerima `email` (di-`trim`+lowercase, validasi regex, cek unik case-insensitive `lower(email)` → 409). Sebelumnya `email` tidak didukung sama sekali.
  - **Role tak dikenal kini 400**, bukan diabaikan diam-diam. Dulu `if (ALL_VALID_ROLES.includes(...))` membuat role salah dibuang tanpa pesan — bila itu satu-satunya field, hasilnya `'Tidak ada perubahan'` yang menyesatkan.
  - **Menonaktifkan akun sendiri ditolak** di `/users-update` (konsisten dengan `/users-delete`) — inilah proteksi efektif yang mencegah superadmin mengunci dirinya sendiri. Ditambah jaring kedua di `/users-update` + `/users-delete`: superadmin aktif terakhir tidak bisa diturunkan/dinonaktifkan. Jaring ini **tidak bisa dicapai** lewat route saat ini (pelaku harus superadmin, jadi target = diri sendiri selalu ditangkap self-guard lebih dulu; target orang lain berarti jumlah superadmin ≥2) — dipertahankan sebagai pengaman bila daftar role route ini melebar. Diverifikasi di produksi: promote/demote dengan 2 superadmin tetap boleh.
  - `email` disamakan case-insensitive saat cek duplikat karena login memakai `lower(email)`.
  - Frontend: label role `demo` ditambahkan ke `ROLE_LABELS` (sebelumnya badge tampil mentah karena kunci tidak ada) dan ke pilihan role di form buat user; email user kini tampil di daftar (sebelumnya hanya nama); role akun sendiri di-`disabled` di modal dengan penjelasan.
  - `UserEditModal` hanya mengirim field yang **benar-benar berubah**, dan password kosong berarti "jangan ubah" — bukan "kosongkan". Password <6 karakter ditolak di klien tanpa memanggil server.
  - **Label aksesibel unik** pada tombol aksi user. Data nyata punya dua user bernama `demo` (`demo@demo.com` dan `user@demo.com`), sehingga label `Edit demo`/`Nonaktifkan demo` muncul dua kali dan screen reader tidak bisa membedakannya. Label kini menyertakan email (`Edit demo (demo@demo.com)`) — `display_name` tidak unik, email unik. Ada test regresinya.

### Fixed
- **Insiden: migrasi sempat dijalankan ke produksi tanpa disengaja.** 67 baris
  database komunitas diubah ke domain yang saat itu belum ada DNS-nya
  (NXDOMAIN), membuat gambar tidak tampil. Dibuatkan dan diverifikasi
  rollback penuh (0 baris domain baru, 67 baris domain lama pulih, 0 gambar
  rusak). Tidak ada data hilang — hanya hostname, objek R2 tidak disentuh.
  Pencegahan: bawaan script kini lapor-saja (lihat di atas).
- **Aksesibilitas — kontras ikon pada tint background** (`babe937`): ikon `*‑500` diganti ke `*‑700` (amber, primary, red) di `ToastContainer.tsx`, `EventAreaManagerModal.tsx`; teks placeholder `SearchBar.tsx` dari `slate‑500` ke `slate‑600`.
- **Aksesibilitas — kelas mati** (`babe937`): `.landing‑grid` dihapus dari `motion.css` (tidak terpakai).
- **UI — bare `transition` pada permukaan publik** (`50317ba`): 8 lokasi di `FeaturedEvents`, `CommunityEventAreas`, `CommunityBenefits`, `CommunityUpcomingEvents` diganti ke `transition‑shadow`, `transition‑colors`, atau `transition‑transform` agar ring fokus tidak ikut teranimasi.
- **Aksesibilitas — skip link tidak fokusable** (`1931ed4`): 13 `<main id="konten-utama">` publik kini punya `tabIndex={-1}` agar skip link benar-benar memindahkan fokus (bug yang sama sudah difix di dashboard). Target `#calendar` dan `#register` juga dibuat fokusable. `ExhibitionsLandingPage` kini punya skip link.
- **Aksesibilitas — tombol terlalu kecil** (`1931ed4`): tombol clear `SearchBar` dan tombol naik/turun `EventAreaManagerModal` diperbesar ke target 28×28px (WCAG 2.5.8). Tombol reorder kini juga punya `aria-label` (sebelumnya hanya `title`).
- **Layar putih di produksi** (`5ec459a`): `ErrorBoundary` yang sudah ada ternyata tidak pernah di-import — error runtime apa pun membuat React meng-unmount seluruh tree tanpa UI pemulihan. Kini `<App />` dibungkus `ErrorBoundary`. Ditambah listener `vite:preloadError` untuk memulihkan kegagalan muat chunk basi setelah deploy (HTML ter-cache di edge menunjuk hash aset lama).
- **Crash `EventTable` saat `areaId` menunjuk area tak dikenal** (`1fadac8`): akar penyebab layar putih `/dashboard` setelah login. `areaMap.get(areaKey)!.name` melempar `TypeError` bila ada event dengan `areaId` yang tidak ada di daftar `areas` (area dihapus/nonaktif). `areaId` tak ter-resolve kini diperlakukan sebagai `__unmapped__` → tampil "Tanpa lokasi". Ditambah test regresi.

- **`/tenant/analytics` 502 di produksi** (`d8ca4f2`): `ReferenceError: ANALYTICS_READ_ROLES is not defined` — import di-rename ke `ANALYTICS_READ_ROLES_WITH_DEMO` tetapi satu pemakaian di body (baris 845, `isAdminScope`) tertinggal. ESM tidak error saat import, jadi bug hanya muncul ketika endpoint dipanggil. Ditemukan saat verifikasi produksi.
- **Migrasi demo tidak menerapkan constraint** (`d8ca4f2`): pola pencocokan memakai `ILIKE '%role IN%'`, padahal Postgres menyimpan bentuknya sebagai `role = ANY (ARRAY[...])` → tidak cocok → `ADD CONSTRAINT` gagal. Kini mencocokkan kedua bentuk.
- **Guard regresi konstanta role server** (`src/__tests__/serverRoleConstants.test.ts`): `server/` tidak dicek `tsc` (JS, bukan TS) dan di-exclude dari vitest, sehingga import menggantung hanya ketahuan di runtime produksi. Test ini memverifikasi setiap pemakaian konstanta role ter-import/terdefinisi + modul route bisa di-import. Terverifikasi gagal-on-bug.

### Changed
- **Domain media pindah ke `cdn.metmalcommunityspace.web.id`** (menggantikan
  `cdn.andotherstori.my.id`) di `vercel.json`, `AGENTS.md`, `README.md`,
  `deploy/vps/README-DEPLOY.md`, ADR 005, dan `e2e/deck-assets.spec.ts`.
  Bucket R2 tetap `metmal-gallery`.
- **Domain API pindah ke `api.metmalcommunityspace.web.id`** (menggantikan
  `metmal.andotherstori.my.id`) di dokumentasi dan rewrite `vercel.json`.
  Nilai runtime ada di env Vercel `VITE_API_URL`, bukan di source.
- **Stamp `tokens.css`** (`50317ba`): `custom (Graphify‑tosca)` → `custom (Metmal tosca/pink warm paper)`; tambahan baris `design‑system: DESIGN.md (root)` untuk mencegah drift audit berikutnya.
