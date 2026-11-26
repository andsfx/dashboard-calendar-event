# Panduan redesign dashboard

Gunakan panduan ini saat merancang ulang permukaan `/dashboard/*`. Halaman publik di luar dashboard tidak termasuk lingkup tahap ini, jadi setiap dampak ke sana harus dicegah atau dilaporkan.

## Lingkup

Termasuk:

- permukaan yang ditemukan dalam daftar navigasi dan peta wayfinding `src/components/dashboard/dashboardNavigation.tsx` (WAYFINDING: Pusat Komando, Insight Cerdas, Jadwal event, Antrian draft, Tema tahunan, Pameran dan aktivasi, Pendaftaran, Kolaborasi tenant, Partisipasi tenant, Survei kepuasan, Evaluasi tenant, Analitik, Manajemen pengguna, Log aktivitas, serta seksi `/content/*`). Ini daftar yang ditemukan, bukan daftar final surface per peran: `getDashboardNavGroups` menyaring rail menurut izin dan menyembunyikan Insight Cerdas untuk peran `demo`, `getAllowedDashboardPaths` hanya memuat rute `/dashboard/*`, dan ada rute standalone `Hasil evaluasi tenant` (`/tenant-survey-results`) yang memakai chrome dashboard. Akun tenant relation tanpa izin event (kondisi `isTrOnly`) hanya melihat Analitik, tanpa Pusat Komando dan modul event.
- chrome dashboard: `DashboardShell.tsx`, `DashboardHeader.tsx`, `AdminSidebar.tsx`, `SectionNav`, `ViewToggle`, `viewTabs.tsx`;
- komponen tampilan yang dipakai dashboard: `src/components/views/*`, `src/components/events/*`, `src/components/drafts/*`, `src/components/modals/*`, `src/components/ui/*`, dan primitif `src/components/shadcn/*`.

Tidak termasuk pada tahap ini:

- rute publik (`/`, `/events`, `/gallery`, `/news`, `/sponsor`, `/tenants`, `/community`, `/survey/*`, `/tenant-survey*`, `/letter/:id`). Khusus `/tenant-survey-results`: tidak ikut dirancang ulang, tetapi memakai chrome dashboard sehingga wajib dipertahankan tampilannya saat chrome berubah;
- `src/components/nav/PublicSiteHeader.tsx` dan `src/components/nav/NavDropdown.tsx`;
- `improve/`, yang merupakan sandbox terpisah.

Perubahan pada komponen di `src/components/**` ikut terpakai di rute publik (`pdf/*`, `views/CalendarView`, `ui/StatusBadge`, `modals/ConfirmDialog`). Rute `/tenant-survey-results` bahkan memakai `DashboardShell` dengan `publicMode`, jadi perubahan chrome dashboard juga terlihat di sana. Karena itu, ubah komponen bersama hanya bila hasilnya di rute publik identik, atau berikan varian yang default-nya mempertahankan tampilan publik sekarang.

## Arah visual dashboard

Arah aktif berasal dari `DESIGN.md`: permukaan dashboard bersifat padat, mudah dipindai, dan berorientasi data. Bahasa kampanye (hero pemasaran, animasi masuk besar, CTA ganda) tidak dipindahkan ke dashboard.

`DESIGN.md` juga mencatat palet ekspor Stitch (`redesign/DESIGN.md`) belum diadopsi. Selama belum ada keputusan tertulis yang memperbaruinya, nilai warna dari bahan desain hanya referensi; padanannya tetap token repo:

| Peran | Token |
|---|---|
| Permukaan halaman | `--wf-page` |
| Kartu atau panel | `--wf-board`, `--wf-board-2` |
| Tinta utama | `--wf-ink` |
| Tinta sekunder | `--wf-ink-muted` |
| Garis | `--wf-rule`, `--wf-rule-control` |
| Aksen aksi | `--wf-accent`, `--wf-accent-ink`, `--wf-accent-soft` |
| Status | `--wf-live`, `--wf-action`, `--wf-danger` |
| Merek | `--color-brand-primary-*`, `--color-brand-secondary-*` |

Token `--wf-*` sudah berganti sendiri di tema gelap. Jangan menambahkan `dark:` untuk permukaan, teks, atau garis netral, dan jangan memakai ramp `slate-*` sebagai pengganti token.

## Aturan desain

