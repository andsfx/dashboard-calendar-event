# HANDOFF — Terapkan desain dashboard Metmal pada `schedule-event-v2`

Dokumen kerja untuk coding agent **OMP**.
Repo target: `D:\Andy\Antigravity\schedule-event-v2`
Sumber desain: prototipe Open Design (lihat §3) + `DESIGN.md` + `docs/agents/design-migration.md`

> Dokumen ini adalah **kontrak kerja**, bukan deskripsi keadaan kode. Keadaan repo
> berubah; verifikasi setiap klaim di §4 sebelum mengedit. Bila kenyataan berbeda
> dengan dokumen ini, kenyataan yang menang dan selisihnya dilaporkan.

---

## 0. Status pelaksanaan (2026-11-26)

Seluruh irisan S1–S8 sudah dikerjakan dan di-push. Yang berubah sejak kontrak ini
ditulis:

| Irisan | Commit | Catatan |
|---|---|---|
| S1 chrome | `e65b80f` | rail `metmal.` + wordmark, breadcrumb topbar, eyebrow = nama grup (`getWayfindingGroup`) |
| S2 Pusat Komando | `e65b80f`, `72aaf94`, `f922f36` | papan triage tunggal, seksi bernomor, `queueErrors` + **Coba lagi per sumber** |
| S3 jadwal | `d446ff2` | toolbar berlabel, Status = `NativeSelect`, topline + pemilih tampilan, tabel mulai dari Nama event (judul = tombol detail) |
| S4 draft | `79d480d` | tab Aktif/Riwayat berjumlah item, strip pemberitahuan, kartu mobile |
| S5 modul pengajuan | `5bb43e3`, `162fee9` | pencarian per antrean (tenant/judul, organisasi/kontak), keadaan kosong dua tingkat |
| S6 analitik | `e65b80f`, `8bb5395` | pemilih tahun jadi toolbar berlabel, tiga angka ringkas periode, judul seksi + penjelas; grafik bar/donut/heatmap dan tabel YoY tetap milik repo |
| S7 modul pendukung | `e65b80f`, `c728505` | keadaan kosong pengguna; tema tahunan kini daftar baris (`record-row`) dengan aksi tambah di kepala halaman |
| S8 aksesibilitas konten | `4e6d130`, `3ae50f4`, `02fea1e`, `90df030` | h2 sr-only di analitik (heading-order); baris album/area + unggah foto bisa dijangkau keyboard; primitif Empty + copy Indonesia di berita/surat/landing; tab sponsorship pakai Tabs/Empty |

**Gap yang diterima (jangan ditambal dengan mengubah perilaku):**

1. **Dari/Sampai tanggal** di toolbar prototipe tidak dipindahkan. Filter tanggal
   berarti menambah state + filter di `useEvents`, yang dilarang §UI Rules 3 dan
   §8. Percobaan `e0ee41c` sudah dicabut di `3adc32e`. Bila suatu saat diminta,
   semantik yang benar adalah overlap (`end >= from && start <= to`), bukan
   membandingkan `dateStr` saja — event multi-hari akan salah tersaring.
2. **Analitik**: prototipe memakai rentang tanggal + bar chart; repo memakai
   pemilih tahun, bar/donut/heatmap, dan tabel YoY. Setara fungsional.
3. **Pameran**: prototipe memperlakukannya sebagai antrean pengajuan polos; repo
   mempertahankan manajer program + pengajuan per program.
