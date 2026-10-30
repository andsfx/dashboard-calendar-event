# Audit Permukaan Publik: Header dan Aturan Desain

Tanggal: 2026-10-25
Jenis: audit read-only (tidak ada perubahan pada `src/**`)
Rujukan aturan: `AGENTS.md` dan `DESIGN.md` (Design Direction, Color System, Typography, Layout, Accessibility)

## Cakupan dan batas

- Bagian 1: 15 halaman publik di `src/pages/` plus `src/components/media/GalleryHeader.tsx`.
- Bagian 2: seluruh `src/pages/**` dan `src/components/community/**`, `__tests__` dikecualikan.
- Di luar cakupan: `src/components/dashboard/**`, `src/components/survey/**`, `src/components/ui/**`, dan `improve/**`.
- Halaman publik lain yang tidak diminta tetapi ikut terpindai di Bagian 2: `CommunityDirectoryPage.tsx`, `ExhibitionsLandingPage.tsx`, `NotFoundPage.tsx`, `AdminLoginPage.tsx`.
- Angka tinggi bar dihitung dari kelas Tailwind: `h-16` = 64 px, `h-20` = 80 px, `py-2.5` = 10 px per sisi, `py-3` = 12 px per sisi, `h-9` = 36 px, `h-11` / `min-h-11` = 44 px. Nilai px adalah perkiraan aritmetika dari kelas tersebut, bukan hasil pengukuran browser.

---

## Bagian 1 - Inventaris header 15 halaman publik

