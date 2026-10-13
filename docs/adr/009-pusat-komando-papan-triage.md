# Pusat Komando adalah papan triage, bukan panel dashboard

## Status

accepted (2026-10-13)

## Konteks

Pusat Komando (`/dashboard`) menjawab satu pertanyaan: **apa yang perlu saya
tindak hari ini, dan ke mana saya pergi?** Ia layar triage + wayfinding, bukan
layar eksplorasi data.

Pengukuran runtime (1440×1200, tema terang) menunjukkan halaman ini sudah
menjadi tiga hal sekaligus, dan tidak satu pun benar-benar selesai:

- Tinggi halaman **3335px** di 1440px, **5737px** di 375px.
- Urutan bagian: plat lokasi → strip status → **Grid Kartu Modul (18 kartu, 5
  grup, ADR-007)** → **6 blok analitik** → **tabel "Jadwal Event" penuh**.
- Tabel di bawah itu adalah **pohon komponen yang sama dengan
  `/dashboard/events`**, dirender lewat gerbang
  `dashboardPath === '/' || dashboardPath === '/events'`, hanya menyembunyikan
  `<h2>`-nya. Pusat Komando merender salinan halaman lain.
- Analitik mulai sekitar **1800px** di bawah halaman, di bawah 18 kartu.
- Di dalam analitik, data area dirender **tiga kali**: kartu "Utilisasi area"
  (satu angka), daftar batang "Event per area", dan tabel "Area paling sering
  dipakai".
- Kalimat antrian ditulis **dua kali** di satu halaman: petunjuk metrik lead
  (`DashboardStats`) dan bilah peringatan (`CommandCenterOverview`).
- Strip status memimpin dengan "Total Acara" dan "Selesai": dua angka yang
  tidak pernah ditindak.
- 18 kartu seragam dalam 5 grup adalah **direktori menu**, dan ADR-007 sendiri
  menyatakan tujuannya "panel dashboard, bukan daftar menu navigasi".

ADR-007 memilih grid kartu untuk menjawab keluhan "register datar terbaca
sebagai daftar menu". Keluhan itu benar, tetapi solusinya salah sumbu: yang
membuat sebuah halaman terbaca sebagai triage bukan bentuk kartunya, melainkan
**apakah bobot sebuah modul mengikuti keadaannya**. Grid 18 kartu seragam
menyamakan "Antrian Draft" dengan "Log Aktivitas" persis seperti enam kartu
metrik yang ditolak 2026-09-22, hanya dengan bentuk yang berbeda.

## Keputusan

Pusat Komando disusun ulang sebagai **papan triage + wayfinding**, dengan empat
blok bernama, masing-masing satu bentuk:

1. **Strip status** (`DashboardStats`): tiga tingkat, bukan lima kartu setara:
   satu angka antrian memimpin (aksen, angka terbesar, menjumlahkan draft +
   pendaftaran + pengajuan pameran), dua angka keadaan hari ini di bawahnya, dan
   pasangan rujukan ("Total Acara", "Selesai") turun menjadi **satu baris
   tenang** tanpa kartu. Rincian antrian tidak lagi ditulis di sini.
2. **Register "Perlu tindakan"** (`CommandCenterSummary`): hanya modul yang
   benar-benar menunggu keputusan manusia. Satu baris penuh per modul: angka
   antriannya, keadaannya dalam kata, dan aksi yang membersihkannya. Modul tanpa
   antrian tidak muncul di sini.
3. **Band "Hari ini di mall"** (`CommandCenterAgenda`, baru): yang sedang
   berjalan dan yang berikutnya (maks. 3 baris per kolom), plus tautan ke
   `/dashboard/events`. Menggantikan salinan penuh halaman Jadwal Event.
4. **Register "Semua modul"** (`CommandCenterDirectory`, baru): direktori
   tujuan, satu baris ringkas per modul, dikelompokkan per Dashboard Group,
   **tanpa angka**, dua kolom dari `lg`.

Konsekuensi langsung:

