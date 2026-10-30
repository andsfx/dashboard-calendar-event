# Header publik bersama untuk seluruh halaman publik

Written against: bc6f624
Status: plan only. Tidak ada file `src/**` yang dibuat atau diubah oleh plan ini.

## (a) Masalah yang dibuktikan

### a.1 Setiap halaman membawa header sendiri, dan tiap header hanya menunjuk ke satu atau dua tujuan

Inventaris `<header>` publik (16 komponen untuk 15 rute, karena `/events` dan `/events/:id` punya header terpisah):

| Rute | Header | Tinggi | Lebar kontainer | z-index | Tujuan tautan di header |
|---|---|---|---|---|---|
| `/` | `src/pages/CommunityLandingPage.tsx:199`, bar `:201` | `h-16 sm:h-20` | `max-w-7xl` | `z-50` | anchor `#hero` + 4 entri `NAV_ENTRIES` |
| `/events` | `src/pages/EventsLandingPage.tsx:551`, bar `:552` | `h-16 sm:h-20` | `max-w-7xl` | `z-50` | `#featured`, `#calendar`, `/ajukan-event`, `/sponsor`, `/daftar`, `/` |
| `/events/:id` | `src/pages/EventPublicDetailPage.tsx:120`, bar `:121` | konten (`py-2.5 sm:py-3`) | `max-w-7xl` | `z-50` | `/events` |
| `/gallery`, `/gallery/:slug` | `src/components/media/GalleryHeader.tsx:14` | `h-16 sm:h-20` | `max-w-7xl` | `z-50` | `/` (`:17`), `/events` (`:37`) |
| `/news` | `src/pages/NewsIndexPage.tsx:56`, bar `:57` | konten (`py-2.5`) | `max-w-7xl` | `z-40` | `/` (`:73`) |
| `/news/:slug` | `src/pages/NewsArticlePage.tsx:61`, bar `:62` | konten (`py-2.5`) | `max-w-7xl` | `z-40` | `/news` (`:78`) |
| `/pameran` | `src/pages/ExhibitionsLandingPage.tsx:109`, bar `:110` | konten (`py-3`) | `max-w-7xl` | `z-40` | `/` (`:117`) |
| `/tenants` | `src/pages/TenantDirectoryPage.tsx:85`, bar `:86` | konten (`py-2.5`) | `max-w-7xl` | `z-40` | `/` (`:102`) |
| `/community` | `src/pages/CommunityDirectoryPage.tsx:132`, bar `:133` | konten (`py-2.5`) | `max-w-7xl` | `z-40` | `/` (`:149`) |
| `/docs` | `src/pages/DocsPage.tsx:130`, bar `:131` | konten (`py-2.5`) | `max-w-7xl` | `z-40` | `/` (`:149`) |
| `/sponsor` | `src/pages/SponsorLandingPage.tsx:132`, bar `:133` | konten (`py-2.5`) | `max-w-7xl` | `z-40` | `/` (`:149`) |
| `/daftar` | `src/pages/RegistrationPage.tsx:34`, bar `:35` | konten (`py-2.5`) | `max-w-7xl` | `z-40` | `/` (`:49`) |
| `/ajukan-event` | `src/pages/EventSubmissionPage.tsx:157`, bar `:158` | konten (`py-2.5 sm:py-3`) | `max-w-3xl` | `z-50` | `/events` |
| `/kolaborasi-tenant` | `src/pages/TenantCollaborationPage.tsx:278`, bar `:279` | konten (`py-3`) | `max-w-5xl` | `z-40` | `/` |
| `/partisipasi-tenant` | `src/pages/TenantParticipationPage.tsx:401`, bar `:402` | konten (`py-3`) | `max-w-5xl` | `z-40` | `/` |
| `/letter/:id` | `src/pages/PublicLetterViewer.tsx:104`, bar `:105` | konten (`py-3` + dua baris teks) | `max-w-7xl` | `z-10` | `/` (tombol ikon `:109`) + aksi `Unduh PDF` (`:130`) |

Konsekuensi yang bisa dibuktikan: dari `/gallery` tidak ada jalan ke `/news`, `/tenants`, `/pameran`, `/docs`, `/sponsor` karena satu-satunya tujuan di `GalleryHeader` adalah `/` (`GalleryHeader.tsx:17`) dan `/events` (`:37`). Sama untuk `/news`: satu-satunya tautan adalah `/` (`NewsIndexPage.tsx:73`). `DocsPage` hanya punya `/` di header (`DocsPage.tsx:149`), sedangkan `/events` dan `/sponsor` yang disebut di footer (`DocsPage.tsx:364`, `:367`) berada di luar header.

