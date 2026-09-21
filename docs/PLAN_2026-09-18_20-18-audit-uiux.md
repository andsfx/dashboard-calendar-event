# Audit UI/UX — medprom + komunitas (2026-09-18 20:18 WIB)

Metode: Hallmark `audit` (58 gate anti-slop) + WCAG 2.2 (axe-core 4.10.2
`wcag2a/2aa/21a/21aa/22aa/best-practice`) + pengukuran langsung di DOM
ter-render (kontras terhitung, hitung baris teks, target sentuh, luber
horizontal). Semua temuan di bawah **terverifikasi**, bukan dugaan.

Cakupan: produksi. medprom `medprom-metmal.vercel.app` (5 rute),
komunitas `www.metmalcommunityspace.web.id` (5 rute). Viewport 320/375/414/768/1280.

**Prinsip yang dipakai:** temuan harus punya bukti terukur. Klaim kontras
dihitung terhadap latar efektif (menelusuri leluhur sampai latar opak), dan
temuan "teks dua baris" diverifikasi lewat rect text-node (bukan tinggi
elemen, yang bisa menipu karena padding dan ikon).

---

## Ringkasan

| Repo | Critical | Major | Minor |
|---|---|---|---|
| Komunitas | 2 | 3 | 2 |
| medprom | 0 | 1 | 2 |

medprom hampir bersih: **0 pelanggaran axe** di kelima rute, 0 anti-pattern
sumber, kontras lulus, target sentuh 44px, tombol disabled punya tiga kanal.
Yang tersisa adalah satu bug luber di 320px dan dua catatan kecil.

Komunitas punya masalah nyata yang berulang, dan ironisnya DESIGN.md sendiri
sudah memperingatkannya.

---

## CRITICAL — komunitas

### C1. Token tosca salah dipakai sebagai latar tombol → kontras 3.85:1

`--brand-tosca` (`#00918e`, setara `brand-primary-500`) dipakai sebagai
**latar** tombol berteks putih di **18 tempat**. Rasio terhitung: **3.85:1**
gagal AA 4.5:1 untuk teks 12–14px.

DESIGN.md sudah melarangnya, di baris yang sama:

> `brand-primary-500` `#00918e` — **Dekoratif saja (3.86:1 — JANGAN teks kecil di terang)**
> `brand-primary-600` `#007a78` — **CTA surface (AA 5.18:1)** — semua teks/button di terang pakai ini

Jadi token yang benar (`#007a78`) sudah ada; 18 pemakaian ini memakai yang
salah. axe menandai ini `serious` dengan 66 node di `/events` dan 86 node di
`/community`.

Bukti: `axe-core` → `.bg-\[var\(--brand-tosca\)\] :: insufficient color contrast of 3.85 (foreground #ffffff, background …)`.

Berkas (18 pemakaian, semuanya `bg-[var(--brand-tosca)]` + `text-white`):

| Berkas | Jumlah |
|---|---|
| `EventsLandingPage.tsx` | 4 |
| `EventSubmissionPage.tsx` | 3 |
| `CommunityLandingPage.tsx` | 1 |
| `CommunityDirectoryPage.tsx` | 1 |
| `EventPublicDetailPage.tsx` | 1 |
| `ExhibitionsLandingPage.tsx` | 1 |
| `GalleryAlbumPage.tsx` | 1 |
| `GalleryIndexPage.tsx` | 1 |
| `NewsArticlePage.tsx` | 1 |
| `NewsIndexPage.tsx` | 1 |
| `RegistrationPage.tsx` | 1 |
| `SponsorLandingPage.tsx` | 1 |
| `TenantDirectoryPage.tsx` | 1 |

Perbaikan: ganti `bg-[var(--brand-tosca)]` → `bg-[var(--brand-tosca-600)]`
(atau `bg-brand-primary-600`) **khusus saat berteks putih**. Tosca-500 tetap
boleh untuk ikon, titik, batang grafik, dan dekorasi tanpa teks.

### C2. Hero beranda berisi angka yang tidak punya sumber

Hero menampilkan lencana **"232+ Event Sudah Terlaksana"**. Sementara
`/events` menampilkan **TOTAL 251**. Dua angka ini bertentangan, dan tidak ada
satu pun yang bisa saya lacak sumbernya.

Gate 46 Hallmark: angka yang tidak diberikan pemilik produk dan tidak punya
sumber adalah slop. Angka yang saling bertentangan lebih buruk lagi: pembaca
yang melihat keduanya langsung kehilangan kepercayaan pada seluruh halaman.

Perbaikan: tentukan satu definisi ("event terlaksana" vs "total event"),
ambil dari API yang sama, atau ganti dengan label tanpa angka.

---

## MAJOR — komunitas

### M1. `--brand-tosca` juga dipakai di tempat yang teksnya lebih kecil

Terkait C1, tapi beda manifestasi: di `/events` ada teks putih 10px di atas
latar tosca (`19 September 2026`, kontras 3.67:1) dan chip 12px (3.53–3.96:1).
Di bawah 14px, ambang tetap 4.5:1, jadi ini gagal. Perbaikan sama: pakai
toscа-600, dan naikkan teks 10px ke minimal 12px (lantai tipografi yang
dipakai medprom).

### M2. Warna pink di bawah ambang untuk teks kecil