- **`/dashboard` berhenti merender halaman Jadwal Event.** Gerbang tabel penuh
  menjadi `dashboardPath === '/events'` saja; `/dashboard/events` tidak berubah
  sama sekali. Karena tabel penuh tidak lagi ada di `/dashboard`, kotak pencarian
  plat lokasi (yang menulis ke filter event bersama) juga hanya dirender di
  `/dashboard/events`; di Pusat Komando ia kontrol yang tidak mengubah apa pun.
- **Analitik eksplorasi dipindahkan ke rute yang memilikinya, satu per satu.**
  `CommandCenterOverview` dihapus. Pemetaannya persis, bukan klaim umum:

  | Blok yang dihapus dari `/dashboard` | Tempat pertanyaannya kini terjawab |
  |---|---|
  | `Tren event per bulan (2026)` | `/dashboard/analytics` → "Tren Event per Bulan" (`AnalyticsDashboard`), lengkap dengan pembanding tahun sebelumnya |
  | `Event per kategori` | `/dashboard/analytics` → "Kategori Terpopuler" |
  | `Event per area` | `/dashboard/analytics` → "Top Lokasi" |
  | `Area paling sering dipakai` | `/dashboard/insights` → insight "Area paling sering dipakai" (`src/utils/eventInsights.ts`) |
  | `Utilisasi area` | **tidak punya pengganti.** Lihat catatan di bawah |

  Tidak ada endpoint atau agregasi baru. Catatan penting soal dua blok terakhir:
  `AnalyticsDashboard` **tidak** memuat "Utilisasi area", "Event per kategori",
  "Event per area", maupun "Area paling sering dipakai" dengan nama itu; yang
  ia miliki adalah empat panel bernama lain di atas. "Area paling sering
  dipakai" bertahan sebagai **judul insight**, bukan sebagai tabel, sehingga ia
  hanya muncul bila insight-nya lolos syarat (`computeAreaUsage` menghasilkan
  area teratas dengan minimal 2 event).

- **"Utilisasi area" sengaja dibuang, bukan dipindahkan.** Angka "berapa area
  aktif yang sedang terpakai sekarang" adalah fakta kapasitas venue, bukan
  pertanyaan triage: tidak ada keputusan yang berubah karenanya. Band "Hari ini
  di mall" sudah menyebut **lokasi** tiap event yang sedang berjalan, jadi
  hunian area langsung terbaca dari barisnya, sementara angka agregatnya hanya
  mengulang informasi itu dan sekaligus menjadi penyajian ketiga dari data area
  yang sama (sumber masalah yang justru dibereskan di sini). Sinyalnya tidak
  hilang dari produk: kalimat `${inUseNow} dari ${totalActive} area aktif sedang
  terpakai` masih hidup di dalam isi insight "Area paling sering dipakai"
  (`/dashboard/insights`). Yang dihapus adalah penyajiannya sebagai kartu angka
  di halaman triage.
- **Antrian ditulis sekali.** `DashboardStats` hanya membawa totalnya;
  register "Perlu tindakan" membawa rinciannya di sebelah aksinya.
- **Baris direktori tidak membawa angka.** Angka hidup di register antrian dan di
  strip status; baris direktori hanya menyebut "modul ini untuk apa", memakai
  kalimat yang sama dengan plat lokasi modul itu (`WAYFINDING`), sehingga satu
  modul tidak lagi punya dua deskripsi paralel.
- **Bobot mengikuti keadaan, bukan bentuk kartu.** Modul ber-antrian tampil
  sebagai baris penuh berangka + aksi; modul pasif sebagai baris ringkas. Ini
  yang menjaga hierarki yang diminta 2026-09-22 tanpa kembali ke enam kartu
  seragam.
- **Izin tidak berubah.** `getCommandCenterCards` tetap memakai predicate yang
  sama dengan rail (`canViewDrafts`, `canViewThemes`, `canViewExhibitions`,
  `canViewRegistrations`, `canViewSurvey`, `canViewTenantSurveys`,
  `canViewTenantSurveyResults`, `canViewUsers`, `canViewActivityLog`,
  `canViewSettings`, `canViewSponsorship`, dan pengecualian tenant-relation).
- **Antrian pameran akhirnya terlihat.** `getCommandCenterCards` menerima
  `exhibitionLeads` dan menghitung pengajuan berstatus `pending`; modul ini
  sebelumnya punya antrian tetapi tidak pernah menyebutnya di Pusat Komando.