| File | Logo | Label teks halaman | Tombol kembali (tujuan) | Toggle tema | Aksi lain | Tinggi bar |
|---|---|---|---|---|---|---|
| `src/pages/CommunityLandingPage.tsx` | Ya, `LogoMark` (`:205` `<LogoMark className="h-auto w-[88px] sm:w-[124px]" />`) di dalam anchor `#hero` (`:202`) | Tidak ada | Ya, tombol "Jadwal Event" (`:240`) memanggil `onBack()` yang di `src/App.tsx:337` bernilai `onBack={() => navigate('/events')}` | Ya, `:228` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Nav desktop 4 entri + dropdown (`:207` `aria-label="Navigasi utama"`), hamburger mobile (`:257`), CTA "Daftar Event" (`:250`), tombol "Daftar Event" di panel mobile (`:315`) | 64 px (`:201` `h-16`), 80 px pada `sm` (`sm:h-20`) |
| `src/pages/EventsLandingPage.tsx` | Ya, `img` di dalam `Link to="/"` (`:554`, `:556` `<img src={mallLogo} ... className="h-8 w-auto sm:h-10" />`) | Tidak ada | Tidak ada tombol "kembali"; logo dan tombol "Komunitas" menuju `/` (`:588` `Komunitas`) | Ya, `:583` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Nav desktop "Sorotan / Kalender / Ajukan Event / Sponsor / Daftar" (`:561` `aria-label="Navigasi jadwal"`). Tidak ada "Unduh PDF" di header (tombol itu di area hero, `:652`) | 64 px (`:551` `h-16`), 80 px pada `sm` (`sm:h-20`) |
| `src/pages/EventPublicDetailPage.tsx` | Tidak ada | Ya, "Jadwal Event" (`:124` `Jadwal Event`) sebagai teks tombol kembali | Ya, `:122` `to="/events"` dengan `aria-label="Kembali ke Jadwal Event"` | Ya, `:130` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 56 px (`:121` `py-2.5` + tombol `h-9`), 60 px pada `sm` (`sm:py-3`) |
| `src/pages/EventSubmissionPage.tsx` | Tidak ada | Ya, "Jadwal Event" (`:161` `Jadwal Event`) | Ya, `:159` `to="/events"`, `aria-label="Kembali ke Jadwal Event"` | Ya, `:167` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 56 px (`:158` `py-2.5` + `h-9`), 60 px pada `sm` (`sm:py-3`) |
| `src/pages/GalleryIndexPage.tsx` | Tidak ada `<header>` sendiri | Tidak ada | Tidak ada | Tidak ada | Tidak ada | Tidak ada, memakai `GalleryHeader` (`:106` `<GalleryHeader isDark={isDark} onToggleDark={onToggleDark} />`) |
| `src/pages/GalleryAlbumPage.tsx` | Tidak ada `<header>` sendiri | Tidak ada | Tidak ada | Tidak ada | Tidak ada | Tidak ada, memakai `GalleryHeader` (`:81` `<GalleryHeader isDark={isDark} onToggleDark={onToggleDark} />`) |
| `src/pages/NewsIndexPage.tsx` | Ya, tetapi `img` tanpa link (`:58` `<img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />`) | Ya, "Berita" (`:61` `Berita`) | Ya, `:73` `to="/"` dengan label `:76` `Kembali ke Beranda` | Ya, `:68` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 64 px (`:57` `py-2.5` + `min-h-11`) |
| `src/pages/NewsArticlePage.tsx` | Ya, tetapi `img` tanpa link (`:63`) | Ya, "Berita" (`:66` `Berita`) | Ya, `:78` `to="/news"` dengan label `:81` `Kembali ke Berita` | Ya, `:73` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 64 px (`:62` `py-2.5` + `min-h-11`) |
| `src/pages/DocsPage.tsx` | Ya, tetapi `img` tanpa link (`:132`) | Ya, "Dokumentasi" (`:135` `Dokumentasi`) | Ya, `:149` `to="/"` dengan label `:152` `Kembali ke Beranda` | Ya, `:144` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 64 px (`:131` `py-2.5` + `min-h-11`) |
| `src/pages/SponsorLandingPage.tsx` | Ya, tetapi `img` tanpa link (`:134`) | Ya, "Sponsorship" (`:137` `Sponsorship`) | Ya, `:149` `to="/"` dengan label `:152` `Kembali ke Beranda` | Ya, `:144` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 64 px (`:133` `py-2.5` + `min-h-11`) |
| `src/pages/TenantDirectoryPage.tsx` | Ya, tetapi `img` tanpa link (`:87`) | Ya, "Direktori Tenant" (`:90` `Direktori Tenant`) | Ya, `:102` `to="/"` dengan label `:105` `Kembali ke Beranda` | Ya, `:97` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 64 px (`:86` `py-2.5` + `min-h-11`) |
| `src/pages/TenantCollaborationPage.tsx` | Ya, tetapi `img` tanpa link (`:280`) | Ya, "Kolaborasi Tenant" (`:283` `Kolaborasi Tenant`) | Ya, `:286` `to="/"` dengan label `:287` `Kembali ke Beranda` | Ya, `:292` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 68 px (`:279` `py-3` + tombol `h-11`) |
| `src/pages/TenantParticipationPage.tsx` | Ya, tetapi `img` tanpa link (`:403`) | Ya, "Partisipasi Tenant" (`:406` `Partisipasi Tenant`) | Ya, `:409` `to="/"` dengan label `:410` `Kembali ke Beranda` | Ya, `:415` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 68 px (`:402` `py-3` + tombol `h-11`) |
| `src/pages/RegistrationPage.tsx` | Ya, tetapi `img` tanpa link (`:36`) | Tidak ada | Ya, `:49` `to="/"` dengan label `:52` `Kembali ke Beranda` | Ya, `:44` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Tidak ada | 64 px (`:35` `py-2.5` + `min-h-11`) |
| `src/pages/PublicLetterViewer.tsx` | Tidak ada | Ya, "Surat Konfirmasi Event" (`:118` `Surat Konfirmasi Event`) plus subjudul tanggal (`:121`) | Ya, tombol ikon `:109` dengan `aria-label="Kembali"` menuju `/` (`onClick={() => navigate('/')}`) | Tidak ada toggle tema (komponen tidak menerima prop `isDark` / `onToggleDark`) | Ya, "Unduh PDF" (`:136` `Unduh PDF`) | 68 px (`:105` `py-3` + blok judul dua baris) |

### Header bersama untuk dua halaman galeri

| File | Logo | Label teks halaman | Tombol kembali (tujuan) | Toggle tema | Aksi lain | Tinggi bar |
|---|---|---|---|---|---|---|
| `src/components/media/GalleryHeader.tsx` | Ya, `img` (`:21` `<img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto sm:h-10" />`) di dalam `button` (`:16`, `:19` `aria-label="Kembali ke halaman utama"`) | Ya, "Galeri Event" (`:24`), `hidden sm:block` sehingga tidak tampil di mobile | Ya, logo (`navigate('/')`, `:17`) | Ya, `:31` `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` | Ya, tombol primer "Jadwal Event" (`:40`) menuju `/events` (`navigate('/events')`, `:37`) | 64 px (`:14` `h-16`), 80 px pada `sm` (`sm:h-20`) |

Catatan Bagian 1:

1. Hanya 3 header dari 16 yang memuat logo sebagai tautan aktif: `CommunityLandingPage` (`#hero`), `EventsLandingPage` (`/`), dan `GalleryHeader` (`/`). Pada `NewsIndexPage`, `NewsArticlePage`, `DocsPage`, `SponsorLandingPage`, `TenantDirectoryPage`, `TenantCollaborationPage`, `TenantParticipationPage`, dan `RegistrationPage` logo dirender sebagai `img` tanpa pembungkus tautan.
2. `PublicLetterViewer` adalah satu-satunya header tanpa toggle tema.
3. Tidak ada header yang memuat aksi "Unduh PDF" kecuali `PublicLetterViewer`. Di `EventsLandingPage` tombol "Unduh PDF" (`:652`) berada di blok hero, bukan di `<header>`.
4. `EventsLandingPage` tidak punya tombol menu mobile: nav-nya `hidden ... md:flex` (`:561`) dan tidak ada hamburger.

---

## Bagian 2 - Pelanggaran aturan desain

### 2.1 Em-dash dan en-dash di teks yang terlihat user

Hasil pencarian: 67 kemunculan karakter U+2014 (em-dash) dan 4 kemunculan karakter U+2013 (en-dash) pada `src/pages/**` + `src/components/community/**` (tanpa `__tests__`). Setelah setiap baris diperiksa, 7 kemunculan berada di teks yang dirender ke user; 60 sisanya ada di komentar kode atau komentar JSX. Seluruh 4 en-dash berada di komentar, jadi en-dash yang terlihat user = 0.

| No | path:line | Kutipan | Konteks render |
|---|---|---|---|
| 1 | `src/pages/DocsPage.tsx:165` | `setiap fitur Metropolitan Mall Bekasi [U+2014] dari mencari jadwal event` | Paragraf pembuka halaman `/docs` |
| 2 | `src/pages/TenantParticipationPage.tsx:460` | `Simpan kode pengajuan ini [U+2014]` | Pesan sukses setelah submit |
| 3 | `src/pages/TenantParticipationPage.tsx:525` | `{ev.acara} [U+2014] {eventDateLabel(ev)}` | Teks `<option>` pemilih event |
| 4 | `src/components/community/CommunityHero.tsx:191` | `metric.value > 0 ? formatCount(metric.value) : '[U+2014]'` | Angka metrik di papan data hero |
| 5 | `src/components/community/CommunityHero.tsx:238` | `Belum ada agenda terjadwal [U+2014] ajukan eventmu dan jadi yang pertama.` | Empty state daftar agenda hero |
| 6 | `src/components/community/CommunityRegistrationForm.tsx:257` | `tekan Kirim Pendaftaran lagi [U+2014] datamu masih ada di form ini.` | Pesan error jaringan |
| 7 | `src/components/community/countFormat.ts:17` | `return value > 0 ? ... : '[U+2014]';` | Formatter nol metrik, dirender lewat `formatStat` di hero, trust band, dan `/events` |

Catatan penting untuk no. 4 dan 7: `DESIGN.md` bagian "Community stats - one vocabulary, one display rule" secara eksplisit memerintahkan `A zero metric renders as [U+2014], never 0+`. Jadi dua kemunculan ini adalah pengecualian yang dibenarkan oleh aturan desain, tetapi keduanya adalah implementasi ganda dari satu aturan yang sama: `CommunityHero.tsx:191` menulis literal sedangkan `countFormat.ts:17` memakai formatter. Ini melanggar prinsip satu aturan tampilan.

Sisa 5 kemunculan (no. 1, 2, 3, 5, 6) tidak punya pembenaran di `DESIGN.md` dan melanggar larangan em-dash pada teks user.

| Kategori | Jumlah |
|---|---|
| Total kemunculan em-dash | 67 |
| Em-dash di komentar (tidak terlihat user) | 60 |
| Em-dash terlihat user | 7 |
| Em-dash terlihat user tanpa pembenaran DESIGN.md | 5 |
| Total kemunculan en-dash | 4 |
| En-dash terlihat user | 0 |

### 2.2 Eyebrow

Pola yang dicari: `uppercase tracking-` (termasuk `tracking-[0.3em]`). Hasil: 37 baris di `src/pages/**` dan 12 baris di `src/components/community/**`, total 49 baris. Dari jumlah itu, 9 baris adalah eyebrow yang benar-benar berfungsi di atas heading: 8 elemen eyebrow di halaman plus 1 definisi komponen `CommunityEyebrow` (`CommunityRevealPrimitives.tsx:76`) yang dirender sekali di `/events`. Sisa 40 baris adalah label header, legend fieldset, header tabel, chip status, dan label panel hero.