### a.2 Header tidak seragam secara visual

Tiga permukaan memakai tinggi tetap 80px di `sm` (`CommunityLandingPage.tsx:201`, `EventsLandingPage.tsx:551`, `GalleryHeader.tsx:14`), tiga belas lainnya tinggi mengikuti konten dengan padding `py-2.5` atau `py-3` (contoh `DocsPage.tsx:131`, `PublicLetterViewer.tsx:105`). Padding horizontal juga bercabang tiga: `px-3` (`CommunityDirectoryPage.tsx:133`), `px-4` (`ExhibitionsLandingPage.tsx:110`), dan `px-4 sm:px-6` (`EventsLandingPage.tsx:552`). Lebar kontainer bercabang tiga: `max-w-7xl`, `max-w-5xl` (`TenantCollaborationPage.tsx:279`, `TenantParticipationPage.tsx:402`), `max-w-3xl` (`EventSubmissionPage.tsx:158`). z-index bercabang tiga: `z-10` (`PublicLetterViewer.tsx:104`), `z-40`, `z-50`. Akibatnya logo dan tombol tema bergeser posisi setiap kali pengunjung berpindah halaman.

### a.3 Tidak ada slot untuk aksi dan anchor milik halaman

`PublicLetterViewer` menaruh tombol `Unduh PDF` di dalam header (`PublicLetterViewer.tsx:130-137`), dan `/events` menaruh anchor `#featured`/`#calendar` di dalam header (`EventsLandingPage.tsx:562-566`). Keduanya hardcoded per halaman, jadi tidak ada cara berbagi header tanpa menyalin markup.

## (b) Keputusan desain

### b.1 `publicNav.ts` sebagai sumber tunggal tujuan

- `PUBLIC_PRIMARY_LINKS`: `Jadwal Event` `/events`, `Galeri` `/gallery`, `Berita` `/news`, `Pameran` `/pameran`, `Tenant` `/tenants`.
- `PUBLIC_SECONDARY_LINKS`: `Direktori Komunitas` `/community`, `Sponsor` `/sponsor`, `Kolaborasi Tenant` `/kolaborasi-tenant`, `Booth & Voucher` `/partisipasi-tenant`, `Dokumentasi` `/docs`.
- `PUBLIC_CTA`: `{ label: 'Daftar Event', to: '/daftar' }`.
- Tidak ada entri ke `/`; logo yang menanganinya.
- `isPublicNavActive(pathname, to)`: `to === '/'` pakai exact match, lainnya `pathname === to || pathname.startsWith(to + '/')`. Komentar di atas fungsi menyebut aturan rute turunan: `/events/:id` dipegang `Jadwal Event`, `/gallery/:slug` dipegang `Galeri`, `/news/:slug` dipegang `Berita`, `/pameran/:id` dipegang `Pameran`, dan hanya satu link boleh aktif. Aturan prefix `to + '/'` mencegah tabrakan yang mirip: `/tenant-survey` tidak cocok dengan `/tenants`, `/newsletter` tidak cocok dengan `/news`.

### b.2 Slot `actions`

`actions?: ReactNode` dirender sebagai anak pertama klaster kanan, dengan urutan `{actions}` lalu toggle tema lalu CTA `Daftar Event` lalu tombol menu. Alasan urutan ini: aksi halaman (misalnya `Unduh PDF`) bersifat lokal dan tidak boleh menggeser posisi kontrol global, sehingga toggle dan CTA tetap di tempat yang sama di semua halaman; CTA konversi tetap elemen paling kanan di desktop. Tidak ada pembungkus tambahan: `actions` dirender apa adanya agar halaman bebas memakai `ui-btn-primary` atau tombol outline.

### b.3 Slot `sectionLinks`

`sectionLinks?: ReadonlyArray<{ label: string; href: string }>` dirender sebagai `<a href>` biasa (bukan `<Link>`), `hidden xl:flex`, ditempatkan setelah lima link primer dan setelah dropdown `Jelajahi`. Alasannya: navigasi global dulu, anchor milik halaman paling dekat ke klaster aksi di kanan.