Di `/community`, `#c92d62` (pink sekunder) sebagai teks 12px mencapai
**4.41:1**, sedikit di bawah 4.5:1. DESIGN.md sendiri membatasi pink untuk
"badge/chip kecil" dan "satu sinyal per viewport". Perbaikan: gelapkan pink
untuk teks kecil, atau ubah menjadi latar chip dengan teks gelap.

### M3. Lompatan tingkat heading

`/` melompat `h1 → h3 → h4 → h2` (axe: `heading-order`, moderate). Urutan
heading adalah peta navigasi bagi pengguna screen reader; lompatan membuat
struktur halaman tidak terbaca. Perbaikan: urutkan ulang level, atau turunkan
kartu-kartu ke `h2`/`h3` yang konsisten.

---

## MINOR — komunitas

### m1. Alt gambar mengulang teks di sebelahnya

`image-redundant-alt`, 3 node di `/` (kartu event). Alt yang menduplikasi
judul yang sudah ada membuat screen reader membacanya dua kali. Perbaikan:
alt kosong (`alt=""`) bila gambar murni dekoratif di samping judul, atau
alt yang menambah informasi.

### m2. "Lihat Foto →" pada kartu galeri

Panah `→` ditaruh sebagai teks dalam label. Bukan pelanggaran, tapi panah
sebagai karakter termasuk sinyal "generated". DESIGN.md komunitas menganut
ikon Lucide; lebih baik pakai ikon `ArrowRight` dengan `aria-hidden`.

---

## MAJOR — medprom

### M4. Teks meluber di 320px

Di `/ajukan`, `Feed Instagram/Fanpage/TikTok` (kelas `text-sm font-semibold`)
meluber sampai `right=340px` pada viewport 320px. Penyebabnya kata majemuk
panjang dengan garis miring tanpa titik putus, dan `overflow-wrap: normal`.

Bukti: `document.documentElement.scrollWidth = 320` (tidak ada scroll
horizontal — ada kliping), tapi elemen melampaui tepi dan terpotong.

Perbaikan: tambah `overflow-wrap: anywhere` (atau `min-w-0` pada flex induk)
di label itu.

---

## MINOR — medprom

### m3. Link inline "Lacak dengan nomor pengajuan" tinggi 18px

Target 18px, di bawah ambang WCAG 2.5.8 (24px). Karena ini link di dalam
kalimat, ada pengecualian "inline text link", jadi **bukan pelanggaran** —
tapi layak diperhatikan bila dipakai sebagai target utama.

### m4. `overflow-x` tidak di-set `clip`

`html` dan `body` memakai `overflow-x: visible` (bawaan). Tidak ada scroll
horizontal di semua viewport yang diuji (320–1280), jadi ini aman hari ini.
Gate 34 Hallmark menyarankan `overflow-x: clip` di keduanya sebagai jaring
pengaman, supaya satu elemen meluber di masa depan tidak langsung membuka
scroll horizontal. Karena M4 sudah menunjukkan ada elemen yang meluber,
saran ini jadi relevan.

---

## Yang sudah benar (jangan diutak-atik)

medprom — hasil pengukuran, bukan kesan:

- **0 pelanggaran axe** di `/`, `/ajukan`, `/riwayat`, `/lacak`, `/login`
- **0 anti-pattern sumber**: tidak ada `transition-all`, `hover:scale`,
  gradien ungu/biru, font terlarang (Inter/Roboto/Poppins), emoji sebagai ikon,
  side-stripe border, atau `#000`/`#fff` murni
- Kontras semua teks lulus (dihitung terhadap latar efektif)
- Target sentuh 44px; input dan tombol sama tinggi (44px)
- Tombol disabled punya tiga kanal: `opacity: 0.5` + `cursor: not-allowed` +
  atribut `disabled`
- `prefers-reduced-motion` ada; `focus-visible` ada
- Satu `h1` per halaman; `lang="id"`
- 0 gambar tanpa alt; 0 input tanpa label
- Label dengan `htmlFor`/`id` (terverifikasi di `/lacak`)
- Tanpa scroll horizontal 320–1280px
- Keputusan desain sadar: eyebrow + rule + dua CTA, tosca hemat, hero tanpa
  gambar (sesuai DESIGN.md "Tipografi sebagai Hero")

komunitas — yang juga sudah benar:

- Nav mobile: hamburger `aria-label="Buka menu"` + `aria-expanded="false"`,
  nol link bocor di 320/375
- Tanpa scroll horizontal di semua viewport
- Nol gambar rusak di `/`, `/events`, `/gallery` (10 + 1 + 7 gambar)
- `/gallery` dan `/daftar`: **0 pelanggaran axe**
- Satu `h1` per halaman, 0 gambar tanpa alt, 0 input tanpa label
- Teks klik **tidak** membungkus dua baris (diverifikasi lewat rect text-node:
  pada 375px hanya `Jadwal Event` di nav yang 2 baris — lihat catatan)

Catatan: satu-satunya teks klik dua baris adalah `Jadwal Event` di nav
komunitas (2 baris pada 1280px karena lebar tombol sempit, dan di 375px
tombolnya berubah jadi ikon). Gate 49 melarangnya, tapi karena di 375px
sudah jadi ikon dan di desktop tetap terbaca, saya turunkan ke minor —
**m5**: lebarkan sedikit tombol nav `Jadwal Event` atau pakai `whitespace-nowrap`.

---

## Catatan metode