| Halaman / komponen | Jumlah eyebrow | path:line dan kutipan | Heading di bawahnya |
|---|---|---|---|
| `/events` (`EventsLandingPage`) | 1 | `:602` `<CommunityEyebrow>Metropolitan Mall Bekasi</CommunityEyebrow>` | `:603` `<h1 ...>Jadwal Event</h1>` |
| `/docs` (`DocsPage`) | 1 | `:160` `<p className="... uppercase tracking-[0.3em] ...">` dengan isi `Dokumentasi` | `:163` `<h1 ...>Panduan Fitur</h1>` |
| `/gallery` (`GalleryIndexPage`) | 1 | `:121` `uppercase tracking-[0.3em] ...` dengan isi `Galeri` | `:124` `<h1 ...>Galeri Event</h1>` |
| `/gallery/:slug` (`GalleryAlbumPage`) | 1 | `:156` `uppercase tracking-[0.3em] ...` dengan isi `Album` | `:159` `<h1 ...>{album.name}</h1>` |
| `/news` (`NewsIndexPage`) | 1 | `:85` `uppercase tracking-[0.3em] ...` dengan isi `Berita` | `:86` `<h1 ...>Berita</h1>` (label eyebrow identik dengan H1) |
| `/news/:slug` (`NewsArticlePage`) | 1 | `:130` `uppercase tracking-[0.3em] ...` dengan isi `Berita` | heading artikel di bawahnya |
| `/tenants` (`TenantDirectoryPage`) | 1 | `:114` `uppercase tracking-[0.3em] ...` dengan isi `Direktori Tenant` | `:115` `<h1 ...>Direktori Tenant Metropolitan Mall Bekasi</h1>` |
| `/community` (`CommunityDirectoryPage`) | 1 | `:161` `uppercase tracking-[0.3em] ...` dengan isi `Komunitas` | `:162` `<h1 ...>Komunitas Metropolitan Mall Bekasi</h1>` |
| `/` (`CommunityLandingPage`) | 0 | Tidak ada eyebrow di section landing | Tidak berlaku |
| `/sponsor` (`SponsorLandingPage`) | 0 | Tidak ada; `:137` hanya label header | Tidak berlaku |
| `/daftar` (`RegistrationPage`) | 0 | Tidak ada | Tidak berlaku |
| `/ajukan-event` (`EventSubmissionPage`) | 0 | Tidak ada | Tidak berlaku |
| `/events/:id` (`EventPublicDetailPage`) | 0 | Tidak ada | Tidak berlaku |
| `/letter/:id` (`PublicLetterViewer`) | 0 | Tidak ada | Tidak berlaku |
| `/kolaborasi-tenant` (`TenantCollaborationPage`) | 0 | `:347`, `:417`, `:467` adalah `legend`, bukan eyebrow | Tidak berlaku |
| `/partisipasi-tenant` (`TenantParticipationPage`) | 0 | `:499`, `:554`, `:589`, `:660`, `:714`, `:849` adalah `legend` | Tidak berlaku |

| Agregat | Jumlah |
|---|---|
| Baris dengan pola `uppercase tracking-` (seluruh cakupan) | 49 |
| Eyebrow nyata di atas heading | 9 |
| Halaman dengan rasio 1 eyebrow berbanding 1 heading | 8 |
| Halaman landing (`/`) dengan eyebrow | 0 |

Verdict: aturan "maksimal 1 eyebrow per 3 section" tidak dilanggar dalam arti kepadatan (tidak ada halaman dengan beberapa eyebrow beruntun), tetapi 8 halaman memakai eyebrow page-level di atas H1 dengan rasio 1 berbanding 1. `NewsIndexPage` memakai teks eyebrow yang sama persis dengan H1 (`Berita` di `:85` dan `:86`), sehingga eyebrow tidak menambah informasi apa pun.

### 2.3 Label CTA dan tujuannya

