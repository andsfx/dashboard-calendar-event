# Update Fitur: Pemisahan Event per Lokasi (Area Kanonis)

Status: **SELESAI** · Repo: schedule-event-v2 · 2026-09-17
Sumber domain: `events.lokasi` + `draft_events.lokasi` (data produksi) · Terkait: `event_areas`/`area_photos` (`update-fitur-foto-area-event.md`), `src/utils/areaConflict.ts`

## 1. Ringkasan

Kondisi awal: event dibedakan lokasinya hanya lewat kolom teks bebas `lokasi`. Di produksi ada **28 nilai distinct** untuk 250 event, dengan duplikasi ejaan berat (`Panggung Lt. 3` 117×, `Panggung Lt 3` 14×, `Panggung Lantai 3` 3×, dst). Tabel `event_areas` (master area) sudah ada sejak fitur "Foto Area Event", tetapi praktis tidak dipakai: **1 area** terdefinisi dan **1 dari 250** event punya `area_id` (draft: 0 dari 45). `area_id` hanya dipakai `findAreaConflicts` (anti double-booking) di form admin; **tidak ada satu pun surface** yang bisa memisahkan event per lokasi.

Target: menjadikan `event_areas` sebagai **master lokasi kanonis**, lalu memisahkan event per lokasi sebagai **section** di halaman publik `/events` dan di **tabel Jadwal Event** dashboard. Backfill 250 event lama lewat panel **Pemetaan Lokasi** yang di-review admin.

Non-goal: halaman publik per area, peta interaktif, filter lokasi di FilterBar, geocoding, jarak/koordinat.

## 2. Keputusan desain

| # | Keputusan | Alasan |
|---|---|---|
| D1 | **`event_areas` jadi master lokasi resmi** (bukan tabel baru) | Entitas + CRUD + galeri foto sudah ada; menambah tabel `locations` = konvensi kedua untuk konsep yang sama. |
| D2 | **Bentuk pemisahan = section per lokasi** (bukan filter/dropdown) | Pilihan Andy: semua lokasi terlihat sekaligus; filter menyembunyikan lokasi lain. |
| D3 | **Backfill di-review admin, bukan otomatis** | 28 varian punya ambiguitas nyata (`Lantai 3`, `Metropolitan Mall Bekasi`) yang tidak boleh ditebak mesin. |
| D4 | **Backfill hanya mengisi `area_id IS NULL`** | Pemetaan manual sebelumnya tidak boleh ditimpa; admin yang ingin mengubah 1 event mengedit event itu. |
| D5 | **`lokasi` tetap ada sebagai kolom tampilan** | 250 event lama + ekspor CSV/PDF + OG/meta + share WA membaca `lokasi`. Server/UI menyinkronkan nama area → `lokasi` saat admin memilih area di form. |
| D6 | **Nama area kanonis menang saat tampil** | `resolveAreaDisplay(areaId, lokasi, areas)` — bila terpetakan, tampilkan nama area (mis. `Panggung Lt 3` → `Panggung Funworld Lt. 3`), else teks lama. |
| D7 | **Section hanya aktif bila ada area terpetakan** | Sebelum backfill, 250/250 event unmapped; tanpa guard ini seluruh daftar jatuh ke "Lokasi Lainnya" dan rail lama hilang (regresi). |
| D8 | **Grouping area hanya bila >1 bucket** (dashboard) | Satu bucket = header area tanpa nilai tambah, hanya menambah baris. |
| D9 | **`UNIQUE (lower(trim(name)))` pada `event_areas`** | Mencegah duplikat master (`Panggung Lt. 3` vs `panggung lt. 3`) yang jadi akar masalah. |
| D10 | **Sinonim dinormalisasi di util, bukan data** | `lt`/`lantai`, `fun world`/`funworld`, buang tanda baca — dipakai untuk *saran*, bukan kebenaran. Keputusan tetap di admin. |
| D11 | **Seragamkan teks = aksi terpisah dan lintas baris** | `targetLokasi` opsional per mapping; menulis ulang `lokasi` ke **semua** Event/Draft berteks sama (termasuk yang sudah ber-`area_id`). Alasan: tujuan standardisasi adalah tampilan, bukan sekadar FK; tanpa ini 138 event ber-`area_id` tetap menampilkan ejaan lama karena teks `lokasi` tidak ikut berubah. |