- Pemeriksa kontras otomatis saya awalnya melaporkan 10 kegagalan di beranda
  komunitas (mis. "Ada pertanyaan? Hubungi kami!" 1.07:1). Setelah menelusuri
  latar efektif, teks itu duduk di atas latar **gambar** yang tidak bisa
  dibaca `getComputedStyle`, sehingga perhitungan saya salah. axe-core yang
  menangani kasus ini dengan benar melaporkan 1 pelanggaran, bukan 10. Angka
  axe yang saya pakai.
- Deteksi "teks klik dua baris" saya awalnya melaporkan 8–12 elemen; itu
  artefak dari mengukur tinggi elemen (padding + ikon SVG). Setelah dihitung
  dari rect text-node saja, hasilnya nol (kecuali `Jadwal Event`).
- Tangkapan layar "375px" saya yang pertama juga salah (viewport tidak
  terpasang saat `open`); diulang dengan `setViewport` eksplisit.

Tiga koreksi ini saya catat supaya pembaca tahu angka mana yang bisa dipercaya.

---

## Rencana perbaikan

Urutan berdasarkan dampak. Semua perubahan token terpusat, jadi sebagian
besar bisa selesai dalam satu pass.

1. **C1 + M1** — ganti 18 pemakaian `bg-[var(--brand-tosca)]` berteks putih
   menjadi `bg-[var(--brand-tosca-600)]`. Tambah aturan di DESIGN.md bahwa
   tosca-500 dilarang sebagai latar berteks. Verifikasi ulang dengan axe.
2. **C2** — selaraskan angka "event terlaksana" dengan `/events`, atau
   hilangkan angka.
3. **M2** — gelapkan pink untuk teks kecil, atau ubah jadi latar chip.
4. **M3** — rapikan urutan heading beranda.
5. **M4** — `overflow-wrap: anywhere` pada label media di wizard.
6. **m1–m5** — alt dekoratif, panah → ikon, tinggi link, `overflow-x: clip`,
   `whitespace-nowrap` nav.

Gate setelah perbaikan: axe-core 0 pelanggaran di 10 rute, plus seluruh suite
test kedua repo (medprom 33/285, komunitas 69/470) dan CRLF=0.

---

## Koreksi pasca-perbaikan (2026-09-19)

Bagian di atas **tidak diubah** — itu catatan apa yang terukur saat itu. Yang
berikut adalah koreksi setelah perbaikan dijalankan dan diukur ulang dengan
axe-core **4.13.0** + pengukuran DOM langsung. Audit asli sudah mencatat tiga
kesalahan metodenya sendiri; koreksi ini meneruskan praktik yang sama: angka
yang salah diperbaiki, angka yang bertahan dipertahankan.

### C1 — atribusi salah (koreksi utama)

Audit menulis axe menandai "66 node di `/events` dan 86 node di `/community`"
untuk `bg-[var(--brand-tosca)]` + teks putih. Pengukuran produksi independen:

- `/community`: **86 node kontras**, tetapi **0 dari 86 berlatar `#00918e`**.
  85 berlatar pink pucat `#fce7ef`; 1 berlatar `#007a78` (lulus).
- `/events`: **71 node** (bukan 66), dan hanya **3** berlatar `#00918e`.
  Sisanya `#fffdf9` (32), `#fdfcf7` (8), `#81887f` (4), `#feeff2` (4),
  plus chip kategori pastel 10px.

Jadi cacat tosca-500 itu **nyata** (18 situs, semuanya terkonfirmasi berteks
putih) tetapi **bukan** penyumbang mayoritas kegagalan kontras. Penyebab
dominan adalah chip pastel 10px dan teks pink-di-atas-pink — tidak pernah
disebut audit.

Catatan aritmetika: putih di atas `#00918e` sebenarnya **3.86:1**, bukan
3.85:1. `utilities.css:3` memang sudah menulis 3.86.

### M2 — understated, dan ternyata terlihat axe (koreksi)

Node pink `#c92d62` di `CommunityDirectoryPage.tsx` terukur **4.42:1** di atas
`#fce7ef`. Klaim awal — bahwa axe melaporkan **0 pelanggaran** karena badge
`aria-hidden` sehingga tooling otomatis "tidak akan pernah" menangkapnya —
**terbantah eksperimen**. `aria-hidden` memengaruhi accessibility tree, bukan
rendering visual; pemeriksaan kontras axe bersifat visual, jadi axe **tetap
mengevaluasi** elemen `aria-hidden`.

Eksperimen terkendali (axe 4.13.0, tag
`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`):

| case | warna | `aria-hidden` | hasil axe |
|---|---|---|---|
| c1 | `#a82150` di `#fce7ef` (5.94:1) | false | tidak ada pelanggaran |
| c2 | `#a82150` di `#fce7ef` | **true** | tidak ada pelanggaran |
| c3 | `#c92d62` di `#fce7ef` (4.42:1) | false | **PELANGGARAN** |
| c4 | `#c92d62` di `#fce7ef` | **true** | **PELANGGARAN** |

Output mentah axe untuk c4: `Element has insufficient color contrast of 4.41
(foreground #c92d62, background #fce7ef, 9.0pt (12px), bold). Expected 4.5:1`.
Jadi axe **memang** menangkap regresi ini, `aria-hidden` atau bukan.

