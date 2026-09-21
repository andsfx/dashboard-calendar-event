# Audit Design-Taste — permukaan publik (2026-09-20)

Metode: pembacaan statis terhadap skill `design-taste-frontend` (Section 0-14)
+ pembacaan langsung kode permukaan publik. Semua temuan punya `file:line`.
**Fase audit** ini tidak mengubah file sumber dan tidak menjalankan gate a11y
(port dimiliki sesi lain). **Fase remediasi** setelahnya (lihat §2.A) memang
mengubah file sumber dan menjalankan gate — hasilnya tercatat di §2 dan §3.

> **Revisi 2026-09-20 (pasca-ukur).** Tiga klaim di §4 diuji ulang dengan
> pengukuran render nyata (Vite dev `:5177`, viewport tepat 1280px). Hasilnya
> mengoreksi dokumen ini: nav `/events` & `/gallery` **melebihi cap 80px**
> (M9, sebelumnya ditandai PASS), hero `<h1>` **3 baris** di 1280px (M10),
> dan `--section-alt` **tetap terang di mode gelap** pada 4 section (M11).
> Angka di bawah adalah hasil `getBoundingClientRect()` /
> `getComputedStyle()`, bukan estimasi dari kelas padding.

Proyek punya sistem desainnya sendiri (`DESIGN.md`, `src/styles/*.css`). Sistem
itu **bukan** otoritas dalam audit ini: vonis di bawah datang dari skill.
Keberadaan token lokal hanya dipakai sebagai bukti implementasi, bukan pembenar.

---

## 1. Brief read + dial

### 1.A Sinyal yang dibaca (Section 0.A)

| Sinyal | Isi |
|---|---|
| Page kind | Landing/venue marketing + direktori + berita/galeri + form pengajuan publik. Bukan dashboard. |
| Vibe words di kode | `community-campaign`, `editorial`, `Split Studio`, "Graphify warm", "Metmal tosca" |
| Referensi yang ada | Logo asli (`src/assets/brand/LOGOMETMAL2016-01.svg`), foto asli di DB (poster, album, area, tenant), nomor WA/email kantor asli |
| Audience | Komunitas lokal Bekasi (sekolah, EO, kampus, NGO, perusahaan), brand sponsor, pengunjung mall |
| Brand assets | Sudah ada: logo, tosca `#00918e`, pink `#e24378`, krem `#f8f7f0` |
| Quiet constraints | Venue fisik nyata, audiens publik Indonesia, trust-first (data kontak & pengajuan), aksesibilitas sudah digarap serius |

### 1.B Design Read (Section 0.B, satu baris)

> Reading this as: **situs komunitas/venue event untuk audiens lokal Bekasi**
> (komunitas, EO, sekolah, brand sponsor), dengan **bahasa campaign hangat +
> editorial**, mengarah ke **Tailwind v4 utilities + token brand sendiri
> (tosca/krem), display Bricolage Grotesque + body Geist**.

### 1.C Tiga dial (Section 1)

| Dial | Nilai | Alasan |
|---|---|---|
| `DESIGN_VARIANCE` | **5** | Sinyal tarik-menarik: "landing/marketing" (7-9) vs "trust-first / venue publik" (3-4). Ini venue nyata dengan form pengajuan & data tenant asli, jadi sisi institusional yang menang. Grid rapi, split-header asimetris (`1.05fr/0.95fr`, `2fr/3fr`) tapi tidak ada chaos. |
| `MOTION_INTENSITY` | **4** | Reveal-on-scroll, count-up, hero entrance, ping dot. Semua CSS/IntersectionObserver, `prefers-reduced-motion` dihormati. Band "Fluid CSS" (4-7). |
| `VISUAL_DENSITY` | **4** | `py-16`..`py-32`, `max-w-7xl`, banyak ruang. Band "Daily App". |

Catatan gating: `DESIGN_VARIANCE = 5 > 4` → **4.3 anti-center bias berlaku**.
`MOTION_INTENSITY = 4` (tidak `> 4`) → "motion claimed = motion shown" tidak
memaksa, tapi motion tetap ada. Semua aturan keras (9.G, 4.7, split-header,
eyebrow, theme lock) tidak digate dial.

---

## 2. Ringkasan

Status remediasi diukur 2026-09-20 (pasca-perbaikan): gate `npm run test:a11y`
**14 passed**, 0 violations; `npx tsc --noEmit` exit **0**; `npx vitest run`
**518 passed / 74 files**. Semua status di bawah dibuktikan lewat **pengukuran**
(browser dev pada 1280px, `grep`, gate) — bukan dengan membaca komentar kode.

| Kategori | Jumlah |
|---|---|
| Critical | 1 |
| Major | 11 |
| Minor | 11 |
| Nit | 2 |

| # | Rule | Temuan | Verdict | Severity |
|---|---|---|---|---|
| C1 | 9.G | Em-dash `—` di footer 8 berkas, 14 judul tab, body copy, placeholder, alt text | VIOLATION | critical |
| M1 | 4.7 | Hero stack 6+ elemen + trust-strip di dalam hero | VIOLATION | major |
| M2 | 4.7 | Subteks hero 30 kata / 5 baris / 3 paragraf (cap 20 kata, 3-4 baris) | VIOLATION | major |
| M3 | 4.7 + 9.F | Split-header (headline kiri + paragraf kanan) 3× di landing | VIOLATION | major |
| M4 | 4.7 | Section-layout-repetition: keluarga "headline + card grid" 4× | VIOLATION | major |
| M5 | 4.7 | Eyebrow /events = 4 untuk 5 section (cap 2) | VIOLATION | major |
| M6 | 4.5 | Duplicate CTA intent: 4 label untuk niat "daftar" | VIOLATION | major |
| M7 | 4.8 | Hero = teks + gradient saat tak ada gambar; 5 foto asli tak terpakai | VIOLATION | major |
| M8 | 3.A | Google Fonts via `<link>` (production) | VIOLATION | major |
| M9 | 4.7 | Nav >80px di /events & /gallery (terukur 112.66px, didorong tinggi logo) | VIOLATION | major |
| M10 | 4.7 | Hero `<h1>` = 3 baris di 1280px (cap 2 baris) | VIOLATION | major |
| M11 | 4.11 / 8 | Mode gelap: 4 section `--section-alt` tetap terang (tanpa override `.dark`) | VIOLATION | major |
| m1 | 3.C/9.E | Ikon SVG hand-rolled (check `OrganizationTypeSelector`, clipboard `EventDetailModal`) | VIOLATION | minor |
| m2 | 3.D/3.C | Toggle dark pakai glif teks `☀`/`☾` (beda dari Lucide di semua halaman lain) | VIOLATION | minor |
| m3 | 9.F | Pill/label di atas gambar (hover "Lihat Foto →"; caption di atas foto) | VIOLATION | minor |
| m4 | 4.7 | Bento/feature-grid tanpa variasi visual (kartu teks putih semua) | VIOLATION | minor |
| m5 | 4.6 | Placeholder-as-label (`TenantDirectoryPage` search) | VIOLATION | minor |
| m6 | 9.F | Middle-dot `·` >1 per baris (meta aktivasi pameran) | VIOLATION | minor |
| m7 | 4.2 | Multi-aksen di /events (emerald + amber + 8 warna kategori) | VIOLATION | minor |
| m8 | 4.11 | Band gelap di tengah halaman terang (Contact + footer) | VIOLATION | minor |
| m9 | 4.9 | Register copy: "Lihat Semua **Gallery**" vs "Galeri" di tempat lain | VIOLATION | minor |
| m10 | 9.F | Dot dekoratif untuk status non-live ("Segera Hadir") | VIOLATION | minor |
| m11 | 9.F | Panah `&rarr;` sebagai teks di label | VIOLATION | minor |
| n1 | 4.4 | `rounded-[1.6rem]` lepas dari skala radius token | VIOLATION | nit |
| n2 | 9.F | Lingkaran angka `01`-`04` di CommunitySteps | NOT-APPLICABLE (lihat 4) | nit |

### 2.A Status remediasi (pasca-perbaikan, 2026-09-20)

| # | Status | Bukti (satu baris) |
|---|---|---|
| C1 | FIXED | 8 footer `&mdash;`→`&middot;`, 13 judul tab `—`→` - `; `grep &mdash; src/` = 0. Residual publik (ekspor PDF + halaman survey publik) ditutup. **Penutupan akhir:** 43 em-dash ter-render dihapus di 21 berkas permukaan admin/dashboard (klasifikasi per-hit via AST TS); 1 nilai ter-pin test (`dashboardNavigation.tsx:213`) diselaraskan bersama literal assertion-nya (`toBe('—')`→`toBe('-')`, logika tak berubah). Sisa sah: ~294 hit komentar (exempt), 21 di dead code (0 importer), 2 regex fungsional. (lihat §3 C1) |
| M1 | FIXED | `#hero` = 4 elemen teks; strip 3-item pindah ke `<section aria-label="Keunggulan program komunitas">` di bawah hero. |
| M2 | FIXED | Subteks hero = 1 paragraf, 12 kata. |
| M3 | FIXED | Ketiga section stack vertikal (headline di atas, body di bawah `max-w-[65ch]`); terukur browser 1280px. |
| M4 | FIXED | Card-grid 1× (Gallery `:202`); Benefits = baris full-width bertumpuk, Facilities = definition grid 2 kolom `:40` (H2 + enam H3 utuh; kontras ≥4.5:1). |
| M5 | FIXED | Eyebrow `/events` = 1 di 1280px (dulu 4); cap 2. |
| M6 | FIXED | "Daftar Event" → `/daftar` (5 tempat: header/hero-primary/panel-mobile/sticky/footer); CTA sekunder "Cek Event" → `#upcoming-events` (niat berbeda: lihat jadwal, bukan mendaftar). |
| M7 | FIXED | `heroImageUrl` kosong → fallback foto bundel `hero-fallback.webp` (~208KB @1600w) + `-800.webp` (~77KB @800w) via `srcSet`; URL R2 tetap menang. Berkas **bukan** di `public/`: hidup di `src/assets/landing/` (212.980 B / 78.928 B), diimpor `CommunityHero.tsx:2-3`, jadi Vite meng-hash-nya ke `dist/assets/` (`hero-fallback-DSWbG37r.webp`, `hero-fallback-800-Bl5Rygpa.webp`). |
| M8 | FIXED | Font di-self-host: 6 woff2 (~187 KiB) di `public/fonts/`, subset latin+latin-ext saja, `font-display: swap`; tautan `fonts.googleapis.com` dihapus dari `index.html` — nol permintaan font pihak ketiga. |
| M9 | FIXED | Header 1280px: `/` 80px, `/events` 80px, `/gallery` 80px (dulu 112.66px). |
| M10 | FIXED | h1 hero = 2 line box, font 60px, line-height 63px (dulu 3 baris @80px). |
| M11 | FIXED | `.dark { --section-alt: rgba(255,255,255,0.04) }`; 4 section compute 0.04 di gelap, terang tak berubah. |
| m1 | FIXED | Lucide `Check` / `ClipboardCheck`. |
| m2 | FIXED | `SunMedium` / `Moon`. |
| m3 | FIXED | Teks dipindah ke bawah gambar. |
| m4 | FIXED | Tile ikon bertint `--brand-*` via `color-mix` di `CommunityFacilities` + `CommunityBenefits` (kartu/grid dihapus saat M4; indeks kartu lama tak berlaku). |
| m5 | FIXED | Search `TenantDirectoryPage` dapat `aria-label`. |
| m6 | FIXED | Middle-dot >1 per baris dihapus. |
| m7 | N/A (accepted) | Audit ulang: 135 hit warna off-palette di closure publik, **semua semantik** (error/danger, live, kategori, toast, success) — nol aksen dekoratif off-palette; §4.2 hanya melarang aksen dekoratif yang tak dipakai konsisten. |
| m8 | N/A (allowed exception) | Terukur 1280px: 1 transisi terang→gelap mid-page (`#contact`), bukan alternasi acak; hero gelap + footer gelap = konvensi, jadi tepat satu "switch" → carve-out §4.11 "once per page". |
| m9 | FIXED | "Lihat Semua Galeri". |
| m10 | FIXED | Blok dot dibungkus `{isLive && (...)}` di `EventsLandingPage` (`:161-170`) & `CommunityUpcomingEvents`; label/size/warna chip tak berubah. |
| m11 | FIXED | `&rarr;` dihapus → ikon Lucide. |
| n1 | FIXED | Kedua arm `mobilePanelClass` `rounded-[1.6rem]`→`rounded-3xl` (1.5rem = `--radius-card-lg`); `grep -rn 'rounded-[1.6rem]' src/` = 0. |
| n2 | N/A | NOT-APPLICABLE (lihat §4). |