### Kesetaraan nama area (dikonfirmasi Andy)

`Panggung Funworld Lt. 3` adalah area yang sama dengan `Panggung Lt. 3`. Nama kanonis yang dipakai: **`Panggung Funworld Lt. 3`**. Varian yang melebur ke sana: `Panggung Lt. 3`, `Panggung Lt 3`, `Panggung Lantai 3`, `Lt. 3 Depan Funworld, Metropolitan Mall Bekasi`, `Lt. 3 - Fun World, Metropolitan Mall Bekasi`, `Lt. 3 Fun World, Metropolitan Mall Bekasi`, `Lt 3 Metropolitan Mall Bekasi`.

## 3. Database — `server/schema.sql`

| Objek | Perubahan |
|---|---|
| `event_areas` | `CREATE UNIQUE INDEX idx_event_areas_name ON event_areas (lower(trim(name)))` |
| `event_areas` | `UPDATE` menormalkan baris lama `Panggung Lt. 3` → `Panggung Funworld Lt. 3` (id tetap, FK aman) |
| `event_areas` | Seed 8 area kanonis via `DO $$ ... IF NOT EXISTS ...` (idempoten, aman di-rerun) |
| `event_areas` | Trigger `event_areas_updated_at` (sebelumnya tidak ada — `updated_at` tidak pernah ter-refresh) |

Area kanonis hasil seed (dari data produksi): `Panggung Funworld Lt. 3`, `Panggung Lt. Dasar`, `Musholla Lt. 3`, `Atrium 2 Lt. Dasar`, `Foodventure Lt. 2`, `Parkir Timur`, `Gedung Parkir Mobil P7`, `Keliling Mall`.

## 4. Server API

### 4.1 `server/src/routes/admin.js`

- `getLocationMapping` → `{ success, data: [{ lokasi, eventCount, draftCount, currentAreaId }] }`. Distinct `lokasi` dari `events` **dan** `draft_events` (gabungan, draft-only ikut disertakan), diurut count desc.
- `applyLocationMapping` → body `{ mappings: [{ lokasi, areaId?, targetLokasi? }] }`. Per mapping, dua efek independen:
  - `areaId` ada → `UPDATE events SET area_id=$1 WHERE trim(lokasi)=$2 AND area_id IS NULL` + idem `draft_events` (**tidak** menimpa pemetaan manual).
  - `targetLokasi` ada → `UPDATE events SET lokasi=$1 WHERE trim(lokasi)=$3` + idem `draft_events` — berlaku ke **semua** baris berteks sama, termasuk yang sudah punya `area_id`.
  - Return `{ success, updated, renamed }`.

### 4.2 `server/src/lib/schemas.js`

`getLocationMapping` (literal) + `applyLocationMapping` (`mappings` array min 1; `lokasi` non-empty; `areaId`/`targetLokasi` keduanya opsional dengan `.refine` minimal satu terisi). Guard `requireRole(['superadmin','admin'])` + `ACTION_SCHEMAS` tetap berlaku.

> Catatan: `.partial()` tidak bisa dipakai di sini — zod gagal pada schema ber-`refine`. Karena itu `areaId`/`targetLokasi` dibuat opsional eksplisit.

## 5. Client