**Alasan sebenarnya gate lokal menunjukkan 0 pelanggaran di `/community`:**
data mock yang tipis, bukan kebutaan axe. Mock `/community` di
`e2e/a11y.config.ts` hanya berisi 2 organisasi (`community`, `school`) dan
**tanpa** organisasi `eo` — sehingga badge `eo` (yang gagal di audit) tak pernah
dirender secara lokal. Gap ini sudah diperbaiki: mock kini memuat seluruh 8 nilai
`OrganizationType` termasuk `eo`, dan gate tetap lulus (9/9) karena sumber sudah
memakai `brand-secondary-700` (`#a82150`, 5.94:1).

Gate juga terbukti **tidak hampa** untuk cacat ini: dengan mock yang diperkaya,
mengembalikan badge `eo` ke `#c92d62` lama membuat axe melaporkan tepat **1**
pelanggaran `color-contrast` pada `.bg-brand-secondary-100`. Jadi bila warnanya
regresi di `src/`, gate-nya **akan** merah.

Perbaikan 4.42:1 → 5.94:1 sendiri tetap benar dan berlaku: `brand-secondary-700`
(`#a82150`) = **5.94:1**, dikunci unit test yang menghitung rasionya dari token
asli.

**Catatan penting — repo ini tidak punya CI.** Tidak ada direktori `.github/`
sama sekali (terverifikasi: path tidak ada). `vercel.json` hanya berisi
`rewrites`/`headers` dan tidak menjalankan test apa pun. Jadi `npm run test:a11y`
adalah **gate manual on-demand** — ia tidak ditegakkan otomatis saat push atau
deploy. Enforcement otomatis butuh menambahkan workflow CI, yang saat ini belum
ada.

### m1 — node yang disebut salah

3 node `image-redundant-alt` adalah kartu Instagram ter-cache di
`CommunityGallery.tsx`, **bukan** kartu event seperti tertulis di audit.
Dibuktikan lewat eksperimen: menghapus `<p>` caption menurunkan pelanggaran
3→0, dan mengosongkan `alt` juga 3→0.

### m5 — tidak dapat direproduksi

"Jadwal Event" membungkus dua baris **tidak dapat direproduksi**: pengukuran
rect text-node pada 375/640/700/768/800/900/1000/1023/1024/1100/1152/1280/1366/1440px,
plus keadaan header ter-pin pada `scrollY=1500`, semuanya `lineCount=1`.
`whitespace-nowrap` tetap ditambahkan sebagai pertahanan (memang belum ada,
berbeda dari sibling-nya). Dengan jujur: **pengukuran audit ini tidak dapat
direproduksi.**

### M4 — kelas overflow yang sama ada di repo ini, dan metrik audit menyembunyikannya

Di 320px, tiga kartu kontak di `CommunityContact.tsx` terukur `right=335` pada
viewport 320px — konten meluber dan **terkliping**. Namun
`scrollWidth === clientWidth === 320`, jadi setiap pemeriksaan "tanpa scroll
horizontal" lulus. Catatan audit sendiri tentang kelas kesalahan pengukuran ini
berlaku juga untuk repo komunitas. Diperbaiki `min-w-0` + `break-words`; kini
`right=298`.

### "CRLF=0" — gate tak terdefinisi, dan jika dibaca literal mustahil

String `CRLF=0` muncul **tepat sekali** di seluruh repo (baris penutup di atas),
tanpa pernah didefinisikan. `core.autocrlf=true` di-set di level **system**
(default Git-for-Windows), tidak ada `.gitattributes` dan tidak ada
`.editorconfig`. Dari 970 file tracked: **693 ber-CRLF di worktree** (66 LF,
204 binary/`-text`, 6 `w/mixed`, 1 none), dan **7 file sudah mixed** sejak
sebelum perbaikan (`.cursor/skills/ui-ux-pro-max/data/landing.csv`,
`.kiro/steering/ui-ux-pro-max/data/landing.csv`, tiga `docs/archive/*.md`,
`presentasi/index.html.deck-a-backup.html`). Jadi "nol CRLF" tidak bisa menjadi
kriteria penerimaan pasca-perbaikan.

Arti paling masuk akal: **0 file yang internally-mixed** (perbaikan tidak boleh
menambah file campur), atau **0 flip EOL tak disengaja**. Dua perintah yang
benar-benar memeriksanya:

```sh
git ls-files --eol | grep 'w/mixed'        # bandingkan dengan baseline 6 di atas
git diff --numstat | awk '{ if ($1>20 && $2>20) print }'   # curigai rewrite EOL seluruh-file
```

### Bukti axe tidak dapat direproduksi — sekarang bisa

`axe-core` **tidak ada sama sekali di repo** (hanya `saxes`, false-positive
substring, yang cocok di lockfile). Gate-nya kini dapat dijalankan:
`npm run test:a11y`.

### Keadaan akhir terukur

- `npm run test:a11y` → **0 pelanggaran axe di 5 rute × 5 viewport**
  (320/375/414/768/1280), axe-core **4.13.0**, tag
  `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`.
- `npx tsc --noEmit` → exit **0**.
- `npx vitest run` → **518/518 test, 74/74 file**, semua lulus (+13 test
  regresi kontras hero, lihat di bawah).

### `0 pelanggaran ≠ 0 unresolved` (koreksi 2026-09-20)