Satu konsekuensi harus dinyatakan terbuka: pada 1024 sampai 1279 px `sectionLinks` tidak tampil di bar (bar hanya `xl:flex`) dan panel mobile juga tidak tampil (panel `lg:hidden`). Jadi di rentang itu anchor halaman tidak ada di header. Ini tidak melanggar syarat "nav utama selalu terjangkau" karena link primer tampil dari `lg` dan panel menutup semua lebar di bawah `lg`. Bila audit paralel menemukan halaman yang bergantung pada anchor header di lebar laptop, `sectionLinks` bisa dipindah ke `lg:flex`; anggaran di bagian (b.7) menunjukkan masih muat dengan sisa 192 px pada 1024 px.

### b.4 Breakpoint nav

Nav desktop `hidden lg:flex` (1024 px), panel menu untuk semua lebar di bawah 1024 px. Angka pembuktian ada di bagian "Anggaran lebar 1024px". Tidak ada rentang lebar tanpa akses: di atas 1024 px nav ada di bar, di bawah 1024 px semua tujuan ada di panel.

Catatan perubahan perilaku: `/events` sekarang menampilkan nav-nya dari `md` (`EventsLandingPage.tsx:561`). Setelah header bersama dipakai, 768 sampai 1023 px memakai panel. Ini konsekuensi langsung dari `lg` dan sudah diperhitungkan (anchor `#featured`/`#calendar` tetap ada di panel pada rentang itu).

### b.5 CTA di `/daftar`

CTA `Daftar Event` tidak dirender bila `pathname === '/daftar'`, baik di bar maupun sebagai item di panel mobile. Alasannya tautan ke halaman sendiri. Pengecekan memakai `useLocation().pathname` dan perbandingan exact, bukan `isPublicNavActive`, karena `/daftar` bukan rute beranak.

### b.6 Active state

- `aria-current="page"` hanya pada link yang aktif; maksimum satu link aktif per render, dijamin oleh `isPublicNavActive` yang memakai prefix utuh (`to + '/'`) dan daftar tujuan yang tidak saling bersarang.
- Kelas aktif: `text-[var(--brand-tosca-600)] dark:text-[var(--brand-tosca-soft)]`.
- Kelas non-aktif: `text-slate-600 dark:text-slate-300`, hover `text-[var(--brand-tosca)]` / `dark:hover:text-[var(--brand-tosca-soft)]`.
- Kontras terukur: aktif terang `#007a78` di atas komposit `ui-dashboard-chrome` (kartu `#fffdf9` 88% di atas paper `#f8f7f0`) = 5.05:1; aktif gelap `#33a8a5` di atas `rgb(22 33 27 / 0.88)` di atas slate-950 = 5.82:1. Keduanya lulus AA untuk teks 13 px. CTA putih di atas `--brand-tosca-600` = 5.18:1 (sudah didokumentasikan di `DESIGN.md`).

### b.7 Struktur komponen dan kelas