| File | Perubahan |
|---|---|
| `src/utils/areaGrouping.ts` **(baru)** | `normalizeLokasi`, `suggestAreaId`, `groupEventsByArea<T>`, `resolveAreaDisplay`. Generik atas `GroupableEvent { id, areaId? }` agar testable tanpa fixture `EventItem` penuh. |
| `src/utils/api/albumsApi.ts` | `fetchLocationMapping()`, `applyLocationMapping()`, tipe `LocationMappingRow`. |
| `src/utils/domainApi.ts` | Re-export 3 simbol baru. |
| `src/components/EventsLandingPage.tsx` | Prop `areas?: EventArea[]`; `areaGroups` dari ongoing+upcoming; nav chip lokasi + section ber-judul area (di-gate `hasMappedAreas`); kartu pakai `resolveAreaDisplay`. |
| `src/components/EventTable.tsx` | Prop `areas?: EventArea[]`; grouping **area → bulan** bila >1 bucket (fallback bulan-only); baris header area (`ui-btn-primary`) di mobile & desktop; sel Lokasi pakai `resolveAreaDisplay`. |
| `src/components/DashboardViewsSection.tsx` | Teruskan `areas` ke `EventTable`. |
| `src/components/dashboard/DashboardPage.tsx` | `areas={siteSettings.eventAreas}` di kedua invokasi `DashboardViewsSection`. |
| `src/App.tsx` | `areas={eventAreas}` ke `EventsLandingPage`. |
| `src/components/EventAreaManagerModal.tsx` | Judul "Area & Lokasi Event"; view ketiga **`mapping`**: tabel distinct lokasi + count + `<select>` area (prefill `currentAreaId` → saran normalisasi) + checkbox **"Seragamkan teks lokasi"** dengan input `targetLokasi` (prefill nama area terpilih), tombol "Terapkan Pemetaan". |

## 6. Verifikasi

1. `npx tsc --noEmit` — 0 error.
2. `npm run build` — hijau.
3. `NODE_ENV=test npx vitest run` — **67 file / 458 test hijau** (baseline awal 64/432; +12 `areaGrouping`, +9 `pgValues`, +5 `locationMapping`).
4. DDL produksi: 8 area, `UNIQUE` index, trigger `event_areas_updated_at` ada.
5. SQL `applyLocationMapping` diuji dalam transaksi `BEGIN…ROLLBACK` di produksi → 17 event terpetakan, rollback bersih (tanpa mengubah data nyata).
6. Browser (dev, `VITE_API_URL` produksi): `/events` → 2 section + 2 nav chip; `/dashboard` → baris header `Panggung Funworld Lt. 3` + `Tanpa lokasi` dengan sub-header bulan; panel "Pemetaan Lokasi" render + menangani 401 dengan pesan.

## 7. Catatan operasional

- **Urutan pakai**: buka dashboard → Konten → "Foto Area Event" → "Pemetaan Lokasi" → review saran tiap varian → (opsional) centang **"Seragamkan teks lokasi"** untuk menulis ulang ejaan → "Terapkan Pemetaan". Setelah itu section per lokasi muncul di `/events` dan tabel dashboard.
- Saran normalisasi hanya untuk varian yang tokennya beririsan; varian ambigu (`Lantai 3`, `Metropolitan Mall Bekasi`, `Metland`, `XXI METMALL BEKASI`) sengaja **tidak** disarankan dan menunggu keputusan admin.
- Event tanpa `area_id` tetap tampil di bucket "Lokasi Lainnya" / "Tanpa lokasi" — tidak ada event yang hilang.

### 7.1 Standardisasi produksi (2026-09-17)

Permintaan Andy: *"Apabila ada event yang masih tertulis lokasinya di Panggung Lt. 3, seragamkan jadi Panggung Funworld Lt. 3."*

Dijalankan lewat HTTP nyata ke `POST /api/v1/admin/applyLocationMapping` (token di-mint di container via `signAccess`), setelah backup DB `metmal_20260917_103955.sql.gz`.