1. Satu fokus per layar. Setiap seksi dashboard punya satu keputusan utama yang ingin dibantu, dan hierarki visual mengikuti keputusan itu.
2. Angka dan label berasal dari data nyata. Jangan menampilkan metrik, tren, atau aktivitas karangan, termasuk pada mockup yang diserahkan sebagai final.
3. Setiap kontrol punya perilaku nyata. Tombol, filter, tab, dan tautan tujuan harus menunjuk aksi atau rute yang ada.
4. Setiap layar data butuh keadaan memuat, kosong, dan gagal. Sebutkan penyebab dan langkah berikutnya, bukan hanya "tidak ada data".
5. Target sentuh minimal 44 px pada breakpoint mobile dashboard, termasuk tombol ikon di tabel.
6. Fokus keyboard harus terlihat memakai `ui-focus-ring`. Modal harus bisa ditutup dengan Escape, menahan fokus, dan mengembalikan fokus ke pemicunya.
7. Kontras teks minimal 4,5:1 untuk teks normal dan 3:1 untuk teks besar atau ikon, di tema terang dan gelap. Warna aksen `#00918e` tidak memenuhi 4,5:1 untuk teks putih, jadi gunakan pasangan `--wf-accent` dan `--wf-accent-ink` untuk tombol solid.
8. Label, pesan error, dan status memakai Bahasa Indonesia. Istilah domain mengikuti `CONTEXT.md`.
9. Gerakan dibatasi pada transisi yang menjelaskan perubahan state. Hormati `prefers-reduced-motion`, dan jangan menambah animasi masuk yang menunda pembacaan data.
10. Setiap keputusan visual utama harus punya alasan satu baris yang bisa ditulis di handoff: mengapa layout ini, mengapa aksen di titik itu, mengapa kepadatan tersebut.

## Alur kerja di Open Design

### 1. Tetapkan inventaris layar

Buat daftar surface yang akan dirancang. Mulai dari WAYFINDING, lalu turunkan inventaris final per peran dengan membaca `getDashboardNavGroups`, `getAllowedDashboardPaths`, `CONTENT_ROUTES`, dan kondisi render di `DashboardPage.tsx`. Jangan memakai daftar path tanpa memeriksa penyaringan izin: sebagian seksi hanya muncul untuk peran tertentu, dan akun tenant relation diarahkan ke rute di luar `/dashboard`. Untuk setiap surface, catat pengguna yang boleh membukanya menurut `usePermission` dan matriks peran backend, tujuan layar, data yang ditampilkan, serta aksi utama.

Selesai bila setiap surface per peran punya pengguna, tujuan, dan aksi utama, termasuk permukaan di luar `/dashboard` yang memakai chrome dashboard yang sama.

Sebelum menggambar, usulkan nilai dial ENERGY, RHYTHM, dan MOTION beserta alasan satu baris, lalu dapatkan persetujuan. Panduan antislop mewajibkan dial itu eksplisit; nilainya keputusan pemilik produk, bukan bawaan panduan ini. Kolom ketiga menyusul di tahap desain.

### 2. Tetapkan state per surface

Untuk setiap surface, daftar minimal: default dengan data, memuat, kosong karena belum ada data, kosong karena filter, gagal memuat, dan keadaan tanpa izin bila relevan. Sebutkan juga breakpoint yang digambar (mobile 375 atau 390, tablet 768, desktop 1280) dan kedua tema.

Selesai bila tidak ada surface yang hanya punya gambar keadaan ideal.

### 3. Rancang chrome sebelum isi

Kerjakan `DashboardShell`, sidebar, header, dan navigasi seksi lebih dulu, karena semua surface mewarisi ritme, kepadatan, dan warna permukaannya. Tetapkan satu skala jarak, satu skala radius dari `theme.css`, serta ukuran judul dan label yang dipakai ulang di semua seksi. Jangan memperkenalkan skala baru per halaman.

Selesai bila chrome memuat hierarki, navigasi, dan penanda seksi aktif yang sama untuk semua surface, tanpa membuat dua pola navigasi berbeda.

### 4. Kerjakan surface per irisan

Urutkan dari yang paling sering dipakai: Pusat Komando, Jadwal event, Antrian draft, lalu seksi lain. Untuk setiap irisan, serahkan satu set frame yang memuat keadaan dari langkah 2, daftar komponen bersama yang tersentuh, dan catatan perilaku yang harus tetap sama.

Selesai bila satu irisan bisa ditinjau tanpa membuka irisan lain.

### 5. Tinjau sebelum implementasi