4. **Antrean pengajuan**: chip status 4 nilai menggantikan 2 tab prototipe.
5. **Target sentuh mobile** — kontrol baru S8 memenuhi 44 px. Terukur pada
   375: tombol **Pilih Foto** (`AlbumManagerModal`, `EventAreaManagerModal`) 32 → 44 px,
   tab **Sponsorship** (`TabsTrigger` Proposal Event / Minat Support) 38 → 44 px. Di
   desktop ukuran aslinya dipertahankan (32 px dan 38 px) lewat `sm:min-h-0`.
   Sensus kontrol di dalam `main` pada 375 (sesi admin nyata; `button`/`select`/
   `input`/`textarea`/`[role=tab]`/`[role=switch]` yang terlihat) per tampilan
   `/dashboard/events`, sesudah `1bcd35f` + commit kanban/timeline:
   **Tabel 128 kontrol / 0 di bawah 44 px**, **Kanban 104 / 0** (sebelum:
   69 — 23 kartu × aksi Lihat/Ubah/Hapus 36×36), **Timeline 104 / 0**
   (sebelum: 69), **dialog detail `EventDetailModal` 4 / 0** (sebelum: 3 —
   tombol X 32×32, Ubah & Hapus 22 px). Aksi kartu Kanban/Timeline di 1280 tetap
   **36×36** (`min-h-11 min-w-11 … sm:min-h-[36px] sm:min-w-[36px]`); multisets
   tinggi kontrol 1280 identik sebelum/sesudah. `/dashboard/tenant-surveys`
   **1202 kontrol (tab daftar), 0 di bawah 44 px**.
   **Kalender** (`DashboardCalendarView` — `CalendarView` tidak dipakai
   dashboard, itu komponen rute publik) 27 kontrol **/ 0 di bawah 44 px** di 375
   (sebelum: 15 — 5 tab mode 25 px, «Hari Ini» & panah periode 32 px, 7 chip
   event 26 px); sub-tampilan Bulan 27 / Minggu 22 / Hari 20 / Agenda 43 /
   Linimasa 43 kontrol, **semuanya 0** dan tanpa overflow horizontal; sheet hari
   **0**. Di 1280 tidak berubah: tab mode 25 px, chip 26 px, «Hari Ini» 32 px,
   panah 32×32.
   Kontras Timeline terang: lencana «Prioritas Tinggi» semula `--wf-danger` di
   atas tint 10% (`#e9d2c6`) = **4.46:1** — gagal ambang 4.5. Kini isian
   `--wf-danger` + teks `--wf-accent-ink` (`PriorityBadge`), jadi rasio tidak
   bergantung latar kartu: axe terang **0** `color-contrast` di Kanban/Timeline,
   375 maupun 1280 (gelap juga 0).
   **Utang struktur yang tidak diselesaikan:** `nested-interactive` **23 node** di
   Kanban dan Timeline — kartu `Button` membungkus `Button` aksi, sudah tercatat
   di `AGENTS.md`. Kalender masih punya `color-contrast` **3** (375) / **6**
   (1280) pada angka hari bulan lain (`text-[var(--wf-ink-muted)]/60`, pra-ada,
   tak terkait ukuran target) dan `incomplete` **17** (375) / **6** (1280);
   Kanban/Timeline `incomplete` 0 pada 8 kombinasi (375/1280 × terang/gelap).
   Opsi dropdown `FilterBar` ikut naik lewat prop opt-in
   `touchTargets`: `[role=option]` **Kategori 21 opsi, Bulan 16, Prioritas 4 —
   semuanya 44 px** di 375; di 1280 tetap **28 px** karena `min-h-11 sm:min-h-0`.
   Chrome shell (`Tutup menu`, tombol tema) berada di luar `main` sehingga tidak
   termasuk sensus ini.
   Desktop tidak berubah: TabsTrigger `/tenant-surveys` tetap **21 px** (strip 32),
   chip status 32, aksi baris tabel 32, Tautan/CSV/QR 32, select/input 32,
   «Buat penilaian mandiri» 32; `/events` aksi ikon tabel 28, toolbar 28, dan aksi
   kartu mobile `display:none` di 1280.
   Sisa celah yang **belum** ditutup: `/dashboard/content/landing` 7 kontrol
   setinggi 32 px — «Hapus foto hero», «Ganti foto», 3× input «Unggahan n»,
   «Sinkron dan simpan unggahan Instagram», «Simpan». Tautan prosa yang tingginya
   < 44 px di desktop (mis. tautan di tengah kalimat) dibiarkan karena pengecualian
   inline WCAG 2.5.8. Jadi klaim "semua celah legacy tertutup" tidak berlaku.

**Irisan S8 (delta yang benar-benar diperbaiki):**

- Analitik: satu `<h2 class="sr-only">Ringkasan analitik</h2>` di awal cabang data
  menutup lompatan h1 → h3; tes baru menjaga urutan heading saat periode berisi event.
