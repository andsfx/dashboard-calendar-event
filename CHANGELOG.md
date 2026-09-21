# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Audit UI/UX halaman publik (Hallmark 58 gate + WCAG 2.2/axe-core).** Cakupan: `/`, `/events`, `/gallery`, `/community`, `/daftar` di produksi, viewport 320–1280. Laporan lengkap: `docs/PLAN_2026-09-18_20-18-audit-uiux.md`.
  - Hasil: **2 critical · 4 major · 3 minor**. Yang bersih: `/gallery` dan `/daftar` nol pelanggaran axe; nav mobile punya hamburger `aria-label` + `aria-expanded`; nol gambar rusak; nol scroll horizontal; nol teks klik membungkus dua baris.
  - **Critical · token tosca salah sebagai latar tombol.** `bg-[var(--brand-tosca)]` (`#00918e`, `brand-primary-500`) dipakai sebagai latar teks putih di **18 tempat** → kontras terhitung **3.85:1**, gagal AA 4.5:1. `DESIGN.md` sendiri sudah melarangnya ("Dekoratif saja (3.86:1 — JANGAN teks kecil di terang)") dan menyediakan token yang benar (`brand-primary-600` `#007a78`, 5.18:1). axe menandai 66 node di `/events` dan 86 node di `/community`.
  - **Critical · angka hero tanpa sumber.** Lencana hero "232+ Event Sudah Terlaksana" bertentangan dengan "TOTAL 251" di `/events`; tidak ada yang bisa dilacak sumbernya.
  - Major: teks 10–12px di atas latar tosca di `/events` (3.53–3.96:1); pink `#c92d62` sebagai teks 12px di `/community` (4.41:1); lompatan tingkat heading `h1→h3→h4→h2` di `/`.
  - Minor: alt gambar mengulang judul di sebelahnya (3 node); panah `→` sebagai karakter teks di label "Lihat Foto"; tombol nav "Jadwal Event" membungkus dua baris.

### Fixed
- **Band CTA "Punya ide event?" menempel pada section berita di halaman komunitas (`/`).** Section CTA diapit `CommunityNews` (ber-`border-b`) dan `CommunityRegistrationForm`, tetapi hanya punya `px-4 pb-4 sm:px-6` — **nol padding atas** — sehingga tepi atas kartu CTA duduk persis di garis bawah section berita dan terbaca sebagai menempel. Kini diberi padding atas mengikuti irama section halaman (`pt-16 sm:pt-24 lg:pt-32`), sementara bawah tetap `pb-4` agar CTA tetap terasa satu grup dengan form pendaftaran di bawahnya. Diukur dengan browser headless pada 390/768/1280 px: jarak tepi bawah `#news` → tepi atas kartu CTA naik dari **0 px** menjadi **64/96/128 px** (setara `py` section lain di breakpoint yang sama).