- `<header className="ui-dashboard-chrome sticky top-0 z-50 border-b">` (kelas sudah ada di `src/styles/utilities.css:135`).
- Bar: `mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6 ${widthClass}` dengan `widthClass` default `'max-w-7xl'`. Tinggi 64 px tetap, tanpa `sm:h-20`. Header total 65 px termasuk border 1 px, dan panel memakai `max-h-[calc(100dvh-4rem)]`.
- Logo: `<Link to="/" aria-label="Beranda Metropolitan Mall Bekasi">` berisi `<img src={mallLogo} alt="" aria-hidden="true" className="h-8 w-auto" />` di dalam pembungkus `shrink-0 rounded-full ui-focus-ring`. `alt=""` dipilih karena nama aksesibel sudah dibawa `aria-label` pada link; alt berisi teks akan diumumkan dua kali di beberapa screen reader.
- Klaster kanan: `flex shrink-0 items-center gap-2`.
- Toggle tema: `h-11 w-11`, `rounded-full`, ikon `SunMedium`/`Moon` dengan `aria-hidden="true"`, `aria-label={isDark ? 'Mode terang' : 'Mode gelap'}`, `ui-focus-ring`.
- CTA: `ui-btn-primary ui-focus-ring inline-flex items-center rounded-full px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap hidden sm:inline-flex`. `ui-btn-primary` sudah menyetel latar `--brand-tosca-600`, warna putih, hover `--brand-tosca-dark`, dan `:focus-visible` (lihat `src/styles/utilities.css:85-111`), jadi tidak ada kelas CTA baru yang dikarang.
- Tombol menu: `lg:hidden inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold`, ikon `Menu`/`X` `aria-hidden="true"` plus `<span>Menu</span>`, `aria-expanded`, `aria-controls="public-site-nav"`, `aria-label` "Buka menu"/"Tutup menu".
- Panel: `id="public-site-nav"`, `mx-auto ${widthClass}` dengan padding `px-4 sm:px-6 pb-3`, panel `rounded-2xl border border-black/8 bg-white p-2 shadow-... dark:bg-slate-900 dark:border-slate-700 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain`. Tiap item `min-h-11`. Kelompok: link primer, heading `Jelajahi` untuk sekunder, heading `Di halaman ini` untuk `sectionLinks`.
- Perilaku panel: fokus pindah ke link pertama saat dibuka (ref + `useEffect`), Escape menutup dan mengembalikan fokus ke tombol menu (listener `keydown` di `document`, dibersihkan saat unmount), item ditutup saat diklik, panel dan dropdown ditutup saat `pathname` berubah (header tidak remount antar rute).
- Dropdown memakai `NavDropdown` yang sudah ada (`src/components/nav/NavDropdown.tsx:55`) dengan `pinned`, `items` hasil map `PUBLIC_SECONDARY_LINKS` menjadi `{ label, href, route: true }`, dan satu state `openMenu` agar hanya satu panel terbuka.
- Radius: interaktif `rounded-full`, panel `rounded-2xl`. Tidak ada sistem radius lain.
- Copy: hanya hyphen biasa. Tidak ada em dash atau en dash, tidak ada dot dekoratif, tidak ada label versi, tidak ada strip lokasi/waktu.
- Tipe balik: `JSX.Element` tidak tersedia global di `@types/react` 19.2.14 (namespace `JSX` hanya di dalam `React`, tidak ada `declare global`), sehingga signature harus `import type { JSX } from 'react'` lalu `: JSX.Element`. Dibuktikan dengan `tsc`: bentuk tanpa import gagal `TS2503: Cannot find namespace 'JSX'`, bentuk dengan import lolos tanpa error.

### b.8 Batas `widthClass` (konsekuensi terukur)

`widthClass` mengatur lebar bar, jadi ia juga membatasi ruang nav desktop. Dengan anggaran di bawah, nav butuh 657 px ruang. `max-w-5xl` (kontainer 1024 px, ruang 976 px) aman. `max-w-3xl` (kontainer 768 px, ruang 720 px) hanya menyisakan 63 px dan gagal begitu halaman menambahkan satu aksi 123 px. Aturan yang akan ditulis sebagai komentar prop: `widthClass` minimal `max-w-5xl` untuk halaman yang memakai `actions`; `max-w-3xl` hanya untuk header tanpa aksi.

## Anggaran lebar 1024 px (jawaban pertanyaan konkret)

Metode: lebar teks diukur di Chromium headless dengan font produksi `public/fonts/geist-latin.woff2`, `font-size: 13px`, `font-weight: 500` untuk link dan `600` untuk CTA, `white-space: nowrap`, diukur lewat `getBoundingClientRect().width`. Logo diukur dari `src/assets/brand/LOGOMETMAL2016-01.svg` (intrinsik 3508 x 2480) pada `height: 32px; width: auto`.

| Elemen | Teks (px) | Padding (px) | Lebar (px) |
|---|---|---|---|
| Logo `h-8 w-auto` | - | - | 45.25 |
| `Jadwal Event` | 75.63 | 20 (`px-2.5`) | 95.63 |
| `Galeri` | 34.38 | 20 | 54.38 |
| `Berita` | 34.45 | 20 | 54.45 |
| `Pameran` | 51.63 | 20 | 71.63 |
| `Tenant` | 39.48 | 20 | 59.48 |
| Trigger `Jelajahi` | 43.39 | 16 (`px-2`) + 4 (`gap-1`) + 16 (chevron) | 79.39 |
| Toggle tema | - | - | 44.00 |
| CTA `Daftar Event` | 73.13 | 28 (`px-3.5`) | 101.13 |

Penjumlahan pada 1024 px:

- Ruang tersedia: `1024 - 2 x 24` (`sm:px-6`) = **976 px**. `max-w-7xl` (1280 px) tidak mengikat di lebar ini.
- Nav: 95.63 + 54.38 + 54.45 + 71.63 + 59.48 + 79.39 = 414.96, ditambah 5 jarak `gap-1` (20) = **434.96 px**.
- Klaster kanan tanpa aksi: 44 + 8 (`gap-2`) + 101.13 = **153.13 px**.
- Jarak antar tiga blok bar: 2 x 12 (`gap-3`) = **24 px**.
- Total kebutuhan: 45.25 + 434.96 + 153.13 + 24 = **657.34 px**.

Kesimpulan: **muat satu baris tanpa wrap pada 1024 px, sisa 318.66 px (32.6% ruang).** Breakpoint `lg` (1024 px) dipertahankan; panel menu dipakai di bawah 1024 px.

Kasus dengan slot `actions` terisi (contoh `Unduh PDF`: 32 padding + 16 ikon + 8 gap + 66.75 teks = 122.75 px):

- Satu aksi: total 788.09 px, sisa **187.91 px**.
- Dua aksi: total 910.84 px, sisa **65.16 px**. Masih muat, jadi `actions` perlu dijaga tetap maksimal dua tombol pendek.
- Dengan `sectionLinks` dua entri (`Sorotan` 46.38 + 20, `Kalender` 52.17 + 20, ditambah 2 jarak `gap-1` 8 = 118.55 px) pada `xl`: total 783.89 px di lebar 1280 px (ruang 1232 px), sisa 448 px.

Batas bawah teoretis agar nav muat: 657.34 + 48 padding = 705 px viewport. Karena nav baru tampil di 1024 px, tidak ada risiko wrap di breakpoint mana pun yang benar-benar dipakai.

Pengaman anti-wrap yang akan ditulis di komponen: tidak ada `flex-wrap` di bar maupun di nav; logo dan klaster kanan `shrink-0`; nav `shrink-0`; semua label `whitespace-nowrap`; hanya `actions` yang boleh menyusut dan ia diberi `min-w-0`.

## (c) File yang akan dibuat

1. `src/components/nav/publicNav.ts` (baru). Interface `PublicNavLink`, `PUBLIC_PRIMARY_LINKS`, `PUBLIC_SECONDARY_LINKS`, `PUBLIC_CTA`, `isPublicNavActive`.
2. `src/components/nav/PublicSiteHeader.tsx` (baru). Props `isDark`, `onToggleDark`, `actions`, `sectionLinks`, `widthClass`. Mengimpor `NavDropdown` yang sudah ada, `mallLogo`, ikon `lucide-react`, `Link`/`useLocation` dari `react-router-dom`.
3. `src/components/nav/__tests__/PublicSiteHeader.test.tsx` (baru). Render di dalam `MemoryRouter` mengikuti pola `src/components/nav/__tests__/NavDropdown.test.tsx`.

Rencana tes (semua di satu file, plus `isPublicNavActive`):

- `/gallery` memberi `aria-current="page"` pada `Galeri`; `/gallery/album-x` juga; `/news` tidak.
- `/events/evt-1` membuat `Jadwal Event` aktif dan tepat satu link ber-`aria-current="page"` (`getAllByRole('link')` lalu filter `aria-current === 'page'`).
- CTA `Daftar Event` punya `href="/daftar"`; pada `/daftar` CTA tidak dirender.
- Klik toggle memanggil `onToggleDark`; `aria-label` toggle berbahasa Indonesia (`Mode gelap` saat terang, `Mode terang` saat gelap).
- Panel mobile: klik `Menu` membuat `aria-expanded="true"`, semua link primer dan sekunder ada (scope `within(panel)` karena link desktop dan panel berbagi nama), Escape menutup dan fokus kembali ke tombol menu.
- `actions` dirender; `sectionLinks` dirender sebagai anchor `#...`.
- `textContent` header tidak memuat karakter em dash atau en dash.
- `isPublicNavActive` diuji langsung: exact `/`, prefix `/events/:id`, `/gallery/:slug`, `/news/:slug`, `/pameran/:id`, dan kasus negatif `/tenant-survey` vs `/tenants`.

Catatan teknis tes: `tsconfig.json` mengecualikan `src/**/*.test.tsx`, jadi file tes tidak ikut `tsc` dan hanya ditranspilasi vitest; tetap tulis tipe yang benar. jsdom tidak menerapkan CSS, jadi elemen `hidden lg:flex` tetap ada di DOM; tes harus selalu memberi scope lewat `within()` pada panel saat panel terbuka, dan menutup panel sebelum menghitung link desktop.