- Album/Area: thumbnail jadi dekoratif; nama album/area adalah Button ber-`ui-focus-ring`
  yang membuka detail lewat Tab + Enter; dropzone punya tombol **Pilih Foto**;
  aksi baris area yang tadinya hover-only ikut muncul lewat `group-focus-within`;
  keadaan kosong memakai primitif `Empty`; copy/label diseragamkan
  (Tambah Album / Tambah Area, Unggah, Tarik & lepas, maks, 10 MB/berkas).
- Berita/surat/landing: `Empty` untuk daftar artikel dan riwayat surat; pratinjau
  artikel turun h1 → h2; tombol "Buka" → "Buka surat"; label seksi Instagram/landing
  jadi h2 + copy Indonesia; editor surat dapat h2 sr-only.
- Sponsorship: dua tombol tab diganti `Tabs` (Radix) yang dikendalikan state `tab`
  yang sudah ada; kedua `TabsContent` `forceMount` + `data-[state=inactive]:hidden`
  agar `aria-controls` selalu menunjuk elemen nyata; `Empty` untuk keadaan kosong;
  label PIC → Narahubung.

**Angka verifikasi terakhir** (run S8): suite penuh 189 file / 1562 tes lulus
(`NODE_ENV=test … --maxWorkers=2`), `npm run build` hijau (
`tsc && vite build`, vite 11,66 s) + `assert-lazy-entry-chunks`.

Daftar "36 run, 0 pelanggaran" di bawah berasal dari batch S1–S7 dan **klaim di
dalamnya untuk analitik tidak berlaku**: run itu tidak menangkap `heading-order`
karena state yang dipindai belum memuat data, sehingga lompatan h1 → h3 lolos.
`heading-order` baru tertangkap pada S8 (semua lebar × tema, state berisi data) dan
diperbaiki di `4e6d130`; hasilnya diverifikasi ulang **0 pelanggaran pada 28 run S8**.
Yang tetap berlaku dari batch S1–S7 hanya rute non-analitik: `events` 4, `drafts` 4,
lalu `themes`, `exhibitions`, `registrations`, `tenant-proposals` masing-masing 4
(375/1280 × terang/gelap), ditambah 4 run ulang untuk tema setelah jadi daftar baris.
Axe S8 (satu-satunya angka axe yang berlaku saat ini): **28 run, 0 pelanggaran** — 7 rute (`analytics`, `content/galeri`,
`content/foto-area`, `content/berita`, `content/surat`, `content/sponsorship`,
`content/landing`) × 375/1280 × terang/gelap, `colorScheme: dark` +
`localStorage.theme=dark`, jeda 3,5 s agar tween GSAP selesai sebelum sampling.
Sesudah irisan target sentuh, axe dijalankan lagi: **28 run ulang pada 7 rute yang
sama (0 pelanggaran)** ditambah **8 run pada `events` dan `tenant-surveys`
(375/1280 × terang/gelap, 0 pelanggaran)**;
`heading-order` hilang di analitik state berisi data (6 album, 8 area, event lokal
ada) dan di `content/landing` urutannya h1 → h2 «Latar utama» → h2 «Galeri
Instagram»; tidak ada label berbahasa Inggris yang tersisa.
Keyboard terverifikasi di peramban nyata: galeri — 27 Tab sampai tombol nama album,
Enter membuka detail; foto-area — Enter pada nama area membuka detail, 37 Tab sampai
**Pilih Foto** (32 px), opacity aksi baris 0 → 1 saat fokus; sponsorship — ArrowRight
memindah seleksi ke "Minat Support" (`aria-selected=true`, panel lain `display:none`,
tepat 1 panel terlihat, semua `aria-controls` menunjuk elemen nyata).
Mobile 375: `scrollWidth == clientWidth` di galeri/foto-area/sponsorship, tanpa
kontrol < 24 px di tiga seksi itu.

---

## 1. Aturan main

1. **Jangan port CSS/JS prototipe.** Prototipe adalah referensi visual berjalan
   (HTML + vanilla JS + `localStorage`), bukan dependensi. Yang dipindahkan adalah
   keputusan visual, bukan berkasnya.
2. **Tidak ada hex baru.** Semua warna lewat token `--wf-*` (dan token merek
   `--color-brand-*` bila memang perlu). `dark:` hanya untuk hal yang benar-benar
   semantik-warna, bukan untuk peran netral.
3. **Tidak ada data karangan.** Jangan bawa fixture prototipe (19 event, antrean
   12, tanggal 25 November 2026, penanda "Data contoh"). Repo memakai API nyata.