- **Audit UI/UX `/dashboard` — 14 temuan (5 critical + 9 major) diperbaiki.** Sumber: audit Hallmark anti-pattern atas seluruh area dashboard (chrome, halaman, panel admin, survey).
  - **Critical · toggle survey berbohong soal state.** `SurveyDashboard` menampilkan "survey aktif" untuk survey yang sebenarnya tertutup: `activeConfigs` **selalu kosong** karena komponen tidak pernah memuat config, lalu `?? true` menebak "aktif". Diperbaiki dua arah — hidrasi nyata via `GET /survey/config` per event (pola sama dengan `TenantSurveyPage`) **dan** default `false` sesuai `survey_config.is_active DEFAULT FALSE`.
  - **Critical · metrik fabrikasi "Bersedia Repeat".** Nilainya `avg_overall_rating * 20`, padahal `overall_rating` berskala **1–5** (lihat label `overall_rating/5` di daftar). Jadi rating bintang-5 dikali 20 menjadi satuan persen yang tidak pernah ada, dengan ambang 70% yang tak bermakna. Kartu itu dihapus; rating asli sudah ditampilkan di kartu "Rating Rata-rata". Metrik repeat sungguhan butuh `would_repeat` yang saat ini tidak di-`SELECT` endpoint analytics mana pun (kolom ada di `schema.sql`, tapi mengeksposnya = perubahan `server/`).
  - **Critical · error ditelan → state "tidak ada data" palsu.** `ActivityLog` gagal fetch akan menampilkan "Tidak ada aktivitas ditemukan" — pada halaman **audit trail**, itu menyimpulkan tidak ada aktivitas padahal permintaan gagal. Kini ada state error + tombol coba lagi. Sama untuk `SurveyDashboard` (export/copy/toggle) dan `TenantSurveyPage` (termasuk `if (!res.ok) return` senyap pada export CSV).
  - **Critical · drift DESIGN.md.** Heatmap jam `AnalyticsDashboard` memakai residual indigo `rgba(99,102,241,…)` → `color-mix` token tosca. Badge role `demo` memakai `purple-*` di luar palet → `brand-secondary-*` (pink, allow-list badge).
  - **Major · `<h1>` ganda.** Setiap route `/dashboard/*` punya `<h1>` di `DashboardHeader` **plus** `<h1>` section. Sembilan section diturunkan ke `<h2>`; tepat satu h1 per halaman.
  - **Major · ring fokus beranimasi.** Tailwind `transition` menyertakan `box-shadow`, dan `.ui-focus-ring` menggambar ring lewat `box-shadow` → ring memudar 150ms. 95 `transition` telanjang diganti properti eksplisit (`transition-colors` / `transition-[…]`), sehingga tak ada lagi elemen ber-ring yang mentransisikan `box-shadow`.
  - **Major · semantik tabel.** `role="button"` dihapus dari `<tr>` `EventTable` (menimpa peran `row` bawaan dan merusak pembacaan baris/kolom); `onClick` baris `TenantSurveyList` dihapus (nested interactive) beserta `stopPropagation` di `<td>` yang jadi tak perlu. Fungsi detail tetap ada lewat tombol aksi per baris.
  - **Major · daftar kelola survey dipotong senyap.** `slice(0, 30)` + hanya status `past` diganti: `past` + `ongoing`, tanpa cap, dengan pencarian nama event (rules.md melarang hard-limit 30).
  - **Major · filter tanggal zona waktu.** `ActivityLog` mengirim batas hari dengan suffix `Z` (UTC) padahal domain Asia/Jakarta → batas hari meleset 7 jam. Kini `+07:00`.
  - **Major · JSON mentah di UI.** `JSON.stringify(log.details).slice(0,120)` diganti ringkasan field berlabel (kunci dikenal diberi label Indonesia, boolean → Ya/Tidak).
  - **Major · card-in-card.** Kartu ber-border bersarang di dalam `ui-dashboard-surface` diratakan di `TenantSurveyAnalytics` (tile kategori) dan `TenantSurveyResultsPage` (item feedback).
  - Minor ikut tersentuh: label Inggris → Indonesia (`Prev`/`Next`, `Copied!`, `Excellent`/`Good`/`Needs Improvement`), `<p>` kosong dihapus.
  - **Dikecualikan dengan alasan:** `SurveyQRCode` & `SurveyPopup` (`catch` idiom canvas/clipboard/localStorage, bukan penelanan error data); `EventRatingSummary` (kontrak badge dekoratif — gagal = tak tampil, degradasi wajar); `AuditResumeDashboard` (komponen tidak pernah di-route = dead code, nol dampak).

