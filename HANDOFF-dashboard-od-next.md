# HANDOFF — Terapkan desain dashboard Metmal pada `schedule-event-v2`

Dokumen kerja untuk coding agent **OMP**.
Repo target: `D:\Andy\Antigravity\schedule-event-v2`
Sumber desain: prototipe Open Design (lihat §3) + `DESIGN.md` + `docs/agents/design-migration.md`

> Dokumen ini adalah **kontrak kerja**, bukan deskripsi keadaan kode. Keadaan repo
> berubah; verifikasi setiap klaim di §4 sebelum mengedit. Bila kenyataan berbeda
> dengan dokumen ini, kenyataan yang menang dan selisihnya dilaporkan.

---

## 0. Status pelaksanaan (2026-11-26)

Seluruh irisan S1–S7 sudah dikerjakan dan di-push. Yang berubah sejak kontrak ini
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

**Angka verifikasi terakhir**: suite penuh 188 file / 1558 tes lulus
(`NODE_ENV=test … --maxWorkers=2`), `npm run build` hijau + `assert-lazy-entry-chunks`.
Axe 0 pelanggaran pada 36 run: `events` 4, `drafts` 4, lalu `themes`, `analytics`,
`exhibitions`, `registrations`, `tenant-proposals` masing-masing 4 (375/1280 ×
terang/gelap), ditambah 4 run ulang untuk tema setelah jadi daftar baris dan 4 run
ulang untuk analitik setelah toolbar/angka ringkas.

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
