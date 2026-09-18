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