4. **Perilaku menang atas tampilan.** Izin, polling, kontrak API, payload,
   validasi, dan state memuat/kosong/gagal tidak boleh berubah karena alasan visual.
5. **Satu irisan = satu commit-able perubahan.** Jangan mencampur chrome, Pusat
   Komando, dan modul pengajuan dalam satu editan besar.
6. Bila sebuah permukaan **sudah sesuai** desain, jangan disentuh. Catat
   "sudah paritas" dan lanjut. Churn tanpa delta adalah kegagalan tugas ini.
7. Tidak ada commit/push ke remote dan tidak ada perubahan `.env`, `server/`, atau
   migrasi database dalam tugas ini — kecuali diminta terpisah.

---

## 2. Bacaan wajib sebelum menyentuh file

Baca berurutan, jangan dilewati:

1. `AGENTS.md` — aturan repo, gate build/test, konvensi komponen.
2. `DESIGN.md` — arah visual aktif, catatan palet ekspor Stitch **belum diadopsi**.
3. `docs/agents/design-migration.md` — lingkup, aturan desain, alur verifikasi.
4. `src/styles/dashboard-wayfinding.css` — token `--wf-*` dan kelas `wf-*`.
5. `src/styles/theme.css` — palet merek, tipografi, skala radius.
6. Handoff desain di §3.
7. `docs/adr/007`, `docs/adr/009` — riwayat Pusat Komando (penting, lihat §4).
8. `docs/agents/local-development.md` bila perlu menjalankan server lokal.

---

## 3. Handoff desain

### 3.1 Sumber

Prototipe yang disetujui (aplikasi berjalan, lokal, tanpa backend):

```
C:\Users\malme\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\f5b5a7b2-7002-45f2-9923-57d382ebc074\
├─ index.html        # aplikasi dashboard (rujukan utama)
├─ styles.css        # token + komponen + responsif (rujukan visual)
├─ app.js            # alur kerja: jadwal, draft, pengajuan, analitik
├─ support.js        # modul pendukung: tema, survei, pengguna, log, konten
├─ data.js           # bentuk data contoh + aturan hitung antrean
├─ presentasi.html   # catatan desain + simulasi keadaan (peran, gagal, reset)
└─ design-review\    # tangkapan layar sebelum/sesudah, desktop + mobile + gelap
```

Tangkapan layar paling berguna: `design-review\after-desktop-light.png`,
`after-desktop-dark.png`, `after-mobile-home-final.png`,
`after-mobile-schedule.png`, `after-mobile-dialog.png`,
`polish-route-*.png` (modul pendukung).

### 3.2 Peta token (prototipe → repo)

| Peran di prototipe | Nilai prototipe | Token repo yang dipakai |
|---|---|---|
| Permukaan halaman | `#f8f7f0` | `--wf-page` |
| Papan/kartu/panel | `#fdfcf6` | `--wf-board` |
| Band reses / baris bergaris | turunan | `--wf-board-2` |
| Tinta utama | `#16211b` | `--wf-ink` |
| Tinta sekunder | olive-slate | `--wf-ink-muted` |
| Garis rambut / kontrol | rgba | `--wf-rule`, `--wf-rule-strong`, `--wf-rule-control` |
| Aksen aksi | `#00918e` / `#007a78` | `--wf-accent` (`#00706e`) + `--wf-accent-ink` |
| Latar aksen lembut | `#e6f7f6` | `--wf-accent-soft` |
| Perlu tindakan | amber | `--wf-action` |
| Berlangsung/aktif | emerald | `--wf-live` |
| Destruktif | `#c2185b` | `--wf-danger` |
| Radius kontrol / papan | 8 / 12 px | `--wf-radius-control`, `--wf-radius-board` |
| Gerak | 150–180 ms | transisi `wf-*` yang ada (160 ms) |

Jangan memakai `#007a78` atau `#c2185b` mentah: keduanya gagal ambang kontras
repo (`--wf-accent` sengaja `#00706e`, `--wf-danger` sengaja merah gelap).

### 3.3 Tipografi — tetap milik repo