| Label | Tujuan | Lokasi |
|---|---|---|
| `Daftar Event` | `/daftar` | `CommunityHero.tsx:157`, `CommunityLandingPage.tsx:250`, `:315`, `:389`, `:401`, `EventsLandingPage.tsx:642` |
| `Daftar` | `/daftar` | `EventsLandingPage.tsx:574`, `:674`, `:978` |
| `Isi Form Pendaftaran` | `/daftar` | `EventsLandingPage.tsx:944` |
| `Kirim Pendaftaran` | submit form pendaftaran | `CommunityRegistrationForm.tsx:487` |
| `Ajukan Event` | `/ajukan-event` | `CommunityLandingPage.tsx:374`, `EventsLandingPage.tsx:569`, `:680`, `:976` |
| `Ajukan event lain` | reset form pengajuan | `EventSubmissionPage.tsx:198` |
| `Ajukan Event di Metmal Bekasi` | judul H1 halaman `/ajukan-event` | `EventSubmissionPage.tsx:213` |
| `Ajukan Event Bersama Metropolitan Mall Bekasi` | judul H1 halaman `/kolaborasi-tenant` | `TenantCollaborationPage.tsx:303` |
| `Jadwal Event` | `/events` lewat `onBack()` | `CommunityLandingPage.tsx:240`, `:329`, `GalleryHeader.tsx:40` |
| `Jadwal Event` | `/events` | `EventPublicDetailPage.tsx:124`, `EventSubmissionPage.tsx:161`, `DocsPage.tsx:365` |
| `Komunitas` | `/` | `EventsLandingPage.tsx:588` |
| `Kembali ke Beranda` | `/` | `NewsIndexPage.tsx:76`, `DocsPage.tsx:152`, `SponsorLandingPage.tsx:152`, `TenantDirectoryPage.tsx:105`, `TenantCollaborationPage.tsx:287`, `TenantParticipationPage.tsx:410`, `RegistrationPage.tsx:52` |
| `Kembali` | `/` | `PublicLetterViewer.tsx:109` |
| `Kembali ke Komunitas` | `/` | `GalleryIndexPage.tsx:115` |
| `Kembali ke Berita` | `/news` | `NewsArticlePage.tsx:81`, `:112`, `:158` |
| `Kembali ke Galeri` | `/gallery` | `GalleryAlbumPage.tsx:90`, `:146` |
| `Kembali ke Jadwal Event` (aria-label) | `/events` | `EventPublicDetailPage.tsx:122`, `EventSubmissionPage.tsx:159` |
| `Kembali ke Komunitas` (aria-label) | `/` | `EventsLandingPage.tsx:556` |
| `Kembali ke halaman utama` (aria-label) | `/` | `GalleryHeader.tsx:20` |
| `Cek Event` | `#upcoming-events` | `CommunityHero.tsx:164` |
| `Sorotan` | `#featured` | `EventsLandingPage.tsx:635`, `:662` |
| `Kalender` | `#calendar` | `EventsLandingPage.tsx:668` |
| `Lihat Semua Event` | `/events` | `CommunityUpcomingEvents.tsx:267` |
| `Lihat semua event` | `/events` | `EventPublicDetailPage.tsx:185`, `:315` |
| `Lihat jadwal event` | `/events` | `EventSubmissionPage.tsx:204` |
| `Lihat Semua Galeri` | `/gallery` | `CommunityGallery.tsx:244` |
| `Lihat Semua Berita` | `/news` | `CommunityNews.tsx:112` |
| `Hubungi Kami` | `#contact` | `CommunityUpcomingEvents.tsx:23` |
| `Unduh PDF` | buka modal ekspor PDF | `EventsLandingPage.tsx:652` |
| `Unduh PDF` | unduh surat PDF | `PublicLetterViewer.tsx:136` |
| `Buat & Unduh PDF` | unduh surat PDF (state PDF kosong) | `PublicLetterViewer.tsx:162` |
| `Kirim Pengajuan` | submit form | `TenantCollaborationPage.tsx:607`, `TenantParticipationPage.tsx:922` |
| `Cek Status` | submit form cek status | `TenantParticipationPage.tsx:971` |
| `Kirim Minat Support` | submit form sponsor | `SponsorLandingPage.tsx:399` |
| `Kirim Minat Support Lain` | reset form sponsor | `SponsorLandingPage.tsx:272` |
| `Saya Tertarik Support` | `#sponsor-form` | `SponsorLandingPage.tsx:240` |
| `Lihat Proposal` | `proposal.fileUrl` (eksternal) | `SponsorLandingPage.tsx:232` |
| `Ajukan Kolaborasi` | `/pameran/:id` | `ExhibitionsLandingPage.tsx:162` |
| `Lihat Detail` | `/pameran/:id` | `ExhibitionsLandingPage.tsx:162` |

Duplikasi label untuk satu intent:

| Intent | Label berbeda | Bukti |
|---|---|---|
| Daftar event (tujuan `/daftar`) | 3 label navigasi + 1 label submit: `Daftar Event`, `Daftar`, `Isi Form Pendaftaran`, `Kirim Pendaftaran` | `CommunityHero.tsx:157` vs `EventsLandingPage.tsx:574` vs `EventsLandingPage.tsx:944` vs `CommunityRegistrationForm.tsx:487` |
| Jadwal event (tujuan `/events`) | 4 label: `Jadwal Event`, `Lihat Semua Event`, `Lihat semua event`, `Lihat jadwal event` | `GalleryHeader.tsx:40` vs `CommunityUpcomingEvents.tsx:267` vs `EventPublicDetailPage.tsx:185` vs `EventSubmissionPage.tsx:204` |
| Kembali ke beranda (tujuan `/`) | 4 label: `Kembali ke Beranda`, `Kembali`, `Kembali ke Komunitas`, `Komunitas` | `NewsIndexPage.tsx:76` vs `PublicLetterViewer.tsx:109` vs `GalleryIndexPage.tsx:115` vs `EventsLandingPage.tsx:588` |
| Ajukan event (dua pipeline berbeda, teks hampir identik) | `Ajukan Event` (`/ajukan-event`) vs `Ajukan Event Bersama Metropolitan Mall Bekasi` (`/kolaborasi-tenant`) | `CommunityLandingPage.tsx:374` vs `TenantCollaborationPage.tsx:303` |