Angka **0 pelanggaran** di atas hanya berarti axe **tidak menemukan pelanggaran
di antara node yang berhasil ia evaluasi** — bukan bahwa setiap node teks sudah
terverifikasi. axe juga mengembalikan **`incomplete`**: node yang **tidak dapat
ia evaluasi**, yang bukan lulus dan bukan gagal, dan tidak dihitung ke dalam
"0 pelanggaran". Secara struktural axe memang tidak dapat mengevaluasi kontras
teks di atas gradien, jadi node seperti itu selalu muncul sebagai `incomplete`.
Untuk hitungan `incomplete` terkini per rute/viewport, jalankan
`npm run test:a11y` lalu baca `reports/a11y/axe-report-*.json` — artefak itu
**di-regenerate oleh setiap run** (bukan file statis yang di-check-in;
`reports/` ada di `.gitignore`).

Snapshot terukur 2026-09-20, dihasilkan `npm run test:a11y` (angka historis,
bukan hitungan terkini). Pengukuran langsung (menyusun ulang alpha
teks di atas latar yang benar-benar dirender, lalu menghitung rasio) menunjukkan
**103 instance `incomplete` (25 node unik) sebelum perbaikan**, dan **12 node
unik** di antaranya benar-benar gagal ambang AA (~36–37 instance); setelah kedua
belas perbaikan, himpunan `incomplete` menyusut menjadi **98 instance (24 node
unik)**. Satu node — lencana hitung pil
aktif `/community` (1 karakter) — **keluar dari himpunan `incomplete`
sepenuhnya** ketika lencananya pindah dari `text-white/70` ke `text-white`
penuh, sehingga `/community` kini **nol node `incomplete`**. Node `incomplete`
**bukan** lulus. **Pil itu sudah SELESAI (terukur di DOM live):**
`src/components/CommunityDirectoryPage.tsx:233` memakai `tabular-nums text-white`
saat aktif di atas `bg-brand-primary-600` (`#007a78`) — rasio terkomposit
**5.18:1**, **LULUS** AA 4.5:1 di kelima viewport (raw: teks
`rgb(255,255,255)`, latar `rgb(0,122,120)`, 11px/600). Wording lama "3.36:1"
menggambarkan `text-white/70` **pra-perbaikan** dan **tidak** berlaku lagi.

Kedua belas node unik yang benar-benar gagal AA:

| rute | node | sebelum | sesudah |
|---|---|---|---|
| `/` | `.text-white/65` paragraf (16/400) | 4.15 | 4.82 |
| `/` | `.border-white/25` CTA "Isi Form di Halaman Ini" (16/600) | 4.22 | 6.58 |
| `/` | `.text-white/75` chip "100% Gratis" (14/400) | 2.44 | 5.60 |
| `/` | `.text-white/75` chip "Sound 10K Watt" (14/400) | 2.44 | 5.54 |
| `/` | `.text-white/75` chip "Terbuka untuk Semua" (14/400) | 2.01 | 5.54 |
| `/events` | `.text-white/50` "Jadwal Event" (12/400) | 4.07 | 6.46 |
| `/events` | nav footer `.text-white/60` (Komunitas/Galeri/Kalender/Ajukan Event/Daftar, 14/500) | 3.59–4.12 | 5.11–6.03 |
| `/community` | `.text-white/70` lencana hitung pil aktif di `#007a78` (11/600) | 3.36 | 5.18 (kini `text-white` penuh) |

Catatan metrik tabel: kolom **"sesudah"** di atas diukur dengan metrik piksel
terang yang **konservatif** (piksel paling terang di region teks) pada saat
perbaikan; `reports/a11y/incomplete-census.json` mengukur node yang **sama**
dengan metrik berbeda — **median pada rect baris teks yang ketat**
(`Range.getClientRects`). Keduanya sah, dan karena metriknya berbeda angkanya
memang berbeda (mis. `.text-white/65` = 4.82 di tabel vs **5.10** di sensus
[instance terburuk, @1280px]; chip 5.60/5.54/5.54 vs **5.66/5.59/5.59** di
sensus sebagai kasus terburuk per node); angka tabel **tidak** diganti agar
jejak pengukuran awal tetap tercatat.

Catatan angka: **"44 dari 103" yang tercatat sebelumnya terlalu luas ~3–4x.**
Angka itu tampaknya menghitung node header/nav berlatar gelap, `h1` besar,
aksen tosca, dan paragraf 18–20px — semuanya **lulus** (terukur 4.76–10.91:1) —
dan/atau mencampur node unik dengan instance per-viewport. Re-measurement
independen dengan tiga metode deterministik (warna mode piksel ter-render;
sama tetapi teks di-`color:transparent` untuk mengisolasi latar murni; dan
komposit analitik stop gradien yang diparse dalam urutan paint) memberi angka
yang benar: **12 node unik, ~36–37 instance.**

**Semua 12 kegagalan terkonfirmasi kini SUDAH DIPERBAIKI**, diverifikasi
sebelum→sesudah (viewport terburuk, metrik piksel terang yang konservatif):