Prototipe memakai Manrope; **repo memakai Bricolage Grotesque (display) + Geist
(body)**. Jangan menambah `@fontsource/manrope`. Skala prototipe hanya menjadi
acuan ukuran (judul seksi ~18–20 px, isi 14–16 px, label ≥ 11 px, angka tabular
untuk kuantitas/tanggal/jam).

### 3.4 Yang TIDAK boleh ikut pindah

- Penanda "Data contoh", panel simulasi, pengalih peran demo, tombol reset.
- Tombol kegagalan simulasi dan `localStorage` (`metmal-prototipe-v1`).
- CSS prototipe (`styles.css`), `app.js`, `support.js`, `data.js`.
- Latar krem gelap custom dan palet pink sebagai aksen dekoratif.

---

## 4. Keadaan repo yang harus diverifikasi lebih dulu

Berdasarkan pembacaan dokumen dan kode saat handoff ini dibuat:

- `docs/adr/009-pusat-komando-papan-triage.md` berstatus **accepted** dan sudah
  dilaksanakan: Pusat Komando kini empat blok (strip status bertingkat, register
  "Perlu tindakan", band agenda, direktori tanpa angka).
- `DashboardStats.tsx` sudah menjumlahkan **lima** sumber antrean (draf,
  pendaftaran, pameran, kolaborasi tenant, partisipasi tenant) dan sudah punya
  jalur galat (`draftsError` → angka `—`).
- `CommandCenterAgenda.tsx` sudah membatasi 3 baris per kolom, punya state galat
  dan state kosong.
- `CommandCenterSummary.tsx` sudah menampilkan galat per modul sebagai
  "Antrian gagal dimuat: …" dengan angka `—`, dan hanya merender
  "Tidak ada modul yang menunggu tindakan." ketika tidak ada antrean.
- `dashboard-wayfinding.css` sudah memuat seluruh token `--wf-*` untuk tema
  terang dan `.dark`.

**Konsekuensi:** Pusat Komando kemungkinan besar **sudah paritas**. Tugasnya
bukan membangunnya ulang, melainkan membuktikan paritas dan mencatat delta nyata
(mis. label "Menunggu keputusan" vs "Perlu tindakan", susunan rujukan, atau
rincian keadaan per baris). Setiap delta wajib punya alasan satu baris.

Bila verifikasi menunjukkan sebaliknya, laporkan selisihnya sebelum mengedit.

---

## 5. Lingkup

### Termasuk

| Kelompok | Path |
|---|---|
| Chrome dashboard | `src/components/dashboard/DashboardShell.tsx`, `DashboardHeader.tsx`, `AdminSidebar.tsx`, `SectionNav` (`ui/SectionNav.tsx`), `ViewToggle.tsx`, `viewTabs.tsx` |
| Pusat Komando | `/dashboard`, `DashboardPage.tsx`, `DashboardStats.tsx`, `CommandCenterSummary.tsx`, `CommandCenterAgenda.tsx`, `CommandCenterDirectory.tsx` |
| Jadwal event | `/dashboard/events`, `src/components/events/EventTable.tsx`, `views/CalendarView.tsx`, `views/DashboardViewsSection.tsx`, `ui/FilterBar.tsx` |
| Antrian draft | `/dashboard/drafts`, `src/components/drafts/*` |
| Pengajuan | pendaftaran, pameran & aktivasi, kolaborasi tenant, partisipasi tenant |
| Analitik & Insight | `/dashboard/analytics`, `/dashboard/insights` |
| Modul pendukung | tema tahunan, survei kepuasan, evaluasi tenant, hasil evaluasi tenant, manajemen pengguna, log aktivitas, seksi `/content/*` |
| Chrome bersama | `/tenant-survey-results` (memakai `DashboardShell` dengan `publicMode`) — hanya dipertahankan, tidak didesain ulang |

### Tidak termasuk

- Rute publik: `/`, `/events`, `/gallery`, `/news`, `/sponsor`, `/tenants`,
  `/community`, `/survey/*`, `/tenant-survey*`, `/letter/:id`.
- `src/components/nav/PublicSiteHeader.tsx`, `NavDropdown.tsx`.
- `improve/` (sandbox terpisah).
- Skema database, endpoint baru, atau perubahan `server/`.
- Fitur baru di luar desain: pendapatan, tiket, pembayaran, asisten percakapan.

---

## 6. Peta file

### Dashboard (chrome + seksi)