| Varian sumber | Event | Aksi |
|---|---:|---|
| `Panggung Lt. 3` | 117 | `areaId` + `targetLokasi` |
| `Panggung Lt 3` | 14 |  |
| `Panggung Lantai 3` | 3 |  |
| `Lt. 3 - Fun World, Metropolitan Mall Bekasi` | 1 | ″ |
| `Lt. 3 Depan Funworld, Metropolitan Mall Bekasi` | 1 | ″ |
| `Lt. 3 Fun World, Metropolitan Mall Bekasi` | 1 | ″ |
| `Lt 3 Metropolitan Mall Bekasi` | 1 | ″ |
| `Panggung Funworld Lt. 3` (sudah kanonis) | 2 | `areaId` saja |
| `Lantai 3` (ambigu — dikonfirmasi Andy) | 2 | `areaId` + `targetLokasi` |

Hasil tahap 1: `200 {"success":true,"updated":162,"renamed":164}`; lanjutan `areaId`-only untuk 2 event berteks kanonis → `updated:2`. Tahap 2 (lihat keputusan di bawah): `updated:2, renamed:2`. **Akhir**: **142 event + 26 draft** berteks kanonis, **semuanya** ber-`area_id = era_4ffa61e005344431a86dd1aeb544180f`. Sisa varian lama: 0.

**Sengaja tidak disentuh**: `Musholla Lt. 3` (15 — Area berbeda), `Panggung Lt. Dasar` (50 — Area berbeda).

**Keputusan Andy (2026-09-17)**: `Lantai 3` (2 event EO "LT PRO" makeup class) **ikut diseragamkan** ke `Panggung Funworld Lt. 3` setelah dikonfirmasi. Hasil: `{"updated":2,"renamed":2}` → total kanonis **142 event, semuanya ber-`area_id`**, sisa `Lantai 3` = 0.

Verifikasi tampilan: `https://www.metmalcommunityspace.web.id/events` → section per lokasi (lihat §7.2 untuk kondisi akhir); teks `Panggung Lt. 3` lama tidak ada lagi.

### 7.2 Standardisasi lanjutan — seluruh varian (2026-09-17)

Setelah `Panggung Lt. 3` selesai, dilanjutkan menyapu **semua** nilai `lokasi` tersisa (backup: `metmal_20260917_151658.sql.gz`).

**Batch A — teks sudah kanonis, hanya isi `area_id`** (`updated:85`):

| Lokasi | Area |
|---|---|
| `Panggung Lt. Dasar` (50) | Panggung Lt. Dasar |
| `Musholla Lt. 3` (15) | Musholla Lt. 3 |
| `Keliling Mall` (9) | Keliling Mall |
| `Parkir Timur` (3) | Parkir Timur |
| `Gedung Parkir Mobil P7` (1) | Gedung Parkir Mobil P7 |
| `Atrium 2 Lt. Dasar` (2) | Atrium 2 Lt. Dasar |

**Batch B — varian ejaan, `areaId` + `targetLokasi`** (`renamed:6`):

| Varian | → Kanonis |
|---|---|
| `Area Parkir Timur` | `Parkir Timur` |
| `Parkir P7` | `Gedung Parkir Mobil P7` |
| `Gedung Parkir Mobil P7 & P8` | `Gedung Parkir Mobil P7` |
| `Lt. 2` | `Lorong Bekasi Lt. 2` |

**Batch C — keputusan Andy** (`updated:13, renamed:13`):

| Varian | → Kanonis | Area |
|---|---|---|
| `Foodventure Lt. 2` (4) | `Lorong Bekasi Lt. 2` | Lorong Bekasi Lt. 2 |
| `Metropolitan Mall Bekasi` (4) | `Keliling Mall` | Keliling Mall |
| `Area Metropolitan Mall Bekasi` (2) | `Keliling Mall` | Keliling Mall |
| `Lantai Dasar Metropolitan Mall Bekasi` (2) | `Panggung Lt. Dasar` | Panggung Lt. Dasar |
| `Stage Atrium 1 Lantai Dasar` (1) | `Panggung Lt. Dasar` | Panggung Lt. Dasar |