- **Akar masalah `/` — ekor terang gradien hero.** `.bg-gradient-hero-tosca`
  di `src/styles/gradients.css` memudar lewat `#33a8a5`→`#99dfde`→`#f8f7f0` di
  15% terakhirnya, dan copy hero mencapai ~86.5% kotak gradien pada 320px.
  Terminus krem itu **load-bearing** (menyambung ke section terang di bawah
  hero), jadi kedelapan stop dan ujung `#f8f7f0` yang persis **dipertahankan**;
  fade-nya **dipindah ke band kosong di bawah copy** (`#00554c` kini bertahan
  sampai 92%, lalu memudar 96.5→100%). Perbaikan memakai token
  `--brand-tosca-dark` (`#00554c`) yang sudah ada, tanpa literal baru.
- **`/events`** — gradien footer memang gelap di garis nav (latar terburuk
  `rgb(0 100 96)`), jadi menaikkan opasitas putih fraksional adalah perbaikan
  yang benar (`/50`→`/70`, `/60`→`/80`).
- **`/community`** — pil aktif kini `text-white` (opasitas penuh) di atas
  `bg-brand-primary-600` (`#007a78`): terukur **5.18:1 → LULUS** AA di kelima
  viewport (sebelumnya `text-white/70` = **3.36:1, GAGAL**; alpha minimum yang
  lulus dihitung **0.90**). Inilah sebab node itu keluar dari himpunan
  `incomplete`.

**Koreksi penting — jebakan `oklab`.** Klaim lama di dokumen ini bahwa browser
me-resolve `color-mix()` menjadi `rgb()` adalah **SALAH di build Tailwind v4
ini**: Chrome melaporkan `oklab(...)` untuk `text-white/65` dan
`color(srgb ...)` untuk permukaan `color-mix()`. Pipeline apa pun yang hanya
memparse `rgb()` akan **gagal senyap di setiap node putih fraksional**.

**Yang tetap benar:** `incomplete` **bukan** lulus. Setelah perbaikan, axe
**masih** mengembalikan node gradien sebagai `incomplete` (jumlah terkini:
lihat `reports/a11y/axe-report-*.json`) karena secara struktural ia tidak
dapat mengevaluasi gradien — itu memang diharapkan. Node pil `/community`
**keluar** dari himpunan incomplete sepenuhnya. Jadi pernyataan yang jujur:
**12 node memang gagal, kini diperbaiki dan diverifikasi lewat pengukuran
langsung, dan axe tetap melaporkan node gradien sebagai tak dapat dievaluasi.**
Ini **bukan** klaim bahwa halaman kini "terverifikasi penuh".

Test regresi baru `src/utils/__tests__/heroContrast.test.ts` (13 test)
memparse stop asli `gradients.css`, mengomposit alpha putih di atasnya, dan
menegaskan AA di seluruh region copy — plus aritmetika alpha minimum pil dan
gradien footer. Terbukti merah bila stop gradien dikembalikan.

### Gate hanya menguji mode terang (caveat)

`playwright.a11y.config.ts` **tidak** menyetel `colorScheme`, jadi seluruh 5
rute × 5 viewport diukur pada tema **terang** bawaan aplikasi saja. Setiap
varian `dark:` **tidak teruji** oleh gate ini — contoh konkret: kelas
`dark:text-slate-400` di `src/components/EventsLandingPage.tsx` (badge hitung
kategori) tidak pernah dirender maupun dievaluasi axe dalam mode gelap.
Kontras mode gelap harus diverifikasi terpisah (mis. `colorScheme: 'dark'`
pada config) bila ingin diklaim lulus.

### Batas cakupan gate (keterbatasan yang diketahui)

Gate ini hanya mencakup **5 rute publik**: `/`, `/events`, `/gallery`,
`/community`, `/daftar`. Node putih-semi-transparan-di-atas-gradien pada rute
tersebut dienumerasi dan diukur (sensus yang dihasilkan harness). Situs
`text-white/N` (`grep -rn "text-white/[0-9]" src/`, ±18 berkas) pada rute atau
permukaan **di luar kelima rute itu** — mis. `/dashboard`, `/login`, `/ajukan`,
`/pameran`, `/tenants`, dan seluruh permukaan admin/tenant — **tidak diukur
oleh gate ini**. Jadi gate ini **bukan** jaminan kontras sekelas seluruh situs;
ia jaminan untuk kelima rute publik tersebut saja.

Satu permukaan di luar kelima rute itu **kini** ikut diukur — oleh test khusus,
bukan oleh sweep rute: `/events/:id` (halaman detail event publik) beserta
lightbox `EventPhotoGallery`. Sweep **tetap** 5 rute, jadi bentuk "5 rute" dan
seluruh hitungan artefak (`axe-report-*.json`, sensus) tetap sah; cakupan detail
ditambahkan sebagai test terpisah `event detail page — /events/:id +
EventPhotoGallery lightbox` (5 viewport) di `e2e/a11y.spec.ts` — lihat § "DUA
celah cakupan detail event" di bawah, yang kini berstatus **DITUTUP**.

### Sensus pasca-perbaikan — 24 node `incomplete` kini terukur LULUS (2026-09-20)

Setiap node `incomplete` diukur ulang pasca-perbaikan dengan komposit piksel
langsung, bukan asumsi. Metode: warna computed di-resolve ke sRGB termasuk alpha
via canvas; **hanya teks** yang dibuat transparan (latar translusen elemen
dipertahankan); screenshot disampel pada rect baris teks (`Range.getClientRects`)
dan diambil median; ambang WCAG per node (3:1 untuk teks besar ≥18pt atau ≥14pt
bold, selain itu 4.5:1).