| File | Peran |
|---|---|
| `src/components/dashboard/DashboardPage.tsx` | Orkestrasi rute seksi, kondisi render per peran, modal |
| `src/components/dashboard/DashboardShell.tsx` | Shell, rail, `useGsapEntrance`, `refreshKey` |
| `src/components/dashboard/DashboardHeader.tsx` | Plat lokasi + tindakan halaman |
| `src/components/dashboard/AdminSidebar.tsx` | Rail navigasi (bukan sidebar shadcn) |
| `src/components/dashboard/dashboardNavigation.tsx` | `WAYFINDING`, `getDashboardNavGroups`, `getAllowedDashboardPaths`, `getCommandCenterCards`, `CONTENT_ROUTES` |
| `src/components/dashboard/DashboardStats.tsx` | Strip status bertingkat |
| `src/components/dashboard/CommandCenter*.tsx` | Register antrean, agenda, direktori |
| `src/components/dashboard/DashboardCalendarView.tsx` | Kalender dashboard |
| `src/components/dashboard/DashboardModals.tsx` | Kumpulan modal dashboard |
| `src/components/dashboard/viewTabs.tsx`, `ViewToggle.tsx`, `EventInsightsPanel.tsx`, `InsightAiSummary.tsx` | Kontrol tampilan, insight |

### Komponen seksi & bersama

| File | Peran |
|---|---|
| `src/components/views/CalendarView.tsx` | Tabel/kalender bersama — **juga dipakai rute publik** |
| `src/components/views/DashboardViewsSection.tsx` | Kanban/Timeline/Calendar di dashboard |
| `src/components/events/EventTable.tsx` | Tabel jadwal + aksi baris |
| `src/components/drafts/*` | Antrean draft, riwayat, badge progres |
| `src/components/modals/*` | Detail/crud event, draft, pengajuan, konfirmasi |
| `src/components/ui/StatusBadge.tsx` | **Dipakai rute publik** |
| `src/components/ui/FilterBar.tsx`, `SearchBar.tsx`, `SectionNav.tsx`, `StatCard.tsx`, `DashboardSkeleton.tsx`, `useGsapEntrance.ts` | Primitif bersama |

### Primitif yang wajib dipakai

`src/components/shadcn/` sudah lengkap (button, badge, card, dialog, table, tabs,
field, select, sheet, alert, empty, skeleton, dll.). Jangan membuat primitif baru
bila yang setara sudah ada.

### Tes yang menyentuh area berubah

```
src/components/dashboard/*.test.tsx
src/components/views/__tests__
src/components/ui/__tests__
src/components/__tests__           (bila ada tes lintas seksi)
src/pages/__tests__                (untuk bukti rute publik tidak berubah)
```

---

## 7. Irisan kerja (berurutan)

Kerjakan satu per satu. Setiap irisan harus bisa dibangun dan ditinjau sendiri.

### S0 — Peta + audit paritas (tanpa edit)

Hasil yang diminta:
- tabel: surface → path → file utama → status (`sesuai` / `sebagian` / `belum`) →
  delta konkret;
- daftar komponen bersama yang tersentuh dan pemakai publiknya;
- daftar perilaku yang akan dipertahankan (§8);
- urutan irisan final bila berbeda dari dokumen ini.

Berhenti dan laporkan peta ini **sebelum** editan pertama.

### S1 — Chrome

Target: rail 248 px (desktop), plat lokasi, penanda seksi aktif, ritme permukaan,
skala radius/jarak tunggal. Verifikasi `DashboardShell` tidak kehilangan
`useGsapEntrance`/`refreshKey`.

Selesai bila: rail + header konsisten di semua seksi, tidak ada pola navigasi
kedua, `publicMode` pada `/tenant-survey-results` tampil sama seperti sebelumnya.

### S2 — Pusat Komando

Target: paritas dengan prototipe pada empat blok. Delta yang paling mungkin:
label, urutan rujukan, rincian keadaan, dan bobot visual baris.

Selesai bila: satu angka antrean memimpin; rincian hanya di register; agenda
maksimum 3 + 3; direktori tanpa angka; galat per sumber terlihat dengan `—`,
bukan `0`.

### S3 — Jadwal event

Target: tabel dan kalender memakai data terfilter yang sama; filter tetap saat
berganti tampilan; detail event; keadaan kosong vs tanpa hasil filter berbeda.