## (d) Yang tidak disentuh

- `src/App.tsx`, `src/components/nav/NavDropdown.tsx`, `src/components/nav/ScrollToTop.tsx`, dan semua 16 header yang ada. Pemasangan header ke halaman adalah tiket berikutnya.
- `src/styles/utilities.css`: `ui-dashboard-chrome`, `ui-btn-primary`, `ui-focus-ring` sudah ada, tidak ada kelas baru.
- `src/components/media/GalleryHeader.tsx` dan `src/pages/EventsLandingPage.tsx` (hanya dibaca sebagai contoh kelas CTA dan bukti anchor).
- Tes lama `src/components/nav/__tests__/NavDropdown.test.tsx` dan `ScrollToTop.test.tsx` tidak diubah.
- `DESIGN.md`, `AGENTS.md`, `CHANGELOG.md` tidak diubah oleh tiket ini (pembaruan dokumen menyusul saat pemasangan header, karena perilaku visual baru baru terlihat setelah dipakai halaman).
- Tidak ada perubahan data, API, hook, atau token.

## (e) Kriteria verifikasi

1. `npm run build` menghasilkan 0 error TypeScript dan Vite selesai.
2. `NODE_ENV=test npx vitest run src/components/nav` lulus untuk tiga file: `NavDropdown.test.tsx`, `ScrollToTop.test.tsx`, dan `PublicSiteHeader.test.tsx`.
3. Bukti 1024 px: hitungan di atas (657.34 px kebutuhan vs 976 px tersedia) ditambah smoke di dev server pada lebar 1024 px yang menunjukkan nav satu baris, tanpa scroll horizontal, dan tanpa `flex-wrap`. Pada 768 px dan 375 px nav hanya muncul di panel.
4. `git status --short` hanya menambah tiga file baru di `src/components/nav/` (plus dokumen plan ini). Tidak ada file lain yang berubah.
5. Pemeriksaan copy: tidak ada karakter em dash atau en dash di seluruh teks UI, tidak ada dot dekoratif, tidak ada label versi, tidak ada strip lokasi/waktu.
6. Pemeriksaan a11y manual di dev server: Tab menyusuri logo, 5 link primer, dropdown, toggle, CTA, tombol menu dengan ring fokus tosca; Escape di panel mengembalikan fokus ke tombol menu; panel dapat digulir di tinggi 640 px tanpa memotong item terakhir.
7. Kontras: link aktif 5.05:1 (terang) dan 5.82:1 (gelap), CTA 5.18:1. Sudah diukur, tidak perlu diubah.

## Risiko dan pertanyaan terbuka (menunggu audit paralel)

1. `sectionLinks` pada 1024 sampai 1279 px tidak tampil di header (bagian b.3). Bila audit menunjukkan halaman yang butuh anchor header di lebar laptop, pindahkan ke `lg:flex`; anggaran menunjukkan masih muat (sisa 192 px dengan dua anchor, turun ke 69 px bila satu aksi 123 px ikut dirender).
2. `/ajukan-event` tidak punya entri di daftar primer maupun sekunder yang diberikan brief, padahal hari ini tautannya ada di header `/events` (`EventsLandingPage.tsx:567`). Perlu keputusan pemilik: masukkan ke sekunder, atau biarkan hanya lewat `/events` dan footer.
3. `/letter/:id` memakai header dua baris (judul surat + tanggal, `PublicLetterViewer.tsx:115-127`). Slot `actions` hanya menampung tombol, jadi judul surat harus pindah ke badan halaman saat pemasangan. Ini mengubah tampilan halaman itu dan perlu dikonfirmasi.
4. Header bersama menurunkan tinggi bar dari 80 px menjadi 64 px di tiga permukaan. Anchor halaman memakai `scroll-mt-28` (112 px, `EventsLandingPage.tsx:774`, `:908`), jadi offset masih cukup; tetap perlu smoke visual pada hero `/` dan `/events` setelah pemasangan.
5. Rute publik yang belum jelas apakah ikut memakai header bersama: `/survey/:eventId`, `/tenant-survey`, `/tenant-survey/:eventId`, `/tenant-survey-results` (anonim, alur formulir). Daftar 15 halaman pada brief tidak menyebutnya; plan ini tidak memutuskan.