Periksa setiap irisan terhadap aturan di atas, lalu catat temuan per butir. Pertahankan daftar pertanyaan terbuka, misalnya keputusan yang menunggu pemilik produk atau konflik dengan `DESIGN.md`. Jangan menyerahkan desain sebagai final bila masih ada konflik arah yang belum diputuskan.

Selesai bila tidak ada kontrol mati, data karangan, state yang hilang, atau pelanggaran kontras yang belum diselesaikan atau dicatat.

### 6. Serahkan handoff

Paket handoff berisi:

- daftar surface dengan path, peran, dan tujuan;
- frame per state dan per breakpoint, beserta tema terang dan gelap;
- peta token yang dipakai, tanpa hex baru di luar lapisan token;
- komponen bersama yang berubah dan bukti bahwa rute publik tidak ikut berubah;
- daftar perilaku yang harus dipertahankan: state, hooks, data fetching, izin, payload, validasi, navigasi;
- pertanyaan terbuka dan keputusan yang masih menunggu.

Selesai bila tim implementasi bisa mengerjakan satu irisan tanpa menebak maksud desain.

## Alur implementasi setelah desain disetujui

1. Petakan irisan ke file nyata: `DashboardPage.tsx`, `DashboardShell.tsx`, `dashboardNavigation.tsx`, komponen seksi, serta tes di folder `__tests__` terkait.
2. Terapkan per irisan kecil yang tetap bisa dibangun. Gunakan `src/components/shadcn` untuk tabel, keadaan kosong, dialog, tombol, dan kontrol form.
3. Pertahankan perilaku: gating `getAllowedDashboardPaths(permissions)`, entri rail dan kartu Insight yang disembunyikan untuk peran `demo`, polling hook (`useEvents` 30 detik, `useDraftEvents` dan `useTenantSurveys` 60 detik), serta seluruh kontrak API.
4. Jangan mengubah animasi masuk `useGsapEntrance` tanpa alasan yang terukur. `DashboardShell` memakai `refreshKey` yang memuat `isLoading` karena `<main>` baru terpasang setelah `/auth/me` selesai; menghapus dependensi itu membuat seksi tertahan pada pre-state `opacity: 0`.
5. Kartu Kanban dan Timeline saat ini berupa `Button` yang membungkus tombol aksi. Perbaikan yang benar adalah pola overlay (`div` relatif, satu `Button` `absolute inset-0`, tombol aksi di atasnya dengan `z-*`), dan harus dikerjakan bersama tes `src/components/views/__tests__`.
6. Jangan membungkus subtree interaktif dengan `RevealSection`. Pemindahan node mencabut fokus elemen aktif tanpa memicu `blur`, sehingga ketikan pertama hilang.
7. Untuk kerja lokal, ikuti `docs/agents/local-development.md`. Untuk verifikasi data produksi, ikuti batas read-only di `docs/agents/vps-db-access.md`.

## Verifikasi

Setelah edit terakhir pada satu irisan:

```bash
npm run build
NODE_ENV=test npx vitest run --maxWorkers=2 src/components/dashboard src/components/views src/components/events src/components/drafts src/components/modals src/components/ui
```

Lalu periksa langsung di browser:

- setiap seksi yang berubah pada 375 px dan 1280 px, tema terang dan gelap;
- tabel tanpa gulir horizontal di tingkat halaman, dengan header tetap menempel saat isi digulir;
- modal: fokus masuk, Escape menutup, fokus kembali ke pemicu;
- konsol tanpa error baru;
- rute publik yang memakai komponen bersama yang disentuh, misalnya `/events` dan `/gallery`, tampil sama seperti sebelumnya.

Suite `npm run test:a11y` hanya mencakup rute publik, jadi hasilnya bukan bukti untuk dashboard. Untuk dashboard, jalankan pemeriksaan axe di browser atau catat bahwa pemeriksaan otomatis belum mencakup surface tersebut.

Selesai bila build dan tes terkait lulus, smoke nyata setiap surface yang berubah tercatat, dan tidak ada perubahan tak sengaja pada rute publik.

## Prompt untuk Open Design