Selesai bila: tabel menggulir di wadahnya (header menempel), tidak ada gulir
horizontal tingkat halaman, status tidak dibedakan warna saja, detail membuka
modal dengan fokus masuk/Escape/fokus kembali.

### S4 — Antrian draft

Target: Aktif/Riwayat, urut konfirmasi lebih dulu, sunting, terbitkan (hanya
`confirm`, belum terbit, belum dihapus, role berizin), hapus → riwayat, pulihkan
hanya untuk draf terhapus yang belum pernah terbit.

Selesai bila: penerbitan ganda tertahan, kegagalan tidak mengubah keadaan, dan
angka antrean ikut turun setelah terbit.

### S5 — Empat modul pengajuan

Target: pola register + detail yang konsisten untuk pendaftaran, pameran &
aktivasi, kolaborasi tenant, partisipasi tenant — tanpa menyatukan empat
komponen menjadi satu bila itu mengubah perilaku.

Selesai bila: perbedaan domain tetap terlihat (komunitas vs brand/EO vs kerja
sama tenant vs open booth/voucher), status `submitted` vs `pending` tetap benar,
membuka detail tidak mengurangi antrean, keputusan yang mengurangi.

### S6 — Analitik + Insight Cerdas

Target: filter periode, tren bulanan, kategori, lokasi; angka tersedia juga
sebagai tabel. Insight tetap deterministik dari data yang sama.

Selesai bila: tidak ada grafik pengisi ruang, tidak ada angka karangan, dan tidak
ada asisten percakapan baru.

### S7 — Modul pendukung

Tema tahunan, survei kepuasan, evaluasi tenant, hasil evaluasi tenant, manajemen
pengguna, log aktivitas, dan seksi `/content/*` (landing, album galeri, foto area,
buat surat, berita, sponsorship).

Selesai bila: setiap kontrol berfungsi, keadaan kosong/gagal ada, dan modul yang
tidak boleh diakses peran tidak muncul.

---

## 8. Perilaku yang harus tetap sama

Periksa dan pertahankan secara eksplisit:

1. **Izin** — `getAllowedDashboardPaths(permissions)`, `getDashboardNavGroups`
   menyaring rail; Insight Cerdas disembunyikan untuk peran `demo`; akun tenant
   relation tanpa izin event (`isTrOnly`) hanya melihat Analitik, tanpa Pusat
   Komando dan modul event; role demo read-only tidak menampilkan tombol mutasi.
2. **Polling** — `useEvents` 30 detik, `useDraftEvents` 60 detik,
   `useTenantSurveys` 60 detik. Jangan mengubah interval atau menambah fetch
   ganda saat merapikan tampilan.
3. **Data & hitung** — semua angka berasal dari respons API, bukan konstanta.
   Sumber gagal/memuat tidak boleh dibaca sebagai nol; tampilkan `—` +
   "belum lengkap".
4. **Kontrak API** — endpoint, payload, nama field, dan validasi tidak berubah.
5. **Animasi shell** — `useGsapEntrance` dan dependensi `refreshKey` (termasuk
   `isLoading` setelah `/auth/me`) tidak diubah tanpa bukti masalah terukur.
6. **RevealSection** — jangan membungkus subtree interaktif; pemindahan node
   mencabut fokus dan menelan ketikan pertama.
7. **Komponen bersama** — `views/CalendarView`, `ui/StatusBadge`,
   `modals/ConfirmDialog`, dan komponen `pdf/*` juga dipakai rute publik. Ubah
   hanya bila hasil publik identik, atau beri varian yang default-nya
   mempertahankan tampilan sekarang.
8. **`/tenant-survey-results`** — memakai `DashboardShell` dengan `publicMode`.
   Perubahan chrome tidak boleh mengubah tampilannya.
9. **Aksesibilitas** — target sentuh ≥ 44 px pada breakpoint mobile dashboard,
   `ui-focus-ring` terlihat, modal: fokus masuk, Escape menutup, fokus kembali,
   status tidak hanya warna, `prefers-reduced-motion` dihormati.
10. **Bahasa** — semua label, pesan galat, dan status Bahasa Indonesia; istilah
    domain mengikuti `CONTEXT.md`.

---

## 9. Larangan