- **Ritme (RHYTHM 2):** empat blok, empat bentuk berbeda: strip bertingkat,
  register baris penuh, band dua kolom, direktori dua kolom ringkas. Tidak ada
  bagian yang dirender sebagai grid kartu seragam.
- **Gerak (MOTION 1):** hanya transisi hover/fokus 160ms yang sudah ada
  (`.wf-row`, `.wf-agenda-row`), semuanya dimatikan pada
  `prefers-reduced-motion`. Tidak ada koreografi muat halaman dan tidak ada
  denyut berulang.

## Alternatif yang ditolak

- **Pertahankan ADR-007 apa adanya (18 kartu + analitik + tabel penuh)**:
  paling murah, tetapi membiarkan duplikasi halaman lain, data area tiga kali,
  dan kalimat antrian dua kali. Itu bukan hierarki, itu tiga halaman bertumpuk.
- **Buang seluruh analitik tanpa pengganti**: menghapus kemampuan yang sah.
  Yang dipakai adalah memindahkannya ke rute yang sudah memilikinya
  (`/dashboard/analytics`), bukan menghapusnya.
- **Pertahankan tabel penuh di Pusat Komando, hanya pangkas kolomnya**:
  menyisakan dua tempat berbeda yang mengklaim "jadwal lengkap", dan pemangkasan
  kolom berarti tabel Pusat Komando dan tabel `/dashboard/events` menyimpang
  seiring waktu.
- **Ganti grid 18 kartu dengan register datar lagi**: mengembalikan persis pola
  yang ditolak ADR-007 dan tidak menjawab keluhan "terbaca seperti daftar menu".
  Yang dipakai bukan register datar, melainkan **dua register berbeda bobot**.
- **Semua modul ber-antrian tetap jadi kartu besar seragam**: ukuran kartu
  sebagai penanda hierarki adalah akar masalah 2026-09-22. Yang dipakai adalah
  kehadiran antrian sebagai penentu bentuk baris.
- **Angka di setiap baris direktori**: akan menulis ulang angka yang sama dua
  kali di satu halaman (aturan yang ADR-007 sendiri pegang) dan menuntut
  agregasi baru.

## Konsekuensi

- `CommandCenterOverview.tsx` dihapus, dan `BarList.tsx` ikut dihapus karena
  komponen itu **satu-satunya konsumennya** (tidak ada pengimpor lain dan tidak
  ada tesnya; `AnalyticsDashboard` menggambar batangnya sendiri secara inline).
  `Card.tsx` tetap dipakai modul lain (`EventInsightsPanel`). Tidak ada
  endpoint, tipe data, atau izin baru.
- `getCommandCenterCards` berubah bentuk: parameter `totalEvents` /
  `upcomingEvents` / `ongoingEvents` / `isSuperadmin` tidak lagi dipakai (angka
  bukan lagi urusan register ini), dan `CommandCenterCard` mengganti
  `value`/`attention` dengan `queue` (jumlah + keadaan + aksi + galat) dan
  `state` (keadaan bernama, bukan angka).
- `DashboardStats.attention` menerima `pendingExhibitionLeads`; total antrian di
  strip status kini menjumlahkan tiga sumber, bukan dua.
- Baris direktori memakai kalimat `WAYFINDING`; mengubah deskripsi rute di
  `dashboardNavigation.tsx` kini otomatis mengubah baris direktori. Itu
  disengaja: satu modul, satu kalimat.
- Dua kelas CSS lama (`.wf-card-grid`, `.wf-card*`) dihapus dari
  `dashboard-wayfinding.css`; penggantinya `.wf-group-label`, `.wf-row--queue`,
  `.wf-row--directory`, `.wf-directory`, `.wf-agenda*`, `.wf-reference`.
- Yang tidak berubah: strip status tetap di atas, rail tetap satu-satunya
  navigasi modul, 18 rute admin lain tetap halaman seperti semula,
  `/dashboard/events` tetap menampilkan jadwal penuh dengan FilterBar, pemilih
  tampilan, dan paginasi.