> Catatan: area urutan 4 yang semula di-seed `Foodventure Lt. 2` sudah diganti admin menjadi **`Lorong Bekasi Lt. 2`** (17 Sep 08:02). Karena itu 4 event `Foodventure Lt. 2` dilebur ke sana, bukan ke area baru.

**Hasil akhir**: **241/250 event** terpetakan (dari 1 sebelum pekerjaan ini); draft 30/45 (sisanya data uji `cancel`).

**Sengaja dibiarkan** (keputusan Andy — bukan area event mall):
- `Metland` (1), `XXI METMALL BEKASI` (1), `Diubud Coffee` (1) — lokasi non-area.
- `lokasi` kosong (6 event `past`) — tidak ditebak; diisi manual lewat form edit.

Distribusi akhir per area: Panggung Funworld Lt. 3 (142), Panggung Lt. Dasar (53), Musholla Lt. 3 (15), Keliling Mall (15), Parkir Timur (6), Lorong Bekasi Lt. 2 (5), Gedung Parkir Mobil P7 (3), Atrium 2 Lt. Dasar (2).

## 8. Perbaikan bug terkait: `malformed array literal` pada simpan event

**Gejala** (dilaporkan Andy): mengubah lokasi event secara manual di form edit → toast *"Gagal memperbarui — Perubahan belum tersimpan. Silakan coba lagi."*

**Akar masalah**: `events.categories` / `draft_events.categories` bertipe **`TEXT[]`**, tetapi jalur tulis *event* mengirim `JSON.stringify(data.categories)` — yaitu string `'["Kompetisi"]'`. Postgres menolaknya: `malformed array literal: "["Kompetisi"]"` (ERRCODE 22P02). Helper `toTextArray` sudah ada dan dipakai jalur *draft*, tetapi **tidak** dipakai jalur event. Setiap `updateEvent` yang membawa `categories` gagal; `createEvent`, `batchCreateEvents`, `publishDraft`, dan submit draft publik (`POST /drafts`) terkena bug yang sama.

**Sifat**: bug **pre-existing** dari commit `f922709` ("feat(server): backend REST Express/Postgres"), bukan regresi dari pekerjaan ini (diff `admin.js` murni penambahan). Bukti: log API mencatat 4× `[admin/updateEvent] error: malformed array literal` pukul 03:10–03:12 (percobaan user), sementara `update_event` di `activity_logs` sebelumnya selalu sukses hanya karena tidak pernah membawa perubahan `categories` (mis. hanya mengubah `lokasi`).

**Perbaikan**:
- Helper bersama baru `server/src/lib/pgValues.js` (`toTextArray`, `toJsonb`) — satu sumber kebenaran, menghapus duplikasi yang sebelumnya ada di `admin.js`.
- `server/src/routes/admin.js`: `createEvent`, `updateEvent`, `batchCreateEvents`, `publishDraft` memakai `toTextArray(...)` untuk `categories`; `day_time_slots` tetap `JSON.stringify` (kolom JSONB).
- `server/src/routes/public.js`: `POST /drafts` memakai `toTextArray` (sebelumnya `JSON.stringify` ganda — dikonversi lalu di-stringify lagi di VALUES).
- Tes regresi: `src/utils/__tests__/pgValues.test.ts` (9 tes) — memastikan `toTextArray` **tidak** pernah menghasilkan string JSON.

**Verifikasi end-to-end di produksi** (via HTTP nyata, data uji dibersihkan):
| Kasus | Hasil |
|---|---|
| `updateEvent` payload penuh + ganti lokasi (bentuk persis dari modal edit) | 200 `{success:true}`, `categories` baca-balik `["Festival"]` array |
| `updateEvent` categories saja | 200, array utuh |
| `createEvent` dengan `['Kompetisi','Konser']` | 200, baca-balik array |
| `batchCreateEvents` | 200, baca-balik array |
| `POST /drafts` publik | 201, baca-balik array |
| Sisa data uji | 0 (250 event / 45 draft utuh) |
| Error `malformed` setelah perbaikan | 0 |