Total grup duplikasi: 4. Tiga di antaranya adalah dua label atau lebih dengan intent dan tujuan yang sama persis (melanggar aturan "satu intent, satu label, satu tujuan" di `DESIGN.md` bagian Conversion Flow). Satu grup terakhir adalah tabrakan penamaan antar dua pipeline berbeda.

### 2.4 `h-screen` dan `100vh`

| Pola | Jumlah | path:line dan kutipan | Verdict |
|---|---|---|---|
| `h-screen` murni pada hero atau section | 0 | Tidak ditemukan | Aman |
| `min-h-screen` | 21 | contoh `CommunityLandingPage.tsx:192` `min-h-screen overflow-x-clip`; `EventsLandingPage.tsx:543` `min-h-screen overflow-x-clip`; `PublicLetterViewer.tsx:103` `<main ... className="min-h-screen ...">` | Semua berada di pembungkus halaman, bukan hero. Tidak melanggar aturan hero |
| `100vh` | 1 | `PublicLetterViewer.tsx:146` `className="h-[calc(100vh-120px)] w-full"` | Tinggi iframe PDF, bukan hero |
| Hero dengan `min-h-[100dvh]` | 0 | Tidak ditemukan | Melanggar aturan |
| Hero dengan satuan lain | 1 | `CommunityHero.tsx:95` `relative isolate flex min-h-[100svh] items-center overflow-hidden` | Memakai `100svh`, bukan `100dvh` sesuai aturan |
| Hero tanpa tinggi viewport | 1 | `EventsLandingPage.tsx:599` `<section className="border-b border-black/5 dark:border-slate-800">` | Tidak menetapkan tinggi minimum |

Verdict: tidak ada pelanggaran `h-screen`. Dua penyimpangan terhadap aturan "hero pakai `min-h-[100dvh]`": hero `/` memakai `min-h-[100svh]`, dan hero `/events` tidak memakai tinggi viewport sama sekali.

### 2.5 Tinggi nav

| File | Kelas tinggi | Tinggi efektif | Melebihi 80 px |
|---|---|---|---|
| `CommunityLandingPage.tsx:201` | `h-16 ... sm:h-20` | 64 px / 80 px | Tidak |
| `EventsLandingPage.tsx:551` | `h-16 ... sm:h-20` | 64 px / 80 px | Tidak |
| `GalleryHeader.tsx:14` | `h-16 ... sm:h-20` | 64 px / 80 px | Tidak |
| `EventPublicDetailPage.tsx:121` | `py-2.5 ... sm:py-3` | 56 px / 60 px | Tidak |
| `EventSubmissionPage.tsx:158` | `py-2.5 ... sm:py-3` | 56 px / 60 px | Tidak |
| `NewsIndexPage.tsx:57` | `py-2.5` | 64 px | Tidak |
| `NewsArticlePage.tsx:62` | `py-2.5` | 64 px | Tidak |
| `DocsPage.tsx:131` | `py-2.5` | 64 px | Tidak |
| `SponsorLandingPage.tsx:133` | `py-2.5` | 64 px | Tidak |
| `TenantDirectoryPage.tsx:86` | `py-2.5` | 64 px | Tidak |
| `RegistrationPage.tsx:35` | `py-2.5` | 64 px | Tidak |
| `TenantCollaborationPage.tsx:279` | `py-3` | 68 px | Tidak |
| `TenantParticipationPage.tsx:402` | `py-3` | 68 px | Tidak |
| `PublicLetterViewer.tsx:105` | `py-3` | 68 px | Tidak |

Verdict: 0 dari 14 header melebihi 80 px. Tiga header menyentuh tepat 80 px pada breakpoint `sm` (`h-20`), sehingga tidak ada margin jika isi bar bertambah.

### 2.6 Label aksesibilitas berbahasa Inggris

Pencarian `aria-label="..."` pada seluruh cakupan menghasilkan 43 kemunculan. Semuanya berbahasa Indonesia.