Hasil: **24/24 node `incomplete` unik LULUS AA.** Terburuk **5.10:1** (paragraf
hero `.text-white/65` pada 1280px) dan terbaik **11.33:1** (`h1` `/` pada
1280px, diukur terhadap ambang teks besar 3:1) — keduanya adalah **kasus
terburuk per node unik** (test men-dedup node dan menyimpan instance
terburuknya). Rasio maksimum per baris mentah di berkas adalah **12.15:1**;
keduanya benar dan mengukur hal yang berbeda. Terukur dari
`reports/a11y/incomplete-census.json` — berkas itu memuat **98 instance node
`incomplete`** tersebar di **25 kombinasi rute×viewport** (5 rute × 5 viewport;
98 = 63 instance di `/` [11+11+11+13+17] + 35 di `/events` [7×5]), bukan 98
entri rute×viewport.

Ini kini **reproduksibel**, bukan sekali jalan: gate punya test
`every axe 'incomplete' node passes AA when measured directly` (helper
`e2e/a11y.census.ts`) yang menjalankan sensus pada setiap `npm run test:a11y`
dan **gagal** bila ada node di bawah AA atau tak dapat diukur; tabel per node
ditulis ke `reports/a11y/incomplete-census.json`. Target node juga kini
terdaftar di tiap `reports/a11y/axe-report-*.json` pada `incomplete[].nodes[]`.
Gate terkini: `npm run test:a11y` → **14 passed** (dari 11; +2 test lightbox
album `/gallery/<slug>` 375 + 1280px, +1 test detail `/events/:id`).

Rantai yang jujur: `incomplete` **tetap bukan** lulus — axe secara struktural
tidak dapat mengevaluasi gradien — tetapi node yang tersisa **tidak lagi
unresolved**: ia diukur dan lulus, dan pengukuran itu dijalankan ulang oleh
gate. Ini **bukan** pernyataan "24 node unresolved".

### Keputusan `ignoreLength` (cakupan, bukan perubahan vonis)

Pemeriksaan `color-contrast` axe memindahkan node **1 karakter yang GAGAL**
keluar dari `violations` ke `incomplete` kecuali `ignoreLength: true` (bawaan
`false`; sumber: metadata check `axe-core@4.13.0` `ignoreLength: false`, dan
`axe.js` baris ~27280 `else if (!isValid && shortTextContent && !ignoreLength)`).
Itu adalah tempat persembunyian persis kelas cacat yang pernah menggigit kami —
badge hitung pendek / label 1 karakter (pil `/community`).

Gate kini menyetel `ignoreLength: true` lewat jalur bersarang yang **BENAR**
`rules.<rule>.checks.<check>.options` (axe `getCheckOption` `axe.js:19278`
membaca opsi check di sana; `rules.<rule>.options` tingkat rule diabaikan
senyap — terkonfirmasi empiris sebagai no-op). Efek terukur hari ini: **tidak
ada** — 0 pelanggaran baru di seluruh 25 pasangan rute×viewport, gate tetap
hijau. Keuntungannya: kegagalan 1 karakter di masa depan kini muncul sebagai
pelanggaran yang nyaring alih-alih lenyap ke `incomplete`.

### Lightbox foto — kontras counter + cacat a11y `EventPhotoGallery` (2026-09-20)

#### 1. Counter `PhotoLightbox` gagal AA (kegagalan nyata)