Rekap §2.A (25 temuan — dihitung dari 25 baris tabel status, bukan dari mata): **FIXED 22**, **PARTIAL 0**, **DEFERRED 0**, **N/A 3**.
(C1 pindah PARTIAL → FIXED setelah 43 em-dash ter-render dihapus di 21 berkas
permukaan admin/dashboard (sisa hanya komentar/dead code/regex fungsional).
M4 DEFERRED → FIXED; tidak ada DEFERRED tersisa. M8 pindah DEFERRED → FIXED
setelah font di-self-host; m7 & m8 pindah DEFERRED → N/A setelah bukti; M6
pindah PARTIAL → FIXED setelah kedua CTA hero diberi niat berbeda — "Daftar
Event" → `/daftar` vs "Cek Event" → `#upcoming-events`; lihat §3.)

---

## 3. Temuan

### C1 — Em-dash `—` masih ada di string yang dilihat pengguna (9.G)

Section 9.G menyebut ban ini "binary: zero em-dashes" dan "if your output
contains a single `—` or `–` anywhere visible to the user, the output fails
the Pre-Flight Check". Jadi ini critical, bukan major, walaupun tidak semua
hit berada di teks yang dibaca mata.

Pemisahan yang diminta: **hit di komentar** (tidak dirender) vs **hit di
string user-visible**. Keduanya dicatat, tapi hanya yang kedua yang jadi
pelanggaran.

**A. User-visible, dirender sebagai `—` (footer `&mdash;`)** — 8 berkas:

```
src/components/GalleryAlbumPage.tsx:230   &copy; ... Metropolitan Mall Bekasi &mdash; Metland Coloring Life   (saat audit; kini :231 &middot;)
src/components/GalleryIndexPage.tsx:282   (idem; kini :280 &middot;)
src/components/NewsArticlePage.tsx:166    (idem)
src/components/NewsIndexPage.tsx:177      (idem)
src/components/RegistrationPage.tsx:71    (idem)
src/components/SponsorLandingPage.tsx:415 (idem)
src/components/TenantDirectoryPage.tsx:257(idem; kini :258 &middot;)
src/App.tsx:430                           (idem, halaman /tenant-survey)
```

**B. User-visible di judul tab (`document.title`)** — `usePageMeta` menulis
`document.title`; ini yang dibaca pengguna di tab browser:

```
src/components/CommunityLandingPage.tsx:97   'Komunitas — Metropolitan Mall Bekasi'
src/components/EventsLandingPage.tsx:328     'Jadwal Event — Metropolitan Mall Bekasi'
src/components/CommunityDirectoryPage.tsx:49 'Direktori Komunitas — Metropolitan Mall Bekasi'
src/components/TenantDirectoryPage.tsx:18    'Direktori Tenant — Metropolitan Mall Bekasi'
src/components/GalleryIndexPage.tsx:29       'Galeri Foto — Metropolitan Mall Bekasi'
src/components/GalleryAlbumPage.tsx:29       '${album.name} — Galeri Metropolitan Mall Bekasi'
src/components/NewsIndexPage.tsx:22          'Berita & Pengumuman — Metropolitan Mall Bekasi'
src/components/NewsArticlePage.tsx:26        '${article.title} — Berita Metropolitan Mall Bekasi'
src/components/ExhibitionsLandingPage.tsx:33 'Pameran & Kolaborasi — Metropolitan Mall Bekasi'
src/components/SponsorLandingPage.tsx:39     'Mitra & Sponsor — Metropolitan Mall Bekasi'
src/components/RegistrationPage.tsx:20       'Daftar Komunitas — Metropolitan Mall Bekasi'
src/components/EventSubmissionPage.tsx:54    'Ajukan Event — Metropolitan Mall Bekasi'
src/components/EventPublicDetailPage.tsx:54  '${event.acara} — Jadwal Event Metropolitan Mall Bekasi'
```

**C. User-visible di body copy** (paling jelas, dibaca di tengah halaman):

```
src/components/EventSubmissionPage.tsx:216   "Kirim pengajuanmu — tim Marcomm kami akan mereview dan menghubungimu."   (saat audit; kini :216, em-dash→titik)
src/components/ExhibitionsLandingPage.tsx:143 "...bersama tim Casual Leasing dan Marcomm — baik sebagai peserta booth maupun pengisi aktivasi."   (saat audit; kini :143, em-dash→koma)
src/components/EventsLandingPage.tsx:796      "EO, sekolah, komunitas, kampus, perusahaan, hingga instansi — daftarkan organisasimu..."   (saat audit; kini :792, em-dash→titik)
src/components/community/CommunityBenefits.tsx:20 "Panggung, sound system, lighting, kursi penonton — semuanya gratis."   (saat audit; kini :20, em-dash→koma)
```

**D. User-visible sebagai nilai kosong / alt text:**

```
src/components/EventDetailContent.tsx:66,71,76,161   value={... || '–'}   (en-dash, dirender di /events/:id)
src/components/community/CommunitySocialProof.tsx:21 {value > 0 ? ... : '—'}  (dirender di beranda)
src/components/PhotoLightbox.tsx:110                 alt={`${title || 'Foto'} — ${currentIndex + 1}`}  (dibaca screen reader)
src/components/EventPublicDetailPage.tsx:51          metaDescription `${event.acara} — ...` (meta description)
```

**E. En-dash `–` sebagai separator (juga dilarang 9.G):**

```
src/components/community/CommunityContact.tsx:40  "Senin – Jumat, jam kerja"   (saat audit; kini :40 "Senin - Jumat, jam kerja")
```

**F. Hit di komentar (TIDAK dirender, bukan pelanggaran)** — 194 dari 379 hit.
Contoh: `src/App.tsx:64,193,245,331,367,378,384,390,401,448,524`,
`src/components/CommunityDirectoryPage.tsx:21`, `CategoryBadge.tsx:12-16`,
`src/components/EventCrudModal.tsx:585,729`, `src/styles/tokens.css:15`,
`src/styles/accessibility.css:72`, `src/components/nav/NavDropdown.tsx` (7 hit),
`src/components/dashboard/*`, `src/components/survey/*` (mayoritas komentar).

**Verdict: VIOLATION.** **Severity: critical** (skill: binary, gagal
Pre-Flight). Perbaikan: ganti `&mdash;` → `&middot;`/koma/`|`; judul tab pakai
` - ` (hyphen berspasi) atau `|`; body copy dipecah jadi dua kalimat; `'–'`/`'—'`
placeholder → `'-'`; alt text pakai `-`.

**Status: FIXED (terukur — nol em-dash ter-render tersisa).** Diperbaiki pada
permukaan publik yang didaftarkan audit: 8 footer `&mdash;`→`&middot;`, 13
judul tab `—`→` - `, body copy dipecah, placeholder `–`/`—`→`-`, alt/meta
`—`→` - `, `CommunityContact` en-dash→`-`. `grep -rn '&mdash;' src/` = **0**.
Residual **publik** (ekspor PDF + halaman survey publik) juga ditutup: ekspor
PDF pengguna — `src/components/pdf/buildSchedulePdf.ts`, `buildLetterPdf.ts`,
`buildSurveyResultsPdf.ts`, `src/utils/pdfExport.ts` — dan halaman survey
publik `/tenant-survey/:eventId` — `TenantSurveyPublicPage.tsx` +
`TenantSurveyShared.tsx`; semua hit tersisa di berkas itu **komentar-saja**.

Penutupan terakhir — **surface admin/dashboard** (saat audit, audit ini
**membatasi dirinya sendiri** ke permukaan publik dan meninggalkan
admin/dashboard di luar cakupan; kini cakupan itu **diperluas atas keputusan
pengguna 2026-09-21** — **bukan** karena skill melarangnya): **43 em-dash
ter-render dihapus di 21 berkas**. Tiga berkas yang dulu disebut sebagai
residual — `TenantSurveyResultsPage.tsx`, `TenantSurveyPage.tsx`,
`TenantSurveyForm.tsx` (saat audit; kini hit sisa hanya komentar) — ternyata
**sudah bersih** saat tugas perluasan cakupan berjalan: seluruh hit tersisa di
ketiganya **komentar-saja**, dan em-dash yang benar-benar dihapus ada di
**surface admin/dashboard lain (sibling)**. Klasifikasi dilakukan **per-hit
lewat AST TypeScript** (bukan per-nama berkas), karena scanner tangan desync
pada JSX: placeholder
`'–'`/`'—'`→`'-'` (25), meta/judul/aria `—`→` - ` (9), label `<option>`
`— X —`→`- X -` (3), body copy dipecah jadi kalimat (3), separator→`·` (1),
rentang numerik `–`→`-` (2). Satu nilai terakhir yang **ter-pin test** —
`dashboardNavigation.tsx:213` (`draftsError ? '—' : …` → `'-'`) — ikut ditutup
dengan menyelaraskan **literal** harapannya di
`dashboardNavigation.test.tsx:52` (`toBe('—')` → `toBe('-')`); **logika
assertion tidak berubah** (satu-satunya assertion yang disentuh; tak ada test
lain yang diubah, dihapus, atau dilonggarkan).

Residual yang **sah** (bukan pelanggaran 9.G): ~294 hit **komentar-saja**
(dikecualikan — tidak dirender), 19 hit di `AuditResumeDashboard.tsx` + 2 di
`AnnualTimeline.tsx`/`FeaturedEventCard.tsx` (**dead code** — 0 importer, tak
pernah dirender; diverifikasi via graf impor), dan 2 en-dash di dalam **regex
fungsional** `eventUtils.ts` (`[-–]` sengaja menerima kedua tanda dari data
pengguna — menghapusnya adalah regresi). Verifikasi: `grep -rn "—" src/`
menyisakan **hanya** komentar, dead code, dan regex; nol hit non-komentar yang
dirender. Jadi C1 **selesai**.

### M1 — Hero stack melampaui 4 elemen, dan memuat trust-strip di dalam hero (4.7)

Section 4.7 "HERO STACK DISCIPLINE (max 4 text elements)" dan blok BANNED:
"trust micro-strip ('Used by engineering teams at...'), pricing teaser, feature
bullet list, social-proof avatar row" — semua dilarang **di dalam hero**.

`src/components/community/CommunityHero.tsx`:

```
:56   badge     "{formatCount(completed)}+ Event Terlaksana"     (elemen 1)
:64   h1        "Panggung Gratis untuk Komunitas Bekasi"          (elemen 2)
:69   p         "Cari venue untuk event komunitas? ..."           (elemen 3)
:72   p         "Venue, sound system, dan lighting sudah lengkap..." (elemen 4)
:75   p         "Slot tiap bulan terbatas. Amankan tanggal acaramu." (elemen 5)
:80-93 2 CTA    "Daftar Sekarang" + "Isi Form di Halaman Ini"      (elemen 6-7)
:96-114 strip   "100% Gratis" / "Sound 10K Watt" / "Terbuka untuk Semua"  (BANNED)
```

Strip 3-item di bawah CTA adalah tepat pola yang dilarang ("feature bullet
list" / "trust micro-strip"). Ini 5 elemen teks + CTA + strip = jauh di atas
cap 4.

**Verdict: VIOLATION.** **Severity: major** (hard rule, langsung di atas fold).
Perbaikan: hapus `:75` (tagline) dan pindahkan strip `:96-114` ke section
"Keuntungan" di bawah hero.

**Status: FIXED (terukur browser).** `#hero` sekarang **4 elemen teks** (badge,
h1, 1 subteks, 2 CTA) — `<strong>Gratis</strong>` di dalam h1 bukan elemen
terpisah. Strip 3-item kini dirender di `<section
aria-label="Keunggulan program komunitas">` **di bawah** hero: terverifikasi
ada di sana dan **tidak** ada di dalam `#hero`.

### M2 — Subteks hero 3 paragraf / 30 kata / 5 baris (4.7)

Section 4.7: "subtext max **20 words** AND max 3-4 lines".

`CommunityHero.tsx:69,72,75 (saat audit; kini h1 :99, subteks :105)` menggabungkan tiga paragraf subteks:
"Cari venue untuk event komunitas? Metropolitan Mall Bekasi siapkan tempatnya
gratis." + "Venue, sound system, dan lighting sudah lengkap. Kamu tinggal bawa
konsep acaranya." + "Slot tiap bulan terbatas. Amankan tanggal acaramu."

**Terukur di 1280px:** 11 + 12 + 7 = **30 kata**, dan 2 + 2 + 1 = **5 baris**
(Range line boxes per `<p>`). Jadi melebihi cap 20 kata **dan** cap 3-4 baris.
(Angka lama "~45 kata" di judul/§2 terlalu tinggi; angka benar 30 kata.)

**Verdict: VIOLATION.** **Severity: major.** Perbaikan: sisakan satu kalimat
<=20 kata; sisanya jadi section di bawah.

**Status: FIXED.** Kini satu paragraf **12 kata**: "Venue, sound system, dan
lighting sudah lengkap. Kamu tinggal bawa konsep acaranya."


### M3 — Split-header (headline kiri + paragraf filler kanan), 3 instance (4.7)

Section 4.7 "SPLIT-HEADER BAN (mandatory)": pola "left big headline + right
small explainer paragraph ... banned as default". Dan 9.F: "NO floating
top-right sub-text in section headings".

```
src/components/community/CommunityBenefits.tsx:28  grid lg:grid-cols-[2fr_3fr]   (saat audit; kini :34 flex flex-col gap-8)
  :31  h2 "Bukan cuma dikasih tempat."
  :34  p  "Kamu juga didukung buat berkembang. Dari sponsorship sampai promosi..."

src/components/community/CommunityFacilities.tsx:18  flex-col lg:flex-row lg:justify-between   (saat audit; kini :25 flex flex-col gap-5)
  :21  h2 "Semua udah disiapin."
  :28  p  "Kamu nggak perlu pusing soal venue dan peralatan. Fokus aja bikin acara yang berkesan!"

src/components/community/CommunityContact.tsx:34  flex-col lg:flex-row lg:items-end lg:justify-between   (saat audit; kini :34 flex flex-col gap-4)
  :36  h2 "Ada pertanyaan? Hubungi kami!"
  :39-40 p "Telepon kantor: ... / Senin – Jumat, jam kerja"
```

Ketiganya: headline kiri, paragraf pendek mengambang di kanan, tanpa elemen
visual di kolom kanan. Persis pola yang dilarang.

**Verdict: VIOLATION.** **Severity: major** (3 instance di satu halaman).
Perbaikan: tumpuk vertikal (headline di atas, body di bawah `max-w-[65ch]`).

**Status: FIXED (terukur browser 1280px).** Ketiga section kini menumpuk
vertikal — headline di atas, body di bawah dengan `max-w-[65ch]`:
`CommunityBenefits.tsx:34` `flex flex-col gap-8`, `CommunityFacilities.tsx:25`
`flex flex-col gap-5`, `CommunityContact.tsx:34` `flex flex-col gap-4`. Diukur
pada 1280px: `#benefits` h2 bottom 2126 → p top 2142; `#facilities` h2 bottom
3023.5 → p top 3039.5; `#contact` h2 bottom 7793 → p top 7809. Ketiganya
`p.top > h2.bottom` — tidak ada lagi paragraf yang mengambang di kanan.

### M4 — Section-layout-repetition: keluarga "headline + card grid" dipakai 4× (4.7)

Section 4.7: "Once you use a layout family for a section ... that family can
appear at most ONCE on the page." Landing beranda:

```
CommunityBenefits      :28-45   header + grid kartu (2fr/3fr + sm:grid-cols-2)   (saat audit; kini :44-74 baris full-width bertumpuk, tanpa grid)
CommunityFacilities    :18-46   header + grid kartu (flex row + sm:grid-cols-2 lg:grid-cols-3)   (saat audit; kini :40-52 definition grid dua kolom)
CommunitySteps         :19-27   header + grid kartu (lg:grid-cols-4)   (saat audit; kini :20-30 `<ol>` langkah bernomor)
CommunityGallery       :~125    header + grid kartu (lg:grid-cols-3)   (saat audit; kini :202 `lg:grid-cols-3` — tetap, satu-satunya card grid)
```

Empat section memakai keluarga layout yang sama. Aturan "at least 4 different
families across 8 sections" juga tidak terpenuhi (beranda ~13 section,
mayoritas keluarga yang sama).

**Verdict: VIOLATION.** **Severity: major.** Perbaikan: minimal 2 dari 4
section ganti keluarga (mis. satu full-width list, satu bento asimetris).

**Status: FIXED (terukur browser 1280px + 375px).** Keluarga card-grid kini
muncul tepat **1×** (`CommunityGallery.tsx:202`, `lg:grid-cols-3`): Benefits
adalah baris fitur full-width bertumpuk (baris `w=1226` di 1280px), Facilities
adalah satu-satunya definition grid dua kolom (`:40`
`sm:grid-cols-[minmax(0,15rem)_1fr]` — judul kiri `x=24 w=240`, detail kanan
`x=304 w=603` di 1280px; runtuh ke satu kolom 337px di 375px; tiap baris
pasangan sibling `<h3>` + `<p>` dalam `<Fragment>`, tanpa `<dl>`/`<dt>`/`<dd>`
karena `dt` melarang heading content), Steps adalah `<ol>` bernomor (list,
bukan grid). Halaman kini punya ≥11 keluarga (hero, strip, stat band, baris
bertumpuk, definition grid, process list, akordeon FAQ, berita, form, band
kontak gelap, footer) — klausul "at most ONCE" dan "≥4 keluarga" terpenuhi.
Outline utuh (H2 lalu enam H3; keenam judul fasilitas tetap `<h3>`). Kontras
sel tint m4 tak berubah: judul 14.45–14.71:1, detail 4.83–4.92:1 (semua ≥4.5:1).

### M5 — Eyebrow di /events: 4 untuk 5 section (cap 2) (4.7)

Section 4.7 "EYEBROW RESTRAINT (mandatory, the #1 violated rule)": maksimum 1
eyebrow per 3 section; hero dihitung 1. `/events` punya 5 section
(hero, filter, featured, calendar, pendaftaran) → cap = `ceil(5/3)` = 2.

```
src/components/EventsLandingPage.tsx:477  <CommunityEyebrow>Metropolitan Mall Bekasi</CommunityEyebrow>   (hero = 1)
src/components/EventsLandingPage.tsx:649  <CommunityEyebrow>Hasil Filter</CommunityEyebrow>                (featured)
src/components/EventsLandingPage.tsx:706  <CommunityEyebrow>{g.area ? g.name : 'Lokasi Lainnya'}</CommunityEyebrow>
src/components/EventsLandingPage.tsx:726  <CommunityEyebrow>Event Lainnya</CommunityEyebrow>
src/components/EventsLandingPage.tsx:772  <CommunityEyebrow>Kalender</CommunityEyebrow>                    (calendar)
src/components/EventsLandingPage.tsx:793  uppercase tracking-widest "Pendaftaran Organisasi"              (pendaftaran; saat audit; kini :792)
```

Enam label mikro di atas headline, cap 2. (Catatan: :706 dan :726 adalah
cabang `if/else` dari section `#featured` yang sama, jadi runtime hanya satu
yang tampil; tetap saja hero + featured + calendar + pendaftaran = 4 > 2.)
**Baris-baris di atas = bukti saat audit.** Pasca-perbaikan hanya eyebrow hero
(`:477`) yang tersisa; `:649`, `:706`, `:726`, `:772` dihapus — lihat Status.

**Verdict: VIOLATION.** **Severity: major.** Perbaikan: sisakan eyebrow hero;
hapus sisanya, andalkan headline.

**Status: FIXED (terukur browser).** Di 1280px `/events` kini punya **1**
eyebrow (dulu 4); cap 2.

### M6 — Duplicate CTA intent: 4 label untuk niat "daftar" (4.5)

Section 4.5 "NO DUPLICATE CTA INTENT (mandatory)": "One label per intent".

```
src/components/community/CommunityHero.tsx:85     "Daftar Sekarang"    (saat audit; kini :113 "Daftar Event" → `/daftar`)
src/components/community/CommunityHero.tsx:92     "Isi Form di Halaman Ini"   (saat audit; kini :120 "Cek Event" → `#upcoming-events`)
src/components/CommunityLandingPage.tsx:232       "Daftar Sekarang"   (header; kini :232 "Daftar Event" → `/daftar`)
src/components/CommunityLandingPage.tsx:297       "Daftar Sekarang"   (panel mobile; kini :297 "Daftar Event" → `/daftar`)
src/components/CommunityLandingPage.tsx:364       "Daftar Gratis Sekarang"  (bar sticky mobile; saat audit; kini :364 "Daftar Event" → `/daftar`)
src/components/CommunityLandingPage.tsx:376       "Daftar event komunitas"  (footer; saat audit; kini :376 "Daftar Event" → `/daftar`)
```

Semua menuju `#register` atau `/daftar` = satu niat (signup). Empat label
berbeda untuk niat yang sama dalam satu halaman.

**Verdict: VIOLATION.** **Severity: major.** Perbaikan: pilih satu label
(mis. "Daftar Sekarang") dan pakai di header, hero, sticky bar, footer.

**Status: FIXED.** Semua "Daftar Sekarang" diganti jadi **"Daftar Event"** →
`href="/daftar"` di header, hero-primary, panel mobile, sticky bar, dan footer —
**satu label, satu tujuan, 5 tempat**. CTA sekunder hero diubah dari "Isi Form
di Halaman Ini" (`href="#register"`) menjadi **"Cek Event"** →
`href="#upcoming-events"`; anchor `id="upcoming-events"` ada di `CommunityUpcomingEvents.tsx`
(`:74`/`:114`/`:139`) dan dirender di `/` lewat `CommunityLandingPage.tsx:321`.

Dua CTA itu kini punya **niat yang berbeda**, bukan sekadar label berbeda:
"Daftar Event" = mendaftar (pindah halaman), "Cek Event" = melihat jadwal
(scroll di halaman ini). §4.5 melarang CTA duplikat untuk *niat yang sama*; dua
niat berbeda dengan satu label konsisten per niat bukan duplikat, dan §4.7
mengizinkan 1 primary + max 1 secondary. Karena itu M6 FIXED, bukan PARTIAL:
satu label tidak lagi menuju dua tujuan.

Rute `/daftar` **tetap dipertahankan** sebagai URL yang bisa dibagikan
(bio Instagram / WA / QR) dan tetap menjadi tujuan nav `/events`, karena halaman
itu tidak punya anchor form tersemat.

**Catatan 2026-09-21 (keputusan pengguna).** Label akhir **"Daftar Event"** /
**"Cek Event"** di atas adalah **keputusan pengguna pada 2026-09-21** — bukan
bagian dari remediasi audit 2026-09-20, yang saat itu menyatukan label menjadi
"Daftar Sekarang". Konsekuensi wajar dari keputusan itu, **bukan cacat**: karena
CTA sekunder tak lagi menuju `#register`, `id="register"` di `/` kini hanya
dapat dicapai lewat skip-link `sr-only` di `CommunityLandingPage.tsx:175-181`
("Langsung ke form pendaftaran") atau dengan menggulir halaman.

### M7 — Hero tanpa gambar nyata saat `heroImageUrl` kosong; 5 foto asli tidak terpakai (4.8)

Section 4.8: "Hero needs a real visual. Text + gradient blob is not a hero -
it's a placeholder." dan "Even minimalist sites need real images."

`CommunityHero.tsx:39-53 (saat audit; kini :44-57 heroImgProps)` hanya merender gambar bila `heroImageUrl` ada.
`heroImageUrl` berasal dari site settings dan **default string kosong**
(`src/hooks/useSiteSettingsHandlers.ts:44  useState('')`). Saat kosong, hero =
teks + `bg-gradient-hero-tosca` + grain (`:27-29`), tanpa satu pun gambar.

Bukti tambahan: ada 5 foto landing asli yang **tidak diimpor di mana pun**:

```
src/assets/landing/event-hero.jpg
src/assets/landing/anniversary.jpg
src/assets/landing/celebration.jpg
src/assets/landing/festival-minang.jpg
src/assets/landing/great-sale.jpg
```

(grep `landing/` pada `src/**/*.ts(x)` → 0 hasil.)

**Verdict: VIOLATION.** **Severity: major.** Perbaikan: pakai salah satu
`src/assets/landing/*.jpg` sebagai fallback hero saat `heroImageUrl` kosong.

**Status: FIXED (terukur browser 1280px).** Saat `heroImageUrl` kosong, hero
kini merender foto bundel: `CommunityHero.tsx:2-3` mengimpor
`hero-fallback.webp` (~208KB @1600w) + `hero-fallback-800.webp` (~77KB @800w),
dan `:52-57` memasang `srcSet` dua entri. **Lokasi berkas (terukur):** keduanya
ada di **`src/assets/landing/`** — `hero-fallback.webp` 212.980 B,
`hero-fallback-800.webp` 78.928 B — **bukan** di `public/` (kalau di `public/`,
Vite akan menyalinnya apa adanya; karena diimpor dari `src/`, Vite
meng-hash-nya ke `dist/assets/`: `hero-fallback-DSWbG37r.webp` 212,98 kB dan
`hero-fallback-800-Bl5Rygpa.webp` 78,93 kB per `vite build`). Kedua varian WebP
dibangun lewat ffmpeg/libwebp. Jalur bundel **sengaja tidak** dilewatkan `imgUrl()`: helper itu
hanya menulis ulang URL R2 (`isR2Url` mencocokkan `VITE_R2_PUBLIC_URL`), jadi
untuk path bundel ia mengembalikan path apa adanya — parameter resize wsrv.nl
tidak akan pernah berlaku dan `srcSet` tiga entri akan runtuh jadi satu berkas.
Karena itu fallback membawa varian pra-bangun sendiri. URL R2 yang dikonfigurasi
tetap menang dan tetap memakai optimiser + `srcSet` (`:44-51`). Terukur:
`<img>` di `#hero` resolve ke `/src/assets/landing/hero-fallback.webp`, dan
`celebration.jpg` **tidak** muncul di network request. **Biaya LCP yang tersisa
(jujur):** fallback ~208KB pada breakpoint terbesar — ini beban LCP nyata, walau
varian 800w (~77KB) melayani viewport lebih kecil.

### M8 — Font di-load via Google Fonts `<link>` (3.A)

Section 3.A: "Never link Google Fonts via `<link>` in production."

`index.html:56-60`:

```
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque...&family=Geist...&family=Geist+Mono...&display=swap" />
<link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet" media="print" onload="this.media='all'" />
```

Pemilihan fontnya sendiri **benar** (lihat "Yang TIDAK berlaku" untuk 4.1),
tapi jalur pemuatannya melanggar 3.A. **Severity: major** karena menyentuh
semua halaman sekaligus (dan LCP). Perbaikan: self-host + `@font-face` dengan
`font-display: swap`.

**Status: FIXED (terverifikasi).** Dipindahkan ke self-host lewat `@font-face`
di `src/styles/fonts.css` (diimpor dari `src/index.css` mengikuti konvensi
`@import "./styles/*.css"` yang sudah ada): **6 berkas woff2** variabel
(Bricolage Grotesque / Geist / Geist Mono, `font-weight: 400 700`) di
`public/fonts/`, total **191.360 byte (~187 KiB)**, subset **latin + latin-ext
saja** (cyrillic/greek/vietnamese/symbols2 dibuang sebagai bobot mati untuk
situs berbahasa Indonesia), `font-display: swap`. Ketiga `<link>`
`fonts.googleapis.com` **dan** `<noscript>`-nya dihapus dari `index.html` —
`grep -rn "googleapis\|gstatic" src index.html` = **0**. Terukur di dev
`:5191`: `document.fonts.check` = true untuk Geist 400/700 & Bricolage
Grotesque 400/700; **0** permintaan ke `googleapis.com`/`gstatic.com`; woff2
dimuat dari origin sendiri (`/fonts/geist-latin.woff2`,
`/fonts/bricolage-grotesque-latin.woff2`). **Pilihan font tak berubah** (sudah
benar per §4.1) — hanya jalur pemuatannya yang diperbaiki.

### M9 — Nav melebihi cap 80px di `/events` & `/gallery` (4.7)

Section 4.7: "Navigation height cap: **80px max desktop**, default 64-72px."

Diukur pada viewport tepat 1280px (`getBoundingClientRect()` header):

| Halaman | Header | Tinggi terukur | Komponen | Logo (rendered) | Baris |
|---|---|---|---|---|---|
| `/` | `CommunityLandingPage.tsx:181` | **80.00px** | fixed `h-16 sm:h-20` (`:183`) | 124×**87.66**px | 1 |
| `/events` | `EventsLandingPage.tsx:429` | **112.66px** | `py-2.5 sm:py-3` (`:430`) | 124×**87.66**px | 1 |
| `/gallery` | `GalleryHeader.tsx:14` | **112.66px** | `py-2.5 sm:py-3` (`:15`) | 124×**87.66**px | 1 |
| `/news` | `NewsIndexPage.tsx:57` | **57.00px** | `py-2.5` + logo `h-8` | 45.25×**32**px | 1 |
| `/tenants` | `TenantDirectoryPage.tsx:86` | **57.00px** | `py-2.5` + logo `h-8` | 45.25×**32**px | 1 |
| `/pameran` | `ExhibitionsLandingPage.tsx:109` | **59.00px** | `py-3` + logo `h-8` | 45.25×**32**px | 1 |

**Penyebab (terukur, bukan estimasi).** Logo asli
`src/assets/brand/LOGOMETMAL2016-01.svg` punya `width="3508" height="2480"`
(rasio ≈ **1.4145**). Pada `/events` & `/gallery` logo dipasang `h-auto
w-[88px] sm:w-[124px]` tanpa tinggi tetap (`EventsLandingPage.tsx:436`,
`GalleryHeader.tsx:21`), sehingga tinggi intrinsiknya mengikuti rasio:   (saat audit; kini logo `:21 h-8 w-auto`)
124 × 2480/3508 = **87.66px**. Padding `py-3` (12+12 = 24px) → 87.66 + 24 =
**111.66px** untuk baris dalam; header + border 1px = **112.66px**. Jadi
112.66px ≈ 113px yang dilaporkan sesi A — angka itu **nyata**, bukan artefak.
Logo bahkan meluber keluar baris flex-nya sebesar 7.66px (baris dalam 80px,
logo 87.66px) di `/`, yang lolos hanya karena `overflow: visible`.

`/` lulus **bukan** karena logonya kecil — logonya sama (124px, 87.66px) —
melainkan karena `CommunityLandingPage.tsx:183` mengunci tinggi baris
`h-16 sm:h-20` sehingga logo yang lebih tinggi tidak menambah tinggi header
(di sini logo justru meluber 7.66px keluar header). `/news`, `/tenants`,
`/pameran` lulus karena memakai logo `h-8 w-auto` (32px) + padding kecil.

**Verdict: VIOLATION.** **Severity: major** (2 halaman publik, aturan keras
desktop). Perbaikan: kunci tinggi header (mis. `h-16 sm:h-20` seperti beranda)
atau beri logo `h-8 sm:h-10 w-auto` supaya tinggi tidak didikte rasio 3508×2480.

**Status: FIXED (terukur browser 1280px).** `/` **80px**, `/events` **80px**,
`/gallery` **80px** (dulu 112.66px di `/events` & `/gallery`). Penyebab lama
(rasio logo 3508×2480 → 87.66px pada lebar 124px) ditutup dengan header
`h-16 sm:h-20` + logo `h-8 sm:h-10`.

### M10 — Hero `<h1>` = 3 baris di 1280px (4.7)

Section 4.7: "Headline **max 2 lines on desktop**."

Diukur pada viewport tepat 1280px, `#hero h1`
(`CommunityHero.tsx:64 (saat audit; kini :99)`):

```
font-size: 80px (lg:text-[5rem]) · line-height: 84px (leading-[1.05])
h1.getBoundingClientRect(): 768 × 252px
Range line boxes (getClientRects, distinct tops): 3
   top 138 → "Panggung Gratis"
   top 222 → "untuk Komunitas"
   top 306 → "Bekasi"
scrollHeight 258 / clientHeight 252 ; 252 / 84 = 3.00 baris
```

Tiga metode sepakat: **3 baris** di 1280px. Pada 768px hasilnya **2 baris**
(font 60px, rect 126px, 126/63 = 2.00) — persis seperti yang dilaporkan sesi A.
Teks 5 kata ini melebar karena `text-[5rem]` (80px) pada kolom `max-w-3xl`
(768px), dan `strong` "Gratis" menambah lebar.

Konsekuensi aturan yang sama: hero juga gagal "CTA visible without scroll" —
pada viewport 900px, CTA `Daftar Sekarang` berada di `top:616 bottom:672`
(masih terlihat), tapi pada tinggi viewport tipikal 720-800px hero
`min-h-[100svh]` memaksa scroll (subteks hero = **30 kata / 5 baris**,
melampaui cap "20 words, max 3-4 lines" di M2).

**Verdict: VIOLATION.** **Severity: major.** Perbaikan: turunkan skala headline
ke `lg:text-6xl` (60px) atau batasi `max-w-2xl`, sehingga 2 baris di desktop.

**Status: FIXED (terukur browser 1280px).** h1 hero = **2** line box, font
**60px**, line-height **63px** (dulu 3 baris @80px).

### M11 — Mode gelap: 4 section `--section-alt` tetap terang (4.11 / 8)

Section 4.11: "The page has ONE theme. Sections do not invert." Diuji dengan
memuat `/` dalam mode gelap (`localStorage.theme='dark'` sebelum load;
`<html class="dark">` terkonfirmasi). Latar halaman = `rgb(14, 22, 18)`
(`.community-landing` `bg-neutral-150` + override gelap).

`--section-alt: rgba(237, 238, 226, 0.4)` (`src/styles/tokens.css:61`)
**hanya** didefinisikan di `:root` — **tidak ada** override `.dark` di seluruh
`tokens.css`. Karena itu setiap section yang memakai `bg-[var(--section-alt)]`
tetap memakai warna krem transparan di mode gelap. Computed `background-color`
tiap section top-level pada `/` (mode gelap):

| Section | Kelas (potongan) | `background-color` terukur | Terang di latar gelap? |
|---|---|---|---|
| hero | `bg-gradient-hero-tosca` | `rgba(0,0,0,0)` (gradien) | tidak |
| SocialProof | `bg-[var(--section-alt)]` | **`rgba(237, 238, 226, 0.4)`** | **YA** |
| `#upcoming-events` | tanpa bg | `rgba(0,0,0,0)` | tidak |
| `#benefits` | `bg-[var(--section-alt)]` | **`rgba(237, 238, 226, 0.4)`** | **YA** |
| `#facilities` | tanpa bg | `rgba(0,0,0,0)` | tidak |
| `#how` | `bg-[var(--section-alt)]` | **`rgba(237, 238, 226, 0.4)`** | **YA** |
| `#faq` | tanpa bg | `rgba(0,0,0,0)` | tidak |
| `#gallery` | `bg-[var(--section-alt)]` | **`rgba(237, 238, 226, 0.4)`** | **YA** |
| `#news` | `bg-white dark:bg-slate-950` | `rgb(14, 22, 18)` | tidak |
| register | tanpa bg | `rgba(0,0,0,0)` | tidak |
| `#contact` | `variant="dark-tosca"` | `rgba(0,0,0,0)` (gradien) | tidak |

Empat section (`SocialProof`, `#benefits`, `#how`, `#gallery`) membaca sebagai
band terang. Terhadap latar `rgb(14,22,18)`, campuran
`rgba(237,238,226,0.4)` menghasilkan ≈ `rgb(103,108,101)` → rasio kontras
**3.42:1** terhadap latar (terang, jelas terlihat). Screenshot mode gelap
mengonfirmasi band abu-krem di section `#benefits`.

Satu-satunya section yang punya kompensasi eksplisit adalah `#news`
(`dark:bg-slate-950`). Tidak ada section `--section-alt` lain yang punya
`dark:bg-*` — keempatnya **tanpa** kompensasi.

**Verdict: VIOLATION.** **Severity: major** (klaim sesi A **BENAR**; ini
regresi nyata yang sebelumnya hanya dicatat sebagai "band gelap di mode terang"
oleh m8). Perbaikan: tambah `.dark { --section-alt: rgba(255,255,255,0.04); }`
(atau serupa) di `tokens.css`, atau ganti pemakaian ke `dark:bg-slate-900/40`.

**Status: FIXED (terukur browser).** `.dark { --section-alt:
rgba(255,255,255,0.04) }` ditambahkan di `tokens.css`. Di mode gelap, 4 section
(SocialProof, `#benefits`, `#how`, `#gallery`) compute
`rgba(255,255,255,0.04)` (dulu `rgba(237,238,226,0.4)`); mode terang tak berubah
(`rgba(237,238,226,0.4)`).

### m1 — Ikon SVG hand-rolled (3.C / 9.E)

Section 3.C: "NEVER hand-roll SVG icons."

```
src/components/community/OrganizationTypeSelector.tsx:112-114   <svg ...><path d="M5 13l4 4L19 7" /></svg>  (centang terpilih)
src/components/EventDetailModal.tsx:204-208                     <svg ...><rect/><path/><path/></svg>       (clipboard)
```

`OrganizationTypeSelector` dipakai di `/daftar` dan form beranda; `EventDetailModal`
dirender publik di `/` dan `/events`. **Severity: minor** (2 ikon, bukan
sistemik). Perbaikan: `Check` dan `ClipboardCheck` dari Lucide.

**Status: FIXED.** Keduanya kini memakai Lucide `Check` / `ClipboardCheck`.

### m2 — Glif teks `☀`/`☾` sebagai ikon toggle (3.D / 3.C)

`src/components/EventPublicDetailPage.tsx:124`:

```
<span className="text-sm">{isDark ? '☀' : '☾'}</span>
```

Semua halaman lain memakai `SunMedium`/`Moon` dari Lucide (mis.
`CommunityLandingPage.tsx:213`, `EventsLandingPage.tsx:456`,
`GalleryHeader.tsx:29`). Ini satu halaman yang menyimpang, dan memakai
karakter simbol alih-alih ikon = sinyal "generated" (9.E). **Severity: minor.**
Perbaikan: `SunMedium`/`Moon`.

**Status: FIXED.** Toggle kini memakai `SunMedium`/`Moon`.

### m3 — Pill/label di atas gambar (9.F)

Section 9.F: "NO pills/labels/tags overlaid on images."

```
src/components/GalleryIndexPage.tsx:239-241  overlay hover: <span ...>Lihat Foto &rarr;</span> di atas cover album
src/components/GalleryAlbumPage.tsx:209-213  overlay hover: caption + tanggal di atas foto
```

Skill mengizinkan caption **di bawah** gambar, bukan di atasnya. **Severity:
minor** (keduanya muncul saat hover saja). Perbaikan: caption di bawah kartu.

**Status: FIXED.** Teks dipindah ke **bawah** gambar (tidak lagi overlay).

### m4 — Bento/feature-grid tanpa variasi visual (4.7)

Section 4.7 "Bento Background Diversity (mandatory)": minimal 2-3 sel punya
variasi visual nyata; "A cream-on-cream bento with only typography inside reads
as boring AI default".

```
CommunityFacilities.tsx:33-46   6 kartu ui-campaign-card, ikon + judul + paragraf, semua latar putih/krem   (saat audit; kini :40-53)
CommunityBenefits.tsx:41-56     4 kartu, pola sama   (saat audit; kini :63-70)
```

Tidak ada gambar, gradient, atau pattern di satu sel pun. **Severity: minor**
(ini daftar fasilitas, bukan "bento" berlabel, tapi semangat aturannya kena).
Perbaikan: beri 1-2 sel foto area asli.

**Status: FIXED (terukur browser 1280px).** Sel bertint merek dibangun dari
token `--brand-*` yang sudah ada via `color-mix`, diterapkan dengan modifier `!`
penting karena `.ui-campaign-card` adalah CSS tanpa layer sehingga kalau tidak
akan menang: `CommunityFacilities.tsx:16-19` indeks 1 (tosca 10% di atas
`--brand-card-light`) dan 4 (pink 8%); `CommunityBenefits.tsx:26-29` indeks 1
(tosca 10%). Terukur pada 1280px, `background-color` sel:
facilities[1] `rgb(230,242,238)`, facilities[4] `rgb(253,238,239)`,
benefits[1] `rgb(230,242,238)` — semuanya beda dari kontrol krem
`rgb(253,252,246)`. Kontras teks di atasnya: judul ≥14.45:1, detail ≥4.83:1 —
keduanya lolos AA 4.5:1.

### m5 — Placeholder-as-label (4.6)

Section 4.6: "No placeholder-as-label. Ever."

```
src/components/TenantDirectoryPage.tsx:139-143
  <input type="search" ... placeholder="Cari nama tenant, kategori, atau lantai…" />
```

Tidak ada `<label>`, tidak ada `aria-label` (bandingkan
`CommunityDirectoryPage.tsx:213` yang punya `aria-label="Cari komunitas"`).
**Severity: minor** (pencarian adalah konvensi yang lazim, tapi skill
menyebutnya "Ever"). Perbaikan: tambah `aria-label` minimal.

**Status: FIXED.** Search `TenantDirectoryPage` kini punya `aria-label`.

### m6 — Middle-dot `·` lebih dari 1 per baris (9.F)

Section 9.F: "The middle-dot (`·`) is rationed. Maximum 1 per line in metadata
strips."

```
src/components/ExhibitionsLandingPage.tsx:209-210
  {activation.time && ` · ${activation.time}`}
  {activation.location && ` · ${activation.location}`}
```

Bisa menghasilkan 2 dot dalam satu baris (waktu · lokasi). **Severity: minor.**
Perbaikan: pecah jadi kolom/baris.

**Status: FIXED.** Middle-dot lebih dari satu per baris sudah dihapus.

### m7 — Multi-aksen di satu halaman (4.2)

Section 4.2 "COLOR CONSISTENCY LOCK (mandatory)": satu aksen per halaman.

`/events` memakai tosca (CTA), emerald (`EventsLandingPage.tsx:492` "Live"),
amber (`:496` "Segera Hadir"), ditambah 8 warna kategori per kartu
(`CATEGORY_COLORS`, dipakai `HighlightEventCard`/`EventRailCard`).

**Severity: minor** — emerald/amber di sini mengkodekan **state nyata**
(live/upcoming) dan warna kategori mengkodekan **data**, bukan dekorasi; skill
sendiri mengizinkan warna semantik. Yang layak dicatat adalah lock-nya tidak
dipegang ketat. Perbaikan: batasi aksen dekoratif ke tosca, sisakan warna
hanya untuk makna.

**Status: N/A (accepted) — bukan pelanggaran.** Audit ulang bukti (§4.2
hanya melarang **aksen dekoratif** off-palette; warna semantik diizinkan).
Grep keluarga warna off-palette (`indigo|violet|purple|blue|sky|cyan|teal|
fuchsia|rose|red|orange|yellow|lime|green|emerald|amber`) pada closure impor
publik (`src/components/*.tsx` + `community/*.tsx` minus `dashboard/`,
`admin/`, `survey/`) = **135 hit di 23 berkas**. Setiap hit diklasifikasi:

| Kelas | Hit | Bukti (contoh) | Klasifikasi |
|---|---|---|---|
| danger/error | red/rose di `EventSubmissionPage.tsx:241,253,399`, `ExhibitionsLandingPage.tsx:131-132,237`, `SponsorLandingPage.tsx:282,289`, `CommunityRegistrationForm.tsx:284,297`, `OrganizationTypeSelector.tsx:63,120`, `EventPublicDetailPage.tsx:149-150`, `GalleryAlbumPage.tsx:111-112`, `NewsIndexPage.tsx:110-111`, `TenantDirectoryPage.tsx:185-186`, `CommunityDirectoryPage.tsx:193` | error + tombol retry + tanda `*` wajib + state "gagal memuat" | semantik (error) |
| live/success | emerald di `EventsLandingPage.tsx:220,491-493`, `StatusBadge.tsx:13-14,18-19`, `EventPublicDetailPage.tsx:197`, `CommunityHero.tsx:140`, `CommunityRegistrationForm.tsx:458`, `EventSubmissionPage.tsx:177-178` | "Sedang berlangsung"/"Live", state sukses, ikon ✓, `bg-emerald-500/15` di strip "100% Gratis" (bukan blok penuh) | semantik (state) |
| kategori | `CategoryBadge.tsx:13-16` + `CATEGORY_COLORS` (`eventUtils.ts:25-45`) | 8+ warna identitas kategori (Festival, Seminar, Hiburan, …) = data | semantik (data) |
| tipe organisasi | `CommunityDirectoryPage.tsx:28-34` | sky/violet/amber/emerald/rose untuk school/company/campus/government/ngo = data | semantik (data) |
| info/aksi netral | blue di `EventPublicDetailPage.tsx:252` (Google Calendar), `ToastContainer.tsx:10` (info), `CalendarView.tsx:229,451,674` (Cuti Bersama) | aksi/label informasi | semantik (info) |
| konfirmasi destruktif | `ConfirmDialog.tsx:48,52,53,87` | tombol + ikon hapus (merah) — **tak dirender di route publik** (`useConfirmDialog` hanya di dashboard/admin) | semantik (danger) |
| toast | `ToastContainer.tsx:8-11` | success/error/info/warning — status sistem | semantik (state) |

Tidak ada satu pun hit yang murni **dekoratif**: tak ada `bg-blue-500`
sebagai blok/latar section, tak ada gradient "AI purple", tak ada ikon yang
diwarnai tanpa makna. Satu-satunya yang mencampur dekorasi dengan semantik
adalah ikon meta `EventDetailContent.tsx:64-101` (Waktu=blue, Lokasi=red,
EO=amber) — namun ini baris metadata berikon, bukan CTA/latar, dan di
permalink publik `isAdmin=false` (`:224`) hanya cabang Waktu/Lokasi/EO yang
tampil. Karena tidak ada aksen dekoratif off-palette, **premis m7 tidak
berdiri**: yang tersisa hanyalah warna state/data yang justru diizinkan §4.2
(lock-nya dipegang konsisten — tosca tetap satu-satunya warna CTA).

### m8 — Band gelap di tengah halaman terang (4.11 / 8)

Section 4.11: "The page has ONE theme. Sections do not invert." Pengecualian
hanya untuk "Color Block Story" sekali per halaman.

Di mode terang, beranda: hero gelap (`bg-gradient-hero-tosca`), section terang,
lalu `CommunityContact` `variant="dark-tosca"` (`CommunityContact.tsx:32`,
`CommunityRevealPrimitives.tsx:37-40` merender `bg-gradient-reasoning-tosca`),
lalu footer terang. `/events` footer juga gelap
(`EventsLandingPage.tsx:806-807`).

**Severity: minor** — ini ritme "color block" yang sengaja, bukan inversi
acak, dan hero gelap + footer gelap adalah konvensi. Yang perlu dijaga: band
gelap di tengah (Contact) membuat halaman terasa ganti situs sekejap.

**Status: N/A (allowed exception) — bukan pelanggaran.** Diukur pada
`/` viewport 1280px (Vite scratch `:5191`), elemen top-level `<section>`
berurutan + `<footer>` (`getComputedStyle().backgroundColor` /
`backgroundImage`):

| # | Elemen | Terukur | Klasifikasi |
|---|---|---|---|
| 1 | `#hero` | gradient `linear-gradient(rgb(0,50,48) → rgb(0,85,76) …)` (tosca gelap) | **DARK** |
| 2 | strip "Keunggulan" | `rgb(253,252,246)` (krem) | LIGHT |
| 3 | SocialProof | `rgba(237,238,226,0.4)` | LIGHT |
| 4 | `#upcoming-events` | transparan → halaman | LIGHT |
| 5 | `#benefits` | `rgba(237,238,226,0.4)` | LIGHT |
| 6 | `#facilities` | transparan → halaman | LIGHT |
| 7 | `#how` | `rgba(237,238,226,0.4)` | LIGHT |
| 8 | `#faq` | transparan → halaman | LIGHT |
| 9 | `#gallery` | `rgba(237,238,226,0.4)` | LIGHT |
| 10 | `#news` | `rgb(255,255,255)` | LIGHT |
| 11 | divider | transparan → halaman | LIGHT |
| 12 | `#register` | transparan → halaman | LIGHT |
| 13 | `#contact` | `radial-gradient(rgba(0,146,142,.45)) + linear-gradient(rgb(0,74,72) → rgb(0,26,24))` | **DARK** |
| 14 | `<footer>` | `rgb(255,255,255)` | LIGHT |

Transisi warna di seluruh dokumen: **3** — (a) DARK→LIGHT `#hero`→strip
(paling atas; hero gelap adalah konvensi, bukan "band di tengah"), (b)
LIGHT→DARK `#register`→`#contact`, (c) DARK→LIGHT `#contact`→`<footer>`.
Transisi (b) adalah **satu-satunya transisi terang→gelap di tengah halaman**
(1×); setelahnya halaman kembali terang di footer. Jadi ini bukan alternasi
acak (tidak ada light→dark→light→dark berulang): ia membaca sebagai **satu
device color-block yang disengaja** — hero gelap (konvensi) → badan terang
panjang → satu blok gelap (Contact) → footer terang (konvensi). §4.11
mengizinkan tepat **satu** "full theme switch" per halaman; di sini switch-nya
satu (`#contact`), jadi carve-out berlaku.

Catatan: temuan ini **hanya** untuk mode terang. Masalah theme-lock yang
sebenarnya ada di **mode gelap** — 4 section `--section-alt` tetap terang
karena tidak ada override `.dark` — didokumentasikan terpisah dan terukur di
**M11** (sebelumnya luput karena sesi B tidak merender mode gelap).

### m9 — Register copy tidak konsisten (4.9 Copy Self-Audit)

`src/components/community/CommunityGallery.tsx:238`:

```
Lihat Semua Gallery
```

Sisa aplikasi memakai "Galeri" (mis. `:225` "Lihat foto", `/gallery`
"Galeri Event"). "Gallery" adalah campur-bahasa yang tidak disengaja. **Severity:
minor.** Perbaikan: "Lihat Semua Galeri".

**Status: FIXED.** Copy kini "Lihat Semua Galeri".

### m10 — Dot dekoratif untuk status non-live (9.F)

Section 9.F: "ZERO decorative status dots by default ... Only acceptable when
conveying real semantic state".

`src/components/EventsLandingPage.tsx:163-170` merender dot berwarna di dalam
chip untuk **kedua** keadaan: "Sedang Berlangsung" (state nyata, ada ping) dan
"Segera Hadir" (dot tetap tampil, hanya ping yang hilang).
`CommunityUpcomingEvents.tsx:149-154` pola sama. **Severity: minor.**
Perbaikan: tampilkan dot hanya saat `isLive`.

**Status: FIXED.** Blok dot `EventsLandingPage.tsx:161-170` kini dibungkus
`{isLive && ( ... )}`, pola yang sama dengan `CommunityUpcomingEvents.tsx`
(149-154). Chip "Sedang Berlangsung" / "Segera Hadir" tak berubah (label, size,
warna sama). Kini FIXED di **kedua** komponen.

### m11 — Panah `&rarr;` sebagai teks (9.F)

`src/components/GalleryIndexPage.tsx:240`:

```
<span className="text-sm font-semibold text-white">Lihat Foto &rarr;</span>
```

Karakter panah sebagai teks (bukan ikon) adalah sinyal "generated"; sudah
dicatat di audit a11y sebelumnya (m2). **Severity: minor.** Perbaikan:
`<ArrowRight aria-hidden />`.

**Status: FIXED.** `&rarr;` sebagai teks sudah dihapus; diganti ikon Lucide
(`ArrowRight`).

### n1 — Radius di luar skala token (4.4)

`src/components/CommunityLandingPage.tsx:249,251 (saat audit; kini :169-171
setelah perbaikan)` memakai `rounded-[1.6rem]`,
di luar skala yang didokumentasikan (`--radius-card` 1rem, `--radius-card-lg`
1.5rem, `--radius-campaign-card` 2rem di `tokens.css`). **Severity: nit.**
Perbaikan: pakai `rounded-3xl` (1.5rem) atau `rounded-[2rem]`.

**Status: FIXED.** Kedua arm `mobilePanelClass` kini `rounded-3xl` (1.5rem =
`--radius-card-lg`, step skala terdekat; 2rem `--radius-campaign-card`
direservasi untuk kartu hero/campaign besar). `grep -rn 'rounded-[1.6rem]'
src/` = **0**.

---

## 4. Yang TIDAK berlaku

Ini bagian yang sama pentingnya. Aturan yang "terdengar menakutkan" tapi tidak
memanggang brief ini, dinyatakan eksplisit.

### 4.1 — Font: PASS, bukan pelanggaran

`index.html` + `theme.css:88-90` memakai **Bricolage Grotesque** (display) +
**Geist** (body) + **Geist Mono**. Geist adalah salah satu rekomendasi eksplisit
skill ("Pick Geist, Outfit, Cabinet Grotesk, Satoshi"). **Bukan Inter** (yang
discouraged), **bukan serif**, dan **tidak** menyentuh Fraunces/Instrument_Serif
yang dilarang. Italic descender clearance juga NA: grep `italic` di seluruh
permukaan publik → 0 hasil, jadi tidak ada italic display yang bisa terpotong.
Satu-satunya masalah tipografi adalah **jalur pemuatan** (M8) — dan itu kini
**FIXED** (self-host `@font-face`, lihat §3 M8), bukan pilihan fontnya.

### 4.3 — Anti-center bias: PASS

`DESIGN_VARIANCE = 5 > 4` jadi aturan ini aktif, dan hero memenuhinya:
`CommunityHero.tsx:54 (saat audit; kini :88)` `text-left` + `max-w-3xl`; `EventsLandingPage.tsx:475`
`lg:grid-cols-[1.05fr_0.95fr]`. Tidak ada hero tercenter. Section
`CommunitySocialProof` memakai `text-center`, tapi itu strip statistik, bukan
hero — wajar.

### 9.C — "3 equal feature cards": NOT-APPLICABLE (literal)

Tidak ada baris tiga kartu fitur identik di permukaan publik. Grid yang paling
dekat adalah `CommunityFacilities` (6 kartu, `lg:grid-cols-3`) dan
`CommunityBenefits` (4 kartu, `sm:grid-cols-2`) — keduanya lebih dekat ke
"feature grid" biasa, bukan pola 3-kartu yang diban. Kekhawatiran sebenarnya
ada di **4.7 Bento Background Diversity** (m4), bukan di 9.C.

### 9.D — "Jane Doe": PASS

Ini venue nyata, dan kontennya memang nyata:

- Nama tenant/organizer dari DB (`fetchPublicTenantDirectory`,
  `fetchPublicCommunityDirectory`) — bukan "Acme"/"Nexus".
- Kontak asli: `CommunityContact.tsx:7-24` → `wa.me/6281318534823`,
  `0819-0814-2555`, `marketing@malmetropolitan.com`, `021-8855555 ext 214`.
- Angka statistik diturunkan dari data event nyata, satu vocabulary:
  `communityStats.ts:24-26` (`completed`/`organizers`/`total`) dipakai hero,
  `CommunitySocialProof`, dan `/events`. Ini justru memperbaiki temuan C2 audit
  lama (angka "232+" yang dulu tak bersumber).
- Tidak ada avatar "egg"/generik: `CommunityDirectoryPage.tsx:186-191` memakai
  inisial berwarna per tipe organisasi (dengan kontras terkunci di unit test).

Klaim spesifikasi di `CommunityFacilities.tsx:8-11` ("Sound System 10K Watt",
"50 Kursi Penonton", "Area Lantai 3") adalah klaim brand venue nyata, bukan
presisi palsu — tapi **tidak bisa saya verifikasi** (lihat bagian 5).

### 3.C / 9.E — Lucide: PASS lewat escape hatch

Skill: "**Discouraged:** `lucide-react`. Acceptable only when the user
explicitly asks for it **or the project already depends on it**."
`package.json` sudah memuat `lucide-react ^0.471.0`, jadi escape hatch-nya
terbuka. Satu keluarga ikon di seluruh proyek (tidak campur Phosphor/Tabler).
Yang tetap berlaku hanya dua temuan kecil: SVG hand-rolled (m1) dan glif teks
(m2).

### 4.2 PREMIUM-CONSUMER PALETTE BAN — NOT-APPLICABLE

Palet krem hangat (`--brand-paper: #f8f7f0`, `--brand-card: #fdfcf6`) memang
bersaudara dekat dengan keluarga "warm paper" yang diban
(`#f5f1ea`/`#f7f5f1`/`#fbf8f1`). Tapi ban itu **khusus brief premium-consumer**
(cookware/wellness/artisan/luxury/DTC). Brief ini adalah situs komunitas venue
mall, bukan premium-consumer. Jadi: **bukan pelanggaran.** Yang berlaku di sini
hanya COLOR CONSISTENCY LOCK (m7) — dan m7 sendiri **N/A (accepted)**: satu
aksen merek (tosca) dipegang konsisten di seluruh permukaan publik; warna
off-palette yang tersisa semuanya semantik (state/data), yang diizinkan §4.2.

### 4.7 — Zigzag alternation cap: NOT-APPLICABLE

Tidak ada section "gambar kiri + teks kanan" lalu "teks kiri + gambar kanan"
berturut-turut. Beranda sama sekali tidak memakai zigzag image+text.

### 4.7 — Hero top padding cap: PASS

`CommunityHero.tsx:54 (saat audit; kini :87)` `pt-20` (5rem), di bawah cap `pt-24` (6rem).
`EventsLandingPage.tsx:475` `lg:py-24`. Tidak ada hero yang "mengambang di
tengah viewport" karena padding berlebih.

### 4.7 — Nav satu baris: PASS; tinggi <=80px: **FIXED** (pasca-perbaikan)

Semua nav **satu baris** di desktop (dikonfirmasi: 3 anak flex `/events`
saling tumpang-tindih vertikal, satu baris). Tapi cap tinggi **80px** gagal di
dua halaman — terukur pada viewport 1280px:

```
/          header 80.00px   (CommunityLandingPage.tsx:183  h-16 sm:h-20)   PASS
/events    header 112.66px  (EventsLandingPage.tsx:429/430 py-2.5 sm:py-3; kini :429 h-16 sm:h-20) FAIL
/gallery   header 112.66px  (GalleryHeader.tsx:14/15       py-2.5 sm:py-3; kini :14 h-16 sm:h-20) FAIL
/news      header 57.00px   (logo h-8 w-auto, 32px)                        PASS
/tenants   header 57.00px                                                  PASS
/pameran   header 59.00px                                                  PASS
```

Penyebab terukur: logo `w-[88px] sm:w-[124px]` (`EventsLandingPage.tsx:436 (kini :436 h-8 w-auto sm:h-10)`,
`GalleryHeader.tsx:21 (kini :21 h-8 w-auto sm:h-10)`) + SVG 3508×2480 → 124 × 2480/3508 = **87.66px**; plus
`py-3` 24px = 111.66px + border = **112.66px**. Beranda lulus karena tinggi
barisnya dikunci `h-16 sm:h-20`, bukan karena logonya lebih kecil. Detail
lengkap + perbaikan: **M9**. **Status pasca-perbaikan: FIXED** — ketiga header
kini 80px pada 1280px (M9). (Klaim lama "`EventsLandingPage.tsx:433 py-2.5
sm:py-3` ≈ 64px" salah — estimasi dari padding yang mengabaikan tinggi logo.)

### 3.E — Viewport stability: PASS

`CommunityHero.tsx:24 (saat audit; kini :63)` memakai `min-h-[100svh]` (bukan `h-screen`).
`PublicLetterViewer.tsx:146` memakai `h-[calc(100vh-120px)]`, tapi itu viewer
PDF internal, bukan hero publik.

### 5 / 6.B — Motion: PASS

Semua motion dimotivasi dan menghormati reduced-motion:
`useScrollReveal.ts:8-12` (degrade ke `isVisible=true`), `useCountUp.ts:16-19`,
`motion.css` blok `@media (prefers-reduced-motion: reduce)`, plus utility
`motion-reduce:*` di CTA dan ping dot. **Tidak ada**
`window.addEventListener('scroll')` (grep → 0 hasil di `src`); reveal memakai
IntersectionObserver, count-up memakai `requestAnimationFrame` yang tidak
menyentuh state React per frame (aman, dan `useCountUp` hanya jalan sekali
saat reveal). Tidak ada marquee.

### 4.5 — Interactive states: PASS

Loading skeleton ada di semua halaman daftar (Gallery/News/Tenant/Community/
Events/Sponsor); empty state terkomposisi (ikon + pesan + arahan); error state
inline dengan tombol "Coba lagi". Tactile feedback: `active:scale-[0.98]`
(`CommunityHero.tsx:83 (saat audit; kini :111)`), `active:scale-95` (`EventPublicDetailPage.tsx:245 (saat audit; kini :233,242,252,262)`).
Button contrast: `--brand-tosca-600` `#007a78` + teks putih = 5.18:1 (tercatat
di `tokens.css:15`) → lulus AA.

### 4.6 — Form rules untuk `EventSubmissionPage`: BERLAKU (bukan wizard)

Section 13 mengecualikan "multi-step forms / wizards". `/ajukan-event`
**bukan** wizard: satu halaman, semua field tampil, satu submit
(`EventSubmissionPage.tsx:224-430`). Karena itu Section 4.5/4.6 **berlaku**,
dan hasilnya bagus: label di atas input, `htmlFor`/`id` lengkap, error di bawah
input dengan `role="alert"`, helper text ada (`:412`). Tidak ada
placeholder-as-label di sini. (Satu-satunya pelanggaran 4.6 ada di
`TenantDirectoryPage` — m5.)

### 4.8 — Div-based fake screenshots: NOT-APPLICABLE

Tidak ada "produk palsu" dari `<div>` di permukaan publik. Tidak ada fake
terminal/fake dashboard. Gambar yang ada nyata (poster, cover album, logo
tenant, foto area) atau absen (M7). Logo brand adalah file SVG asli, bukan
hand-rolled.

### 9.F — Beberapa tell lain: PASS

Tidak ada version label di hero (`V0.6`/`BETA`), tidak ada section-number
eyebrow (`00 / INDEX`), tidak ada scroll cue (`Scroll`/`↓`), tidak ada
locale/weather strip, tidak ada "Index of Work 2018-2026", tidak ada version
footer, tidak ada progress bar dengan track terisi, tidak ada `<br>`-italic
headline, tidak ada vertical rotated text, tidak ada crosshair grid dekoratif.
`CommunitySocialProof.tsx:37 (saat audit; kini :42)` memakai "Dipercaya oleh komunitas di Bekasi" —
itu bentuk natural-language yang justru disarankan skill (bukan "Quietly
trusted by").

### n2 — Lingkaran angka `01`-`04` di `CommunitySteps`: NOT-APPLICABLE

`CommunitySteps.tsx:4-9` merender `01`-`04` di dalam `<ol>` sungguhan, dan
tiap `<li>` sudah membawa judul berisi konten ("Daftar & Kirim", "Review Tim
Mall", "Konfirmasi & Persiapan", "Hari H!"). Jadi ini penanda ordinal pada
daftar proses berurut, bukan label placeholder "Stage 1 / Phase 01" yang diban
9.F ("If you must show progression, use the verb-noun directly") — verb-noun
yang diminta sudah ada sebagai judul langkah.

**Status: N/A.** NOT-APPLICABLE sejak awal (bukan pelanggaran), jadi tidak ada
yang perlu diremediasi.

### 4.9 — Long lists: PASS

Direktori tenant (bisa ratusan baris) memakai card grid 4 kolom + search +
pill kategori (`TenantDirectoryPage.tsx:238-290`), bukan `<ul>` ber-`divide-y`.
Direktori komunitas dikelompokkan per tipe (`CommunityDirectoryPage.tsx:238-262`).
Tidak ada tabel data di permukaan publik.

### 9.A — Visual & CSS tells: PASS

Tidak ada neon/outer glow, tidak ada custom cursor, tidak ada gradient text,
tidak ada `#000000` murni sebagai latar (shadow memakai `rgba(15,23,42,…)`,
`rgba(22,33,27,…)`). Gradient yang ada adalah gradient brand tosca, bukan
"AI purple".

---

## 5. Batas cakupan

### Di luar cakupan (Section 13)

Dinyatakan eksplisit: skill ini **bukan** untuk dashboard, data table, admin
panel, dan UI produk bertahap. Yang **tidak diaudit**:

- `/dashboard/*` seluruhnya (`DashboardPage`, `AdminSidebar`, `EventTable`,
  `DraftQueueTable`, `CalendarView`, `KanbanView`, `Admin*`, `*ManagerModal`,
  `components/admin/*`, `components/survey/*` yang bersifat admin) — **kecuali
  untuk C1**: permukaan ini **diikutkan** ke audit pada 2026-09-21 (lihat
  catatan di bawah).
- `/tenant-survey-results` dan `TenantSurveyResultsPage` — ini dashboard
  analitik (KPI strip, tabel, chart), out of scope. **Kecuali untuk C1**:
  permukaan ini **diikutkan** pada 2026-09-21 (lihat catatan di bawah).
- Data table & spec table: tidak ada di permukaan publik, jadi 4.9 bagian
  "spec sheet" NA.
- `/letter/:id` (`PublicLetterViewer`) dan `/tenant-survey*` — permukaan
  dokumen/operasional internal yang dibuka publik; saya tidak mengauditnya
  sebagai landing page.

Untuk permukaan itu skill sendiri mengarahkan ke Fluent/Carbon/Atlassian/Polaris
(Section 2.A), bukan ke aturan landing page di sini.

**Penyempitan cakupan 2026-09-21 (bukan penghapusan).** Pengecualian di atas
tetap sah untuk **aturan design-taste** (layout/visual): Section 13 memang bukan
untuk dashboard, admin panel, dan data table. Yang diperluas **hanya satu
temuan — C1 (em-dash, 9.G)**. Alasannya, 9.G **bukan aturan landing page**,
melainkan **aturan output global**: ban em-dash berlaku untuk **setiap string
yang terlihat pengguna di permukaan mana pun**, termasuk admin/dashboard. Jadi
memasukkan C1 ke admin/dashboard **tidak** melanggar Section 13 — yang terjadi
adalah sebuah aturan output universal diterapkan ke himpunan permukaan yang
lebih luas. Hasilnya: **43 em-dash ter-render dihapus di 21 berkas**
admin/dashboard (2026-09-21), dan C1 kini **FIXED** (lihat §3 C1). Status
permukaan lain tetap: di luar cakupan untuk aturan design-taste, dan Section 13
tetap yang berlaku di sana.

### Tidak bisa diverifikasi (jujur)

1. **Pengukuran render.** Putaran awal audit ini tidak menjalankan browser.
   **Revisi pasca-ukur** menutup celah itu untuk tiga klaim kunci (nav, `<h1>`
   hero, mode gelap) via Vite dev `:5177` pada viewport tepat 1280px
   (`getBoundingClientRect()` / `getComputedStyle()` / Range line boxes).
   **Pasca-perbaikan**, M1/M2 sudah diukur (M1: 4 elemen teks di `#hero`;
   M2: 12 kata) — lihat status di §3. Kontras teks permukaan yang diubah
   **sudah** diukur (sel tint terang + gelap 4.83–14.71:1; layout di 1280px +
   375px). Yang **masih** belum diukur: perilaku mobile perangkat nyata
   (sentuh, iOS Safari) dan render lintas-browser.
2. **Klaim spesifikasi venue.** "Sound System 10K Watt", "50 Kursi Penonton",
   "Area Lantai 3" (`CommunityFacilities.tsx:8-11`) tidak punya sumber yang bisa
   saya cek. Ini klaim brand venue nyata, jadi saya **tidak** menandainya
   fake-precise (9.D) — tapi pembaca harus tahu saya tidak memverifikasinya.
3. **Konsistensi `heroImageUrl` produksi.** Moot: M7 FIXED lewat fallback
   bundel `hero-fallback.webp` — hero selalu merender gambar walau produksi
   mengosongkan `heroImageUrl`; konfigurasi produksi tak lagi menentukan
   ada/tidaknya gambar hero.
4. **Isi DB.** Nama tenant/organizer diperiksa hanya lewat tipe & jalur fetch,
   bukan data produksi.
5. **Tema gelap.** Putaran awal hanya membaca token `dark:` di kode. **Revisi
   pasca-ukur** merender `/` dalam mode gelap sungguhan dan menemukan M11
   (4 section `--section-alt` terang — kini FIXED). Cakupan gelap kini mencakup
   permukaan yang diubah: sel tint (terukur terang + gelap) dan section
   `--section-alt`. m8 kini N/A. Yang tetap belum diukur: varian gelap
   route/komponen lain.

### Yang sudah benar dan jangan diutak-atik

- Pilihan font (Bricolage Grotesque + Geist + Geist Mono) — sesuai rekomendasi
  skill; jalur pemuatan (M8) kini **FIXED** lewat self-host `@font-face`.
- Anti-center hero, `min-h-[100svh]`, reduced-motion, loading/empty/error
  states, kontras CTA tosca-600. (Nav satu baris tetap benar; tinggi nav yang
  dulu gagal di `/events` & `/gallery` (112.66px > cap 80px, M9) kini **FIXED**
  → 80px.)
- Statistik dari satu sumber derivasi (`communityStats.ts`) — ini memperbaiki
  temuan angka tak bersumber di audit lama.
- Tidak ada em-dash di `index.html` (judul memakai hyphen), jadi ban 9.G
  sepenuhnya bisa diselesaikan di level komponen, bukan di HTML shell.