| Pemeriksaan | Jumlah | Bukti |
|---|---|---|
| Total `aria-label` | 43 | Hasil agregasi `grep -rn "aria-label=" ... | sed -E 's/.*aria-label=//' | sort | uniq -c` |
| `aria-label="Toggle ..."` atau padanan Inggris | 0 | Tidak ditemukan |
| Label toggle tema | 14 | `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}` mis. `GalleryHeader.tsx:31`, `PublicLetterViewer` tidak punya |
| Label menu mobile | 1 | `CommunityLandingPage.tsx:257` `aria-label={mobileNavOpen ? 'Tutup menu' : 'Buka menu'}` |

Catatan kualitas: label toggle tema menyebut keadaan tujuan ("Mode terang" saat tema gelap aktif), bukan aksi. Ini konsisten di 14 tempat sehingga bukan pelanggaran bahasa, tetapi tetap menyimpang dari pola label aksi yang dipakai tombol lain.

### 2.7 Tombol menu tanpa label teks

| Panel mobile | Jumlah hamburger | path:line dan kutipan | Verdict |
|---|---|---|---|
| Panel mobile `CommunityLandingPage` | 1 | `:257` `aria-label={mobileNavOpen ? 'Tutup menu' : 'Buka menu'}` dengan ikon `Menu` / `X` (`:260`) | Bukan hamburger telanjang: punya nama aksesibel Indonesia. Namun tidak ada label teks terlihat, hanya ikon |
| Header lain (`EventsLandingPage`, `GalleryHeader`, dan 12 header lain) | 0 | Tidak ada tombol menu | Tidak berlaku |

Verdict: 0 hamburger tanpa nama aksesibel. 1 hamburger icon-only dengan `aria-label` Indonesia. Temuan terkait: `EventsLandingPage` tidak punya hamburger sama sekali padahal nav-nya disembunyikan di bawah `md` (`:561` `hidden ... md:flex`), sehingga pada layar kecil header `/events` tidak menyediakan navigasi rute apa pun selain tombol "Komunitas".

---

## Bagian 3 - Ringkasan

(a) Jangkauan navigasi. Dari 15 halaman yang diaudit, 11 halaman memiliki header dengan tepat satu tujuan keluar: 8 hanya menuju `/` (`NewsIndexPage`, `DocsPage`, `SponsorLandingPage`, `TenantDirectoryPage`, `TenantCollaborationPage`, `TenantParticipationPage`, `RegistrationPage`, `PublicLetterViewer`), 2 hanya menuju `/events` (`EventPublicDetailPage`, `EventSubmissionPage`), dan 1 hanya menuju `/news` (`NewsArticlePage`). Akibatnya 9 halaman tidak dapat menjangkau `/events` dari header, dan 13 dari 15 halaman tidak dapat menjangkau `/gallery`, `/news`, `/sponsor`, atau `/tenants` dari header. Hanya `CommunityLandingPage` yang header-nya menjadi hub penuh (17 tujuan termasuk 9 rute), `EventsLandingPage` menengah (4 rute), dan dua halaman galeri berbagi `GalleryHeader` dengan 2 rute.

(b) Pelanggaran aturan keras. Tiga kategori: (1) em-dash pada teks user, 7 kemunculan di 5 file, 5 di antaranya tanpa pembenaran `DESIGN.md`; (2) nav lebih dari 80 px, 0 dari 14 header, dengan 3 header tepat di batas 80 px; (3) dua CTA atau lebih untuk satu intent, 3 grup (`/daftar` dengan 4 label, `/events` dengan 4 label, `/` dengan 4 label) ditambah 1 tabrakan penamaan antara `/ajukan-event` dan `/kolaborasi-tenant`. En-dash terlihat user 0, `h-screen` 0.

(c) Temuan kualitas. Sembilan eyebrow di atas heading, 8 di antaranya berada di halaman satu-section dengan rasio 1 berbanding 1, dan satu eyebrow (`NewsIndexPage:85`) mengulang teks H1 tepat di bawahnya. Label aksesibilitas berbahasa Inggris 0 dari 43 `aria-label`. Hamburger telanjang 0, dengan 1 tombol menu icon-only yang sudah berlabel Indonesia. Temuan tambahan: hero `/` memakai `min-h-[100svh]` dan bukan `min-h-[100dvh]` (`CommunityHero.tsx:95`), hero `/events` tanpa tinggi viewport (`EventsLandingPage.tsx:599`), 8 header merender logo sebagai `img` tanpa tautan, dan header `/events` tidak punya navigasi rute di mobile.

---

## Cara verifikasi

Semua angka di laporan ini berasal dari perintah berikut, dijalankan dari root repo `D:/Andy/Antigravity/schedule-event-v2`. Rentang cakupan: `src/pages` dan `src/components/community`, dengan `grep -v "__tests__"` pada setiap perintah.