- ❌ Hex baru di luar lapisan token; `--wf-accent` diganti `#00918e`/`#007a78`.
- ❌ `dark:` untuk peran netral (permukaan, teks, garis).
- ❌ Ramp `slate-*` sebagai pengganti token.
- ❌ Dependensi baru (termasuk font). Gunakan yang sudah terpasang.
- ❌ `<style>` global baru; aturan dashboard masuk `dashboard-wayfinding.css`.
- ❌ Menyalin markup prototipe apa adanya, termasuk kelas `metmal-*`/inline style.
- ❌ Mengubah rute publik, header publik, atau `improve/`.
- ❌ Angka, tren, nama orang, atau aktivitas karangan.
- ❌ Kontrol mati (tombol/tautan tanpa aksi nyata).

---

## 10. Verifikasi

Jalankan setelah **edit terakhir** pada irisan yang sedang dikerjakan (bukan di
akhir semua irisan), lalu ulangi di akhir.

```powershell
# Build (tsc + vite)
npm run build

# Tes yang menyentuh area berubah
$env:NODE_ENV="test"; npx vitest run --maxWorkers=2 src/components/dashboard src/components/views src/components/events src/components/drafts src/components/modals src/components/ui
```

Di PowerShell, `NODE_ENV=test npx ...` (gaya POSIX) tidak bekerja — pakai
`$env:NODE_ENV="test";` seperti di atas.

Pemeriksaan browser (wajib, dicatat hasil yang benar-benar diamati):

- Setiap seksi yang berubah: **375 px dan 1280 px**, tema terang dan gelap.
- Tabel: tidak ada gulir horizontal tingkat halaman; header menempel saat isi
  digulir; aksi baris tetap bisa dijangkau keyboard.
- Modal: fokus masuk, `Escape` menutup, fokus kembali ke pemicu.
- Konsol tanpa error baru (catat bila ada yang sudah ada sebelumnya).
- Minimal satu rute publik yang memakai komponen bersama yang disentuh
  (`/events` atau `/gallery`) — tampil sama seperti sebelumnya.
- `npm run test:a11y` hanya mencakup rute publik; hasilnya **bukan** bukti untuk
  dashboard. Untuk dashboard, jalankan axe di browser atau nyatakan cakupannya
  belum otomatis.

---

## 11. Format laporan akhir

Laporkan hanya yang benar-benar dijalankan:

1. **File berubah** — path + satu baris alasan.
2. **Paritas per surface** — `sesuai` / `diubah` / `belum`, dengan delta yang
   dikerjakan atau sengaja ditunda.
3. **Perilaku yang dipertahankan** — bukti singkat (tes/rujukan baris kode).
4. **Hasil verifikasi** — perintah yang dijalankan + hasilnya; sebutkan bila
   sebuah pemeriksaan tidak dijalankan.
5. **Risiko & batas** — komponen bersama yang tersentuh, dampak publik yang
   diperiksa, dan hal yang belum tercakup.
6. **Pertanyaan terbuka** — mis. perubahan copy produk, pemakaian aksen pink,
   atau delta desain yang menunggu keputusan pemilik produk.

Jangan mengklaim build, tes, tangkapan layar, atau pemeriksaan browser yang tidak
dijalankan.

---

## 12. Pertanyaan terbuka (putuskan atau catat, jangan tebak)

1. **Copy**: prototipe memakai "Perlu tindakan"; repo memakai "Menunggu
   keputusan". Mana yang mengikat? (Rekomendasi: pertahankan copy repo kecuali
   ada keputusan produk.)
2. **Aksen pink** `#e24378`: hanya dipakai prototipe sebagai aksen sekunder.
   Apakah repo sudah punya peran untuk itu, atau dihapus saja? (Rekomendasi:
   jangan tambah pemakaian baru; pakai token merek yang ada.)
3. **Empat modul pengajuan** dipertahankan sebagai komponen terpisah atau
   disatukan menjadi satu komponen terkonfigurasi? (Rekomendasi: pertahankan
   terpisah selama belum ada tes yang menjamin penggabungan aman.)
4. **Pusat Komando**: bila audit S0 menunjukkan sudah paritas, apakah delta copy
   dan bobot baris tetap dikerjakan? (Rekomendasi: hanya delta yang punya alasan
   satu baris.)