`src/components/PhotoLightbox.tsx:117` — counter `<p className="text-xs
text-white/40">` di dalam dialog `bg-slate-950/85` terukur **3.31:1** (lightbox
area event) / **3.33:1** (lightbox album galeri) → **GAGAL** AA 4.5:1 (teks
12px). axe: `color-contrast`, `serious`, "insufficient color contrast of 3.34
(foreground #838885, background #313833, 9.0pt (12px) normal). Expected
4.5:1".

Alpha putih minimum yang lulus dihitung **0.522** — jadi `/50` = **4.27:1
masih gagal**, dan `/60` = **5.40:1** adalah langkah terkecil yang lulus.
Dipakai **`text-white/70`** (satu langkah di atas ambang, margin aman) →
terukur **6.71:1** / **6.79:1** → **LULUS**; axe di dalam dialog kini **0
pelanggaran**. Komponen ini dipakai bersama oleh grid album `/gallery/<slug>`
dan kartu foto area event `/`.

#### 2. Kenapa gate melewatkannya — celah cakupan album, kini ditutup

Gate tidak pernah berinteraksi dengan halaman mana pun (tidak ada
`page.click`/`hover`/`focus`), jadi tidak ada state modal/lightbox/dropdown/
hover/focus yang pernah dirender atau dievaluasi — lihat caveat
"NO-INTERACTIVE-STATE" di `e2e/a11y.config.ts`. Halaman album bahkan **tidak
dapat dirender**: `setupPublicApiMocks` menjawab `**/api/v1/albums*` untuk
endpoint DETAIL juga, mengembalikan `{albums, photos}` padahal
`GalleryAlbumPage` mengharapkan `{album, photos}` → state 404, tidak ada tile
yang bisa diklik.

Diperbaiki dengan handler lebih sempit `**/api/v1/albums/*` yang didaftarkan
**SETELAH** handler koleksi (Playwright mencocokkan handler dalam urutan
registrasi **TERBALIK**, jadi handler yang terakhir didaftarkan menang). Test
non-hampa baru di `e2e/a11y.spec.ts`: `interactive state — photo lightbox`
(375 + 1280px) — menegaskan h1 album, mengklik tile, menegaskan `[role=dialog]`
terlihat, menegaskan counter berada di dalamnya, lalu axe di-scope ke dialog.
Terbukti gagal bila bentuk mock rusak atau counter regresi. Caveat
"NO-INTERACTIVE-STATE" ditambahkan ke `e2e/a11y.config.ts`.

#### 3. Perbaikan a11y lightbox `EventPhotoGallery` (button-name CRITICAL)

`src/components/EventPhotoGallery.tsx` — `Lightbox` miliknya sendiri: tiga
tombol ikon-saja **tanpa nama aksesibel** → axe `button-name` **CRITICAL** ×2
(tutup, berikutnya; "sebelumnya" hanya dirender setelah navigasi). Diperbaiki
dengan `aria-label` yang sama persis dengan `PhotoLightbox.tsx` ("Tutup
lightbox", "Foto sebelumnya", "Foto berikutnya") + `aria-hidden="true"` pada
ikon lucide.

Juga `heading-order` (moderate): heading section `h3` melompat satu level
karena `/events/:id` merender `H1` (judul event) lalu `H3` tanpa `H2` di
antaranya → diubah ke `h2` (netral secara visual: kelas/font sama). Diverifikasi
dengan axe di-scope ke dialog: **0 pelanggaran** pada 375 + 1280px, dengan
bukti sebelum/sesudah.

#### 4. DUA celah cakupan detail event — sebelumnya TERBUKA, kini DITUTUP (2026-09-20)

Keduanya dulu dicatat **terbuka**; kini **ditutup** dan diverifikasi. Riwayatnya
dipertahankan supaya pembaca bisa menelusuri apa yang dulu tidak tercakup.

**(a) Dulu terbuka:** `EventPhotoGallery` **TIDAK** tercakup gate: ia butuh
event yang `event_id`-nya cocok dengan `DB_ALBUM_PHOTOS`, tetapi `/events/:id`
tidak pernah di-intercept — pola mock `**/api/v1/events` hanya mencocokkan jalur
koleksi (Playwright `*` tidak melewati `/`), sehingga fetch detail mengembalikan
404 dan halaman merender "Event tidak ditemukan". `evt_a11y_past` juga tidak
bisa dibuka lewat kartu karena landing page hanya menampilkan event
upcoming/ongoing.

**Kini ditutup:** `e2e/a11y.config.ts` menambahkan handler `**/api/v1/events/*`
yang mengembalikan **satu** baris `DB_EVENTS` untuk id yang dikenal dan 404
selainnya, didaftarkan **SETELAH** handler koleksi (Playwright mencocokkan
handler dalam urutan registrasi **TERBALIK**, jadi yang terakhir menang). Dengan
itu `/events/evt_a11y_past` merender event asli "Pameran Otomotif Bekasi 2026"
beserta grid foto `EventPhotoGallery` (foto `ph_a11y_*` membawa
`event_id: 'evt_a11y_past'`). Perbaikan di §3 karena itu **tidak lagi hanya
diverifikasi manual** — kini dijaga gate (lihat (b)).

**(b) Dulu terbuka:** `/events/:id` (halaman detail event publik) **bukan**
salah satu dari 5 rute terukur gate, jadi gate **tidak** mencakup halaman detail
event sama sekali.

**Kini ditutup:** test non-hampa khusus `event detail page — /events/:id +
EventPhotoGallery lightbox` di `e2e/a11y.spec.ts` mengukur `/events/evt_a11y_past`
di kelima viewport (320/375/414/768/1280). Setiap viewport: menegaskan heading
event asli dirender, menegaskan state "Event tidak ditemukan" **absen**,
menegaskan heading galeri + tile foto dirender, menjalankan sweep axe seluruh
halaman, lalu **membuka** lightbox, menegaskan `[role=dialog]` terlihat dan
tombol tutup punya nama aksesibel ("Tutup lightbox"), dan menjalankan axe
di-scope ke dialog. Hasil: **0 pelanggaran** di kelima viewport. Sweep 5 rute
sengaja **tidak** diubah (detail ditambahkan sebagai test terpisah), jadi bentuk
"5 rute" dan seluruh hitungan artefak tetap sah. Gate kini **14 passed** (dari
13).

**Cacat nyata yang ditemukan saat menutup celah ini:** `Lightbox` milik
`EventPhotoGallery` tidak punya `role="dialog"` — berbeda dari saudaranya
`src/components/PhotoLightbox.tsx` yang punya — sehingga overlay-nya tidak
diekspos sebagai dialog. Kini ditambah `role="dialog"` + `aria-modal="true"` +
`aria-label`. **Catatan jujur:** axe **tidak** menandai `role` yang hilang (role
`dialog` yang absen **bukan** pelanggaran axe di config ini); perbaikan
diverifikasi lewat pengukuran DOM langsung (`dialogVisible=true`), **bukan**
karena ada rule axe yang menyala.

**Falsifiabilitas terbukti:** merusak mock detail membuat test baru gagal dengan
"EVENT DETAIL / GALLERY NOT RENDERED"; menghapus `role="dialog"` membuatnya gagal
dengan "GALLERY LIGHTBOX NOT OPEN/UNNAMED". Keduanya dikembalikan persis seperti
semula.