1. Em-dash dan en-dash, terpisah per karakter (PCRE2, escape hex supaya tidak perlu menulis karakter aslinya):
   `grep -rnP '\x{2014}' src/pages src/components/community --include=*.tsx --include=*.ts | grep -v "__tests__" | wc -l`
   `grep -rnP '\x{2013}' src/pages src/components/community --include=*.tsx --include=*.ts | grep -v "__tests__" | wc -l`
   Rincian per folder:
   `grep -rnP '\x{2014}' src/pages --include=*.tsx | grep -v "__tests__" | wc -l`
   `grep -rnP '\x{2014}' src/components/community --include=*.tsx | grep -v "__tests__" | wc -l`
   `grep -rnP '\x{2014}' src/components/community --include=*.ts | grep -v "__tests__" | wc -l`
2. Daftar baris untuk klasifikasi komentar versus teks user:
   `grep -rnP '[\x{2014}\x{2013}]' src/pages src/components/community --include=*.tsx --include=*.ts | grep -v "__tests__"`
3. Em-dash pada atribut aksesibilitas:
   `grep -rnP 'aria-label="[^"]*[\x{2014}\x{2013}]|alt="[^"]*[\x{2014}\x{2013}]|placeholder="[^"]*[\x{2014}\x{2013}]|title="[^"]*[\x{2014}\x{2013}]' src/pages src/components/community --include=*.tsx | grep -v "__tests__"`
4. Eyebrow:
   `grep -rn "uppercase tracking-" src/pages --include=*.tsx | grep -v "__tests__" | wc -l`
   `grep -rn "uppercase tracking-" src/components/community --include=*.tsx | grep -v "__tests__" | wc -l`
   `grep -rn "tracking-\[0\.3em\]" src/pages --include=*.tsx | grep -v "__tests__"`
   `grep -rn "eyebrow(\|CommunityEyebrow" src/pages src/components/community --include=*.tsx | grep -v "__tests__"`
5. CTA dan tujuan:
   `grep -rn "to=\"/\|href=\"#\|href=\"/" src/pages --include=*.tsx | grep -v "__tests__"`
   `grep -rn "Daftar Event\|Daftarkan Event\|Ajukan Event\|Ajukan Kolaborasi\|Kirim Pendaftaran\|Cek Event\|Lihat Semua\|Jadwal Event\|Unduh PDF\|Hubungi Kami" src/pages src/components/community --include=*.tsx | grep -v "__tests__"`
   `grep -rn "Kembali ke Beranda\|Kembali ke Berita\|Kembali ke Galeri\|Kembali ke Komunitas\|Kembali ke Jadwal Event" src/pages src/components/community --include=*.tsx | grep -v "__tests__"`
6. Tinggi viewport:
   `grep -rn "[\"' ]h-screen" src/pages src/components/community --include=*.tsx | grep -v "__tests__" | grep -v "min-h-screen" | wc -l`
   `grep -rn "min-h-screen" src/pages src/components/community --include=*.tsx | grep -v "__tests__" | wc -l`
   `grep -rn "100vh\|100dvh\|100svh\|min-h-\[" src/pages src/components/community --include=*.tsx | grep -v "__tests__"`
7. Tinggi nav:
   `grep -rn "<header\|</header>\|h-16\|h-20\|py-3\|py-2.5" src/pages/*.tsx src/components/media/GalleryHeader.tsx | grep -v "__tests__"`
8. Label aksesibilitas:
   `grep -rn "aria-label=" src/pages src/components/community --include=*.tsx | grep -v "__tests__" | sed -E 's/.*aria-label=//' | sort | uniq -c | sort -rn`
   `grep -rn "aria-label=\"" src/pages src/components/community --include=*.tsx | grep -v "__tests__" | grep -i "toggle\|close\|open\|menu\|back\|search\|download\|submit\|next\|previous\|copy\|share\|expand\|collapse\|filter\|sort"`
9. Hamburger:
   `grep -rn "Buka menu\|Tutup menu\|aria-expanded" src/pages src/components/community --include=*.tsx | grep -v "__tests__"`
   `grep -rn "Menu," src/pages src/components/community --include=*.tsx | grep -v "__tests__"`
10. Tinggi bar dihitung dari kelas Tailwind (`h-16` = 64 px, `h-20` = 80 px, `py-2.5` = 10 px per sisi, `py-3` = 12 px per sisi, `h-9` = 36 px, `h-11` = 44 px) dan elemen tertinggi di dalam bar. Tidak ada pengukuran browser yang dijalankan pada audit ini.