```text
Rancang ulang permukaan dashboard untuk repo schedule-event-v2. Halaman publik tidak termasuk lingkup.

Bacaan arah: dashboard admin event mall untuk staf operasional. DESIGN.md menetapkan permukaan admin bersifat padat, mudah dibaca, dan efisien, bukan kampanye pemasaran. Usulkan nilai dial ENERGY, RHYTHM, dan MOTION beserta alasan satu baris di awal pekerjaan, lalu tunggu persetujuan sebelum menggambar layar.

Sumber yang mengikat:
- DESIGN.md untuk arah visual aktif dan catatan bahwa palet ekspor Stitch belum diadopsi
- src/components/dashboard/dashboardNavigation.tsx untuk daftar seksi, label, dan fungsi penyaring izin
- src/components/dashboard/DashboardPage.tsx untuk kondisi render per seksi dan per peran
- src/styles/dashboard-wayfinding.css untuk token --wf-*, theme.css untuk palet merek
- src/components/shadcn untuk primitif yang tersedia

Kerjakan berurutan:
1. Turunkan daftar surface per peran dari WAYFINDING, getDashboardNavGroups, getAllowedDashboardPaths, CONTENT_ROUTES, dan kondisi render DashboardPage.tsx. Jangan menganggap daftar path sebagai daftar lengkap surface.
2. Untuk setiap surface, catat path, peran yang boleh membuka, tujuan layar, dan aksi utama.
3. Untuk setiap surface, gambar state: berdata, memuat, kosong, kosong karena filter, gagal. Sertakan 375 px dan 1280 px, tema terang dan gelap.
4. Rancang chrome dashboard lebih dulu: shell, sidebar, header, navigasi seksi. Pakai satu skala jarak dan radius.
5. Lanjutkan surface per irisan, mulai Pusat Komando, Jadwal event, Antrian draft.

Aturan:
- Jangan menampilkan angka, tren, nama, atau aktivitas karangan.
- Setiap kontrol harus punya aksi nyata; jangan gambar kontrol mati.
- Kontras minimal 4,5:1 untuk teks normal, 3:1 untuk teks besar dan ikon, di kedua tema.
- Target sentuh minimal 44 px di mobile.
- Semua label Bahasa Indonesia.
- Jangan memakai hex baru; sebutkan token yang dipakai per elemen.
- Jangan memindahkan pola kampanye publik (hero besar, CTA ganda, animasi masuk panjang) ke dashboard.

Serahkan handoff berisi: daftar surface dan state, peta token, komponen bersama yang tersentuh beserta dampaknya ke rute publik, daftar perilaku yang harus dipertahankan, dan pertanyaan terbuka.
```

## Prompt untuk coding agent implementasi

```text
Terapkan desain dashboard yang sudah disetujui pada repo schedule-event-v2. Halaman publik tidak termasuk lingkup.

Lingkup: [seksi dashboard dan path yang disetujui]
Handoff desain: [path atau lampiran frame dan catatan token]
Tidak termasuk: rute publik, header publik, improve/

Sebelum mengedit:
1. Baca AGENTS.md, DESIGN.md, docs/agents/design-migration.md, dan handoff desain.
2. Telusuri path di src/components/dashboard/dashboardNavigation.tsx sampai DashboardPage.tsx, komponen seksi, komponen bersama, serta tes di __tests__ terkait.
3. Petakan state, hooks, API, izin, navigasi, dan pemakai komponen bersama yang juga dipakai rute publik.
4. Tampilkan peta file, irisan berurutan, perilaku yang harus tetap sama, dan verifikasi yang akan dijalankan.

Saat mengedit:
- Gunakan primitif src/components/shadcn dan token --wf-*, tanpa hex baru dan tanpa dark: untuk peran netral.
- Pertahankan gating izin, peran demo read-only, polling hook, kontrak API, payload, dan validasi.
- Pertahankan keadaan memuat, kosong, dan gagal.
- Jangan mengubah dependensi useGsapEntrance di DashboardShell tanpa bukti masalah.
- Jangan membungkus subtree interaktif dengan RevealSection.
- Jangan mengubah tampilan rute publik; bila komponen bersama harus berubah, buktikan hasil publik identik atau pakai varian yang default-nya mempertahankan tampilan sekarang.

Sebelum menyatakan selesai:
- Jalankan npm run build dan seluruh tes vitest yang menyentuh area berubah setelah edit terakhir.
- Buka setiap seksi yang berubah di browser pada 375 px dan 1280 px, kedua tema; periksa tabel, modal, keyboard, dan konsol.
- Periksa minimal satu rute publik yang memakai komponen bersama yang disentuh.
- Laporkan file yang berubah, perilaku yang dipertahankan, hasil pemeriksaan yang benar-benar diamati, serta batas verifikasi. Jangan mengklaim hasil yang tidak dijalankan.
```
