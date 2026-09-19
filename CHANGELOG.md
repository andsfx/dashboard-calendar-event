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