- **Audit UI/UX `/dashboard` — gelombang kedua (seluruh temuan minor + verifikasi agen).** Diverifikasi ulang oleh tiga agen read-only (minor frontend, jalur metrik repeat, kontras/a11y) dengan hitungan, bukan dugaan.
  - **Koreksi audit sendiri · klaim kontras salah.** Temuan awal "141 `text-slate-500` gagal AA (4.43:1)" **dibatalkan**: `theme.css:45-48` menimpa palet `slate` Tailwind dengan warm-olive, jadi nilai yang benar-benar dikirim `text-slate-500` = `#586056` → **6.07:1 di paper, 6.41:1 di card — LOLOS AA**. Rasio 4.43:1 berasal dari hex Tailwind default (`#64748b`) yang tidak dipakai. Tidak ada perubahan kode untuk ini; yang salah adalah laporan, bukan UI.
  - **Kontras nyata yang diperbaiki:** indikator state toggle "off" memakai `text-slate-300` (`#bcc1b5`, **1.71:1**) — gagal ambang 3:1 untuk komponen UI → naik ke `slate-400` (`#7d8579`, 3.55:1) di `UserManagement`, `SurveyDashboard`, `TenantSurveyPage`.
  - **Touch target (DESIGN.md:333 ≥44px).** 5 tombol **ikon-saja** yang berada di bawah 44px (tutup drawer, tutup modal, tombol kembali, tutup popup, tombol hapus user) diberi util `.touch-target` (min 44×44) — visual ikon tidak berubah, hanya area sentuh. Tombol teks berpadding (≥28px, lulus WCAG 2.5.8 AA 24px) sengaja tidak disentuh agar kepadatan tabel admin tidak rusak; tombol hapus di dalam input (pola ikon tertanam) juga dibiarkan agar tidak menutupi teks.
  - **`transition-all` → properti spesifik (14 situs).** Progress/bar chart yang menganimasikan `width`/`height` kini `transition-[width]`/`transition-[height]`; `RatingSlider` `transition-[transform,background-color,color]`; kartu picker `transition-[transform,border-color,box-shadow]`.
  - **Sapuan `transition` telanjang diperluas ke komponen top-level yang dirender `/dashboard`** (modal CRUD, kalender, dsb) — 131 situs di 19 file, sebelumnya terlewat karena sapuan pertama hanya mencakup 3 subfolder. Total kini 0 `transition` telanjang di seluruh permukaan dashboard.
  - **`h-screen` → `h-dvh`/`min-h-dvh`** (drawer sidebar, shell dashboard, halaman survey) agar tinggi benar saat toolbar mobile dinamis.
  - **`100vw` → `calc(100%-2rem)`** pada dua dropdown absolut (`TenantSurveyList`, `TenantSurveyResultsParts`) untuk menghindari overflow saat scrollbar desktop muncul.
  - **Warna semantik error.** `AdminDraftSection` (error draft) dan `SurveyPage` (error muat) memakai amber → rose. `TenantSurveyEventPicker` kini memisahkan dua state: "Survey Belum Tersedia" (informasi, amber) vs "Gagal Memuat" (error, rose).
  - **`as` cast tanpa validasi dihapus** di 6 tempat: select publikasi (`if (next in PUBLICATION_LABELS)`), status lead (`satisfies` union), filter status hasil (`'draft'` ternyata **bukan** nilai sah — tertangkap tsc saat guard ditulis), query `?type=` (`organizer|public` saja), dan **`as never`/`as unknown as` pada submit survey publik** (Known debt #7).
  - **Debt #7 dibayar + bug laten terbongkar.** Menghapus `as never` menyingkap bahwa `PublicTenantSurveySubmission` masih stub v2 yang **mewajibkan `tenant_name`/`business_category`/`business_subcategory` yang tidak pernah dikirim** halaman publik — ketidakcocokan tersembunyi dari compiler. Tipe dikoreksi agar cocok dengan `validatePublicSubmission` server; `ip_address`/`user_agent` dihapus dari tipe karena **diturunkan server**, bukan dikirim FE. Paritas FE↔BE diverifikasi baris-per-baris terhadap `INSERT` di `server/src/routes/tenant.js`. Jalur ini **tidak punya test**, jadi verifikasi dilakukan statis (tsc + pembacaan kode server).
  - **Kode mati & aksesibilitas lain.** Import lucide tak terpakai (`Calendar`, `BarChart3`, `User`) dihapus; `Array(12).fill(0)` diberi tipe `number[]` yang **membongkar** penulisan indeks tak aman (`monthlyTrend[m]++`) → `(monthlyTrend[m] ?? 0) + 1`; `hourDistribution` diberi tipe; tombol tutup form & tombol hapus user di `UserManagement` diberi `aria-label` (sebelumnya hanya ikon); `ui-btn-primary` (utility tombol aksi) yang dipakai pada header grup `<div>`/`<tr>` di `EventTable` diganti header netral; `focus:outline-none` tanpa ring di dropdown `TenantSurveyList` diberi `focus:ring-2`; `role="alert"` ditambahkan pada error form `ExhibitionManager`; ellipsis ASCII `...` → `…` di 37 titik teks UI (spread operator `...prev` dan URL tidak disentuh).
  - **Tidak dapat diperbaiki tanpa keputusan produk:** metrik "Bersedia Repeat" **tidak bisa dihitung** — kolom `would_repeat` ada (`schema.sql:500`) tapi **tidak pernah di-INSERT** dari jalur submit mana pun (`/tenant/submit` publik & `/tenant/create` keduanya tidak memuatnya; hanya `/tenant/update` yang mengenalnya dan FE tak pernah mengirimnya). Jadi mengeksposnya di endpoint analytics akan selalu menghasilkan 0%/kosong — metrik bohong baru. Membuatnya nyata = menambah pertanyaan ke form survey tenant (perubahan produk) + `INSERT` + agregasi + deploy VPS.


- **Dashboard admin: konten rata kiri full-width, bukan kolom center `max-w-7xl` (2026-09-21).** `DashboardShell` memakai kolom marketing (`mx-auto max-w-7xl`) **di dalam** offset sidebar (`lg:ml-64`), sehingga konten mengambang center dengan **~190px ruang mati** di kiri dan kanan pada 1920px (terukur: `#main-content` kiri **445px**, kanan **1725px**). Standar dashboard = konten menempel kiri, full-width.
  - `src/components/dashboard/DashboardShell.tsx`: `<main id="main-content">` cabang admin jadi `w-full px-4 sm:px-6 lg:px-8` (tanpa `mx-auto`/`max-w-7xl`); footer rata kiri. Cabang non-admin (publik) tetap centered.
  - `src/components/Navbar.tsx`: container inner admin full-width agar topbar sejajar konten; brand dapat `pl-10 lg:pl-0` agar tidak tertimpa tombol menu mobile.
  - `src/components/DashboardSkeleton.tsx`: skeleton admin full-width supaya tidak ada lompatan layout saat loading.
  - `src/components/dashboard/AdminSidebar.tsx`: tombol menu mobile dipindah ke band topbar (`left-3 top-2.5`, `z-50`); sebelumnya `top-20` **menimpa judul `h1`** di <1024px.
  - Bukti ukur: `leftGutter = 0` di semua route dashboard (320/768/1024/1440/1920); tanpa overflow dokumen di 320px (`scrollW == clientW`); 1 `<main>`, `<nav aria-label>`, skip-link, `aria-current="page"` benar per route, tanpa lompatan level heading. `npx tsc --noEmit` exit 0; `npm run build` exit 0; `npx vitest run` **518/518 (74 file)**; `npx playwright test` (config root) **16 passed, 1 skipped**; `npm run test:a11y` **28/28** (light+dark, 320-1280px) tanpa pelanggaran baru.
  - `mx-auto max-w-7xl` yang tersisa sengaja **tidak** diubah: semuanya halaman publik (landing/gallery/news/sponsor/tenant/community/registration/letter/tenant-survey-results) di mana kolom tercenter memang benar.

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
- **Irama spasi vertikal halaman komunitas (`/`) diseragamkan — dua deviasi terakhir dihapus.** Audit lanjutan setelah perbaikan band CTA menemukan dua section yang tidak mengikuti irama `px-4 py-16 sm:px-6 sm:py-24 lg:py-32` milik halaman.
  - **`CommunitySocialProof`** (section "Dipercaya oleh komunitas di Bekasi", di antara Hero dan Upcoming Events) memakai `py-14 sm:py-16` **tanpa langkah `lg`**, sehingga di desktop jauh lebih rapat dari tetangganya. Kini `px-4 py-16 sm:px-6 sm:py-24 lg:py-32` (border, latar `var(--section-alt)`, dan seluruh isi tidak berubah).
  - **`<footer>` halaman** memakai `py-12 sm:py-16` — juga tanpa `lg`. Kini mengikuti skala penuh `px-4 py-16 sm:px-6 sm:py-24 lg:py-32`. Footer sengaja **tidak** dicap lebih pendek: diukur pada 1280 px, kotak isinya hanya **73 px** (logo + dua baris) versus **76 px** milik `CommunitySocialProof`, jadi tinggi section keduanya sama-sama ditentukan padding — `329 px` (footer) vs `333 px` (SocialProof). Menutupinya dengan nilai `lg:py-20` baru justru menciptakan satu-satunya padding `lg` non-standar di halaman ini.
  - **Diukur dengan browser headless (Chromium) pada 390/768/1280 px, jarak konten-ke-konten** (bukan tepi section, yang bersinggungan 0 px):
    - Hero bawah → konten SocialProof atas: **56/210/84 px → 64/242/148 px**
    - konten SocialProof bawah → konten Upcoming Events atas: **122/162/194 px → 130/194/258 px**
    - konten Contact bawah → konten footer atas: **193/161/193 px → 209/193/257 px**
    - regresi CTA yang sudah difix tidak berubah: konten `#news` bawah → kartu CTA atas tetap **64/96/128 px**.
  - Tidak ada test yang mengunci kelas padding ini; 70 file / 485 test tetap hijau tanpa perubahan test.

- **Navigasi header halaman komunitas (`/`) dikelompokkan jadi dropdown kategori.** Sebelumnya 11 link dideretkan dalam satu baris horizontal (`NAV_ITEMS`) — melebar dan padat di layar sempit. Kini 4 entri top-level: `Event` (link langsung `#upcoming-events`), `Program ▾` (`#benefits` Keuntungan · `#areas` Area & Fasilitas · `#how` Cara Daftar · `#faq` FAQ), `Jelajahi ▾` (`#gallery` Galeri · `#news` Berita · `/tenants` Tenant · `/pameran` Pameran), dan `Kontak` (link langsung `#contact`). Tombol `Daftar Sekarang` dan `Jadwal Event` tidak disentuh (memang di luar `NAV_ENTRIES`).
  - **Komponen baru `src/components/nav/NavDropdown.tsx`** — trigger + panel yang dikonfigurasi lewat array bertipe (`NavDropdownItem[]`), sehingga `CommunityLandingPage` tetap deklaratif. Memakai **pola disclosure (APG)**, bukan menu-button: item di panel adalah link navigasi sungguhan sehingga screen reader mengumumkan "link", trigger hanya `aria-expanded` + `aria-controls` (tanpa `aria-haspopup="menu"`), dan panel berupa `role="group"` berlabel — `role="menu"`/`role="menuitem"` sengaja tidak dipakai karena membungkam semantik link dan mengubah ekspektasi keyboard. Tab menelusuri tiap link secara alami (tanpa roving tabindex, tanpa focus trap); ArrowDown/ArrowUp/Home/End tetap ada sebagai *progressive enhancement*. Buka via hover (mouse, intent delay 120 ms) **dan** klik/Enter/Space; tutup via Escape (fokus balik ke trigger), klik di luar, fokus keluar container (termasuk menu yang dibuka lewat hover lalu di-Tab), atau setelah item dipilih. Setelah item anchor dipilih, fokus dipindahkan secara sadar ke section target bila fokusable (`tabIndex={-1}`), selain itu kembali ke trigger — fokus tidak pernah jatuh ke `<body>`. Hanya satu dropdown terbuka pada satu waktu (state `openMenu` di parent). Anchor `#…` tetap scroll in-page, `/tenants` & `/pameran` tetap navigasi react-router `<Link>` (`route: true`).
  - **Panel selalu permukaan solid** — `bg-white` / `dark:bg-slate-900` + border + shadow, tidak mewarisi gaya transparan header saat `isHeaderPinned === false`, jadi tetap terbaca di atas hero.
  - **Anchor `#areas` dibuat stabil.** `CommunityEventAreas` mengembalikan `null` saat tidak ada area aktif (atau gagal muat), sehingga link nav "Area & Fasilitas" jadi anchor mati. Section itu kini dibungkus elemen ber-`id="areas"` + `scroll-mt-28` + `tabIndex={-1}` di `CommunityLandingPage` (id ganda di `RevealSection` bagian dalam dihapus); tampilan tidak berubah saat area memang ada.
  - **Panel mobile (`#mobile-nav-panel`) direstrukturisasi jadi section berkategori** (heading `Program` / `Jelajahi` + link-nya), bukan lagi 11 link datar. Perilaku lama dipertahankan: fokus ke link pertama saat buka (`mobilePanelFirstLinkRef`), Escape menutup, `closeMobileNav()` mengembalikan fokus ke tombol menu, panel menutup setelah link di-tap, target sentuh ≥44px.
  - **Animasi buka panel 150 ms (`nav-dropdown-panel`, `motion.css`)** — `opacity 0→1` + `translateY(-4px)→0`. Sengaja tidak memakai `.fade-in` umum (800 ms + lompat 20px, terlalu berat untuk menu yang menempel di trigger); resting state tidak bergantung pada `animation-fill-mode: forwards` sehingga panel tetap terlihat bila animasi tidak jalan. Ikut masuk blok `@media (prefers-reduced-motion: reduce)` yang sudah ada.
  - **Test `src/components/__tests__/NavDropdown.test.tsx` diperluas ke 14 kasus**: buka via klik + `aria-expanded` bertukar + `aria-controls` menunjuk panel, item ter-query sebagai **link** (bukan `menuitem`), item route `/tenants` & `/pameran`, tutup via Escape dengan fokus kembali ke trigger, ArrowDown dari trigger tertutup membuka + fokus item pertama, navigasi ArrowDown/ArrowUp/Home/End + wrap, tutup via klik luar, tutup via hover-leave, tutup saat fokus keluar container untuk menu hasil hover, aktivasi item menutup panel, fokus pindah ke section target fokusable (atau kembali ke trigger bila tidak ada), dan hanya satu dropdown terbuka. Semua id section (`#benefits`, `#areas`, `#how`, `#faq`, `#gallery`, `#news`, `#contact`, `#upcoming-events`, `#register`, `#hero`) tidak berubah. Typeahead & kasus resize-saat-terbuka sengaja dilewati (opsional).
- **16 kolom mati blok "Legacy comprehensive fields" dihapus (2026-09-19).** Melanjutkan pembersihan `would_repeat` di `3c9e98c`: sisa 16 kolom `tenant_event_surveys` — `venue_preparation`, `logistics_smoothness`, `setup_teardown_efficiency`, `mall_coordination_rating`, `mall_support_rating`, `communication_quality`, `event_execution_quality`, `crowd_management`, `visitor_satisfaction_estimate`, `overall_self_rating`, `what_went_well`, `what_went_wrong`, `improvements_needed`, `issues_encountered`, `suggestions_for_mall`, `additional_notes` — **tidak pernah ditulis** jalur insert mana pun (`/tenant/submit` publik & `/tenant/create` tidak memuatnya), **tidak pernah di-update** (bukan anggota whitelist `textFields`/`ratingFields` di `/tenant/update`), dan **tidak pernah dibaca** endpoint, agregasi, maupun tipe/form FE mana pun. Di seluruh repo, nol referensi kode nyata; `SELECT *` di beberapa endpoint (`/list`, `/get`, `/export`) tidak berbahaya karena tak ada konsumen FE yang memakai field ini. Dihapus dari blok `server/schema.sql` (beserta baris komentarnya), dari dump seed `scripts/migrate/seed/tenant_event_surveys.json` (48 record, 768 key — `seed-vps.mjs` menurunkan daftar kolom INSERT dari key JSON, jadi kolom yang hilang akan membuat seed segar gagal), dan migrasi idempoten baru `server/migrations/2026-09-19-drop-legacy-columns.sql` (`DROP COLUMN IF EXISTS`, aman dijalankan ulang) membersihkan DB yang sudah ada — `schema.sql` memakai `CREATE TABLE IF NOT EXISTS` sehingga DB lama tidak ikut berubah. Tidak ada kolom lain yang disentuh.
- **Kolom mati `would_repeat` dihapus (2026-09-19).** Kolom `tenant_event_surveys.would_repeat` tidak pernah ditulis jalur insert mana pun (`/tenant/submit` publik & `/tenant/create` tidak memuatnya) dan tidak pernah dibaca endpoint maupun tipe FE mana pun; kartu UI "Bersedia Repeat" sudah dihapus di `2c26b0a`. Dihapus dari `server/schema.sql` (blok "Legacy comprehensive fields") dan dari handler `/tenant/update` (`server/src/routes/tenant.js`) yang jadi satu-satunya pengenal. Migrasi baru `server/migrations/2026-09-19-drop-would-repeat.sql` (`DROP COLUMN IF EXISTS`, idempoten) membersihkan kolom dari DB yang sudah ada — `schema.sql` memakai `CREATE TABLE IF NOT EXISTS` sehingga DB lama tidak ikut berubah. Key `would_repeat` ikut dibuang dari dump seed `scripts/migrate/seed/tenant_event_surveys.json` (48 record) karena `seed-vps.mjs` menurunkan daftar kolom INSERT langsung dari key JSON, jadi kolom yang hilang akan membuat seed segar gagal.
- **Pembersihan infrastruktur produksi + verifikasi final (2026-09-19).**
  - **Alias domain VPS dihapus.** Blok `metmal.andotherstori.my.id` dicabut dari
    Caddyfile host dan dikeluarkan dari `CORS_ORIGIN` (tersisa
    `www.metmalcommunityspace.web.id`, `metmalcommunityspace.web.id`,
    `localhost:5173`). Diverifikasi: preflight dari `www.*` → 204, dari
    `metmal.andotherstori.my.id` → **403**. `metmal.metmalcommunityspace.web.id`
    **sengaja dipertahankan** karena dipakai rewrite OG `/events/:id` di
    `vercel.json`. Caddyfile bersama app lain (obsidian, promapi) — blok mereka
    tidak disentuh; `caddy validate` lolos.
  - **Env Vercel Production di-set ulang `--no-sensitive`.** Vercel menandai env
    Production *sensitive* secara default, sehingga `vercel env pull`
    mengembalikan `""` untuk `VITE_API_URL`/`VITE_R2_PUBLIC_URL` — memicu alarm
    "env kosong" yang **keliru** (nilai sebenarnya benar; terbukti dari bundle
    live). Kini keduanya non-sensitive dan terbaca, jadi bisa diaudit.
    Diverifikasi dengan **redeploy produksi**: bundle hasil build memuat
    `metmal.metmalcommunityspace.web.id".replace(/\/+$/,"")+"/api/v1"` (pola
    benar, 2×) dan **nol** pola rusak `"".replace`; SPA memanggil API ke host
    yang benar (8 call, 0 salah host).
  - **File yatim `server/src/` VPS dikarantina** (4 file: `admin.js`,
    `schemas.js`, `lib/exhibitions.js`, `routes/schemas.js`, + `extra.js.bak-*`)
    — tidak pernah ada di git dan tidak di-import graf mana pun. Dipindah ke
    `_orphan-quarantine-*` (bukan dihapus permanen) agar `server/src` VPS = lokal
    (15 file). API di-recreate → **healthy**, tanpa error.
  - **`README-DEPLOY.md` dikoreksi**: 9 referensi domain API `api.metmalcommunityspace.web.id`
    (NXDOMAIN) → `metmal.metmalcommunityspace.web.id`; ditambah peringatan jebakan
    env *sensitive* Vercel + cara verifikasi bundle.
  - **Tidak dihapus (keputusan sadar):** env Vercel warisan (`VITE_SUPABASE_*`,
    `ADMIN_API_TOKEN`, `APIFY_API_TOKEN`) dibiarkan — nol dampak runtime (Vite
    hanya meng-inline `VITE_*`), dan menghapusnya berisiko membuat rebuild
    deployment lama gagal. `APIFY_API_TOKEN` **masih dipakai** `extra.js`.
- **Domain media pindah ke `cdn.metmalcommunityspace.web.id`** (menggantikan
  `cdn.andotherstori.my.id`) di `vercel.json`, `AGENTS.md`, `README.md`,
  `deploy/vps/README-DEPLOY.md`, ADR 005, dan `e2e/deck-assets.spec.ts`.
  Bucket R2 tetap `metmal-gallery`.
- **Domain API pindah ke `metmal.metmalcommunityspace.web.id`** (menggantikan
  `metmal.andotherstori.my.id`) di dokumentasi dan rewrite `vercel.json`.
  Nilai runtime ada di env Vercel `VITE_API_URL`, bukan di source.
  (Catatan koreksi: sebelumnya didokumentasikan sebagai
  `api.metmalcommunityspace.web.id`, yang ternyata **NXDOMAIN** — domain API
  nyata adalah `metmal.metmalcommunityspace.web.id`, diverifikasi dari bundle
  produksi live.)
- **Stamp `tokens.css`** (`50317ba`): `custom (Graphify‑tosca)` → `custom (Metmal tosca/pink warm paper)`; tambahan baris `design‑system: DESIGN.md (root)` untuk mencegah drift audit berikutnya.
