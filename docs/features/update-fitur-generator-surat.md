# Update Fitur: Generator Surat — Reaktivasi, Kertas Inline, dan Riwayat

Status: **IMPLEMENTASI DUA DOKUMEN SELESAI — keputusan user 2026-11-08: generator menghasilkan SKE + SIK per event. Ketiga keputusan lanjutan dijawab (paritas SKE penuh, blok loading dicabut, varian berbayar masuk) dan maintenance rute surat dicabut 2026-11-08.** · Dibuat 2026-11-07 · Diperbarui 2026-11-08

Dokumen contoh & referensi: `reports/letter-samples-2026-11-08/` — **gitignored** (`.gitignore:49`), memuat PII produksi. Baca **`PERBANDINGAN-FORMAT-RESMI.md`** di folder itu (perbandingan SKE + SIK vs generator); temuan paritas kertas↔PDF ada di `README.md`.
Stack: Opsi B (ADR 005) — SPA Vercel + REST Express/Postgres VPS. Tidak ada Supabase, tidak ada dependensi baru, tidak ada DDL.
Terkait: `src/components/events/LetterGenerator.tsx`, `src/components/pdf/buildLetterPdf.ts`, `src/components/modals/EventLetterPickerModal.tsx`, `src/components/pdf/pdfTheme.ts`, `src/pages/PublicLetterViewer.tsx`, `src/utils/letterPdfExport.ts`, `server/src/routes/admin.js` (aksi `*Letter`), `docs/LETTER_GENERATOR.md`

## 1. Ringkasan

Halaman `/dashboard/content/surat` **ditutup maintenance sejak 2026-11-07 dan dibuka kembali 2026-11-08** setelah keputusan user (`dashboardNavigation.tsx` rail + kartu direktori, `DashboardPage.tsx` badan halaman kini me-render `LetterWorkspace`). Penutupan sementara itu beralasan: generasi lama cacat pada beberapa titik yang tercatat di §2.

Target: satu permukaan kerja surat yang bisa dipakai tanpa pengetahuan teknis — pilih event → kertas A4 terisi otomatis dan bisa diklik langsung → simpan → tautan publik bagikan → riwayat untuk membuka ulang, menduplikasi, atau mengarsipkan. Template tetap **satu**: Surat Konfirmasi Pelaksanaan Event.

Non-goal: template lain (perjanjian/booth/teguran), penomoran surat otomatis, kirim email, gambar tanda tangan, tembusan/lampiran, surat untuk draft event.

## 2. Kondisi saat ini (bukti)

| # | Temuan | Lokasi | Dampak |
|---|---|---|---|
| T1 | Rute ditutup `UnderMaintenance` | `DashboardPage.tsx:784-792` | fitur tidak bisa dipakai sama sekali |
| T2 | Komponen tanpa pemakai | `LetterGenerator.tsx`, `EventLetterPickerModal.tsx`, `DraftLetterModal.tsx`, `useLetterHandlers.ts` | 1.200+ baris kode mati, tidak ikut bundle |
| T3 | **Editan hilang tiap 30 detik** | `LetterGenerator.tsx:35-85` — `useEffect` bergantung pada identitas objek `event`; `useEvents` polling 30 s membuat objek baru → `setLetter(initialLetter)` mengulang | bug blocker, tidak terlihat karena komponen belum dirender |
| T4 | `handleShare` tidak pernah berhasil | `LetterGenerator.tsx:137-151` — setelah `await handleSave()`, closure `generatedLetter` masih `null` | tombol "Bagikan" tidak pernah menyalin tautan |
| T5 | Nama PIC dipakai dua kali | `buildLetterPdf.ts:252` (`signerName = letter.penanggungJawab`) dan `:170` (`u.p.`) | penerima surat menandatangani surat untuk dirinya sendiri |
| T6 | Jabatan penanda tangan hardcoded | `buildLetterPdf.ts:249` `'Marketing Manager'` | salah untuk Building Manager / GM |
| T7 | Tidak ada tempat & tanggal tanda tangan | `buildLetterPdf.ts:245-270` | surat resmi tanpa "Bekasi, 7 November 2026" |
| T8 | Dua sumber kebenaran visual | kertas HTML (`LetterGenerator.tsx:185-300`) vs PDF (`buildLetterPdf.ts`) | pratinjau dan hasil cetak berbeda isi (perihal, blok loading) |
| T9 | Pratinjau menampilkan tanggal ISO mentah | `LetterGenerator.tsx:200` `{letter.tanggalSurat}` | terlihat `2026-11-07`, bukan `7 November 2026` |
| T10 | Validasi hanya satu baris teks | `LetterGenerator.tsx:155-168` + tombol `disabled` | pengguna tidak tahu field mana yang kurang |
| T11 | Riwayat surat tidak ada | `fetchGeneratedLetters` (`surveysApi.ts:172`) tanpa pemakai UI | surat tersimpan tidak bisa dibuka, diunduh ulang, atau diarsipkan |
| T12 | Daftar surat menarik blob PDF | `admin.js:1168` `SELECT *` termasuk `pdf_base64` (~50–100 KB/baris) | payload list membengkak sejak baris pertama |
| T13 | Unduh dari halaman publik ≠ yang ditampilkan | `PublicLetterViewer.tsx:63` me-render ulang dari `letterData`, sedangkan iframe memakai `pdf_base64` | setelah template berubah, penerima melihat dokumen A dan mengunduh dokumen B |
| T14 | Role `demo` tidak dilindungi di UI | `LetterGenerator` tanpa prop `readOnly`; backend sudah menolak aksi tulis | tombol Simpan/Hapus tampil lalu gagal 403 |

Data produksi (read-only, 2026-11-07): `generated_letters` **0 baris** → tidak ada migrasi data. `users` tidak punya kolom nama/jabatan (`display_name`, `role` saja) → penanda tangan harus menjadi field surat.

## 3. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | **Editor = kertas A4 yang bisa diklik.** Satu permukaan `210mm` dengan margin `20mm`, Times New Roman 11 pt, line-height 1.45 (sama dengan `LINE_RATIO` di `pdfTheme.ts`). Field memakai `EditableText`/`EditableArea` yang sudah ada (`src/components/ui/Editable.tsx`), jadi di luar fokus tampak sebagai teks surat. Form 12-field terpisah dan pratinjau HTML terpisah dihapus; tidak ada lagi dua sumber kebenaran visual (menutup T8). |
| D2 | **Mesin PDF tetap jsPDF, rute paritas = satu model tata letak bersama** (opsi A saat interview; bukan overlay region). Kertas HTML dan `buildLetterPdf.ts` membaca satu sumber metrik dari `letterLayout.ts`: satuan mm→pt, margin, lebar label, ukuran font, line-height (`LINE_RATIO`), dan jarak antar blok. Kedua renderer mengonsumsi nilai field yang sama (`LetterRequestItem`) dan urutan blok yang sama (§5.1), sehingga yang dibagi adalah *model*, bukan copy-paste dua renderer. jsPDF tidak menawarkan paritas identik, jadi jaminan akhirnya dokumen uji (§9.4); verifikasi paritas dilakukan pada **sampel PDF yang sama** dengan satuan yang sama (A4 `mm`, Times 11 pt) dibandingkan rendering kertasnya. Alternatif print-pipeline browser (paritas 100 %, tapi unduh 2 klik dan tanpa byte tersimpan) dan Chromium server (paritas 100 % + 1 klik, tapi +400 MB di VPS) ditolak untuk iterasi ini. |
| D3 | **Nomor surat tetap manual** dengan hint format (`001/MMB/VI/2026`) dan peringatan non-blocking bila nomor sudah dipakai surat lain pada tahun yang sama. Tidak ada tabel counter. |
| D4 | **Tiga field baru di `LetterRequestItem`** (`src/types/index.ts:476`): `tempatSurat`, `penandatanganNama`, `penandatanganJabatan`. `letter_data` JSONB → tanpa DDL. Default saat memuat: `tempatSurat \|\| 'Bekasi'`, `penandatanganJabatan \|\| 'Marketing Manager'`. `penanggungJawab` kembali murni milik EO (`u.p.`) — menutup T5/T6. **Nilai penandatangan tersalin utuh ke `letter_data` per baris** (bukan dibaca dari `site_settings`/pengaturan global), sehingga surat lama tetap menampilkan orang yang menandatangani saat dibuat, bukan pemegang jabatan yang berlaku hari ini. Pengaturan global, kalaupun ada, hanya prefill default. |
| D5 | **`pdf_base64` dipertahankan sebagai arsip dokumen terbit.** Surat resmi yang sudah dibagikan tidak boleh berubah rupa ketika template diperbaiki; karena itu snapshot byte disimpan dan dipakai saat dibuka/diunduh. Konsekuensinya `listLetters` wajib memakai kolom eksplisit tanpa `pdf_base64` (menutup T12) dan `updateLetter` yang mengubah `letterData` wajib menulis `pdfBase64` baru dari klien. |
| D6 | **Jadwal bongkar muat tetap wajib** (tanggal + waktu), sesuai keputusan interview. Validasi per field, bukan satu baris pesan (menutup T10). |
| D7 | **Kertas otomatis terisi dari event** saat dipilih; semua nilai tetap bisa diedit. Auto-isi: `namaEO ← eo`, `penanggungJawab ← pic`, `namaEvent ← acara`, `lokasi ← lokasi`, `nomorTelepon ← phone`, `waktuPelaksanaan ← jam`, `hariTanggalPelaksanaan ← \`${day.trim()}, ${tanggal}\`` (`events.day` menyimpan spasi ekor, mis. `"Sabtu  "`). `alamatEO`, `nomorSurat`, dan jadwal loading tidak punya sumber data → diketik manusia. |
| D8 | **Inisialisasi dikunci per `event.id`**, bukan identitas objek (menutup T3): state diisi hanya saat `event.id` berubah, bukan pada setiap render/polling. |
| D9 | **Riwayat adalah keadaan ketiga workspace**, bukan halaman terpisah: `/dashboard/content/surat` memuat tiga keadaan `pilih` / `tulis` / `riwayat` tanpa rute baru. Tidak menambah entri navigasi. |
| D10 | **Halaman publik membaca snapshot, bukan template terkini**: `PublicLetterViewer` memakai `pdf_base64` untuk iframe **dan** unduh; render ulang hanya bila kolom itu kosong (menutup T13). |
| D11 | **Role**: `canViewSettings` = gerbang halaman (superadmin, admin, demo), `canManageSettings` = boleh menulis. Untuk `demo` kertas bersifat baca-saja (`readOnly`), tombol Simpan/Arsipkan/Hapus disembunyikan; backend tetap penjaga sebenarnya (`DEMO_READ_ACTIONS` tidak memuat aksi tulis surat). |
| D12 | **Dead code dihapus**, bukan dibiarkan "untuk diaktifkan kembali": `DraftLetterModal.tsx` (tidak pernah diimpor sejak `0c10cf3`) dan `useLetterHandlers.ts` beserta wiring-nya. `EventLetterPickerModal` dipertahankan sebagai pemilih event. |

## 4. Model data

```ts
// src/types/index.ts — LetterRequestItem (perluasan)
tempatSurat: string;          // "Bekasi" → baris "Bekasi, 7 November 2026"
penandatanganNama: string;    // nama penanda tangan pihak mall
penandatanganJabatan: string; // "Marketing Manager", "Building Manager", dst.
```

Bentuk `generated_letters` tidak berubah (`server/schema.sql`). Baris lama tetap terbaca karena `letter_data` JSONB dan field baru punya default saat hidrasi.

## 5. Arsitektur UI

```
src/components/letters/
├── LetterWorkspace.tsx     # keadaan pilih|tulis|riwayat, simpan, bagikan, guard belum-disimpan
├── LetterPaper.tsx         # kertas A4, semua field inline-editable, readOnly untuk demo
├── LetterHistoryList.tsx   # daftar surat + aksi buka/duplikat/salin tautan/arsipkan/hapus
└── letterDates.ts          # formatTanggalSurat (ISO → "7 November 2026"), bangunHariTanggal
```

`EventLetterPickerModal` dipakai ulang tanpa perubahan (sudah punya pencarian atas nama event/lokasi/EO/tanggal).

Berdiri di atas modul yang sudah ada: `letterPdfExport.ts` (render/blob/base64/unduh/pratinjau), `surveysApi.ts` (`fetchGeneratedLetters`/`createGeneratedLetter`/`updateGeneratedLetter`/`deleteGeneratedLetter`), `useToast`.

### 5.1 Kertas — urutan blok (dipakai bersama HTML dan PDF)

| Blok | Field inline |
|---|---|
| Kop | statis (logo `PDF_LOGO_DATA_URL`, nama mall, divisi, alamat) |
| Meta | `nomorSurat`, `tanggalSurat`, perihal statis |
| Tujuan | `namaEO`, `penanggungJawab` (`u.p.`), `alamatEO`, `nomorTelepon` |
| Pembuka | statis |
| Data event | `namaEvent`, `lokasi`, `hariTanggalPelaksanaan`, `waktuPelaksanaan` |
| Jadwal loading | `hariTanggalLoading`, `waktuLoading` |
| Penutup | statis |
| Tanda tangan | `tempatSurat` + tanggal surat, `penandatanganJabatan`, `penandatanganNama` |

## 6. Perubahan PDF (`src/components/pdf/buildLetterPdf.ts`)

| Perubahan | Alasan |
|---|---|
| Font `helvetica` → `times` (base-14, tanpa dependensi) | menyamai kertas HTML Times New Roman; surat resmi Indonesia |
| Blok tanda tangan: `tempatSurat, tanggalFormatted` di atas "Hormat kami," | menutup T7 |
| Nama penanda tangan ← `penandatanganNama`; jabatan ← `penandatanganJabatan` | menutup T5/T6 |
| Baris jabatan tidak lagi hardcoded | idem |
| Tanggal diformat sekali di klien (`formatTanggalSurat`) dan dipakai kertas + PDF | menutup T9 |
| Konstanta layout (margin, lebar label, ukuran font, gap) dipindah ke `src/components/pdf/letterLayout.ts` dan diimpor kedua renderer | satu sumber metrik, mengurangi risiko drift |

Kop, blok data event, blok loading, dan paginasi (`ensureSpace`) dipertahankan; blok loading tetap selalu tampil karena D6 mewajibkannya.

## 7. Server (`server/src/routes/admin.js`, `server/src/lib/schemas.js`)

| Aksi | Perubahan |
|---|---|
| `listLetters` (`:1163`) | `SELECT id, event_id, draft_event_id, letter_data, pdf_url, created_at, created_by, status` — **tanpa `pdf_base64`**. Default `status = 'active'`; `includeArchived: true` menambah arsip (`status IN ('active','archived')`). `deleted` tidak pernah muncul. Penyamaran `maskPiiDeep` untuk `demo` dipertahankan. |
| `createLetter` (`:1188`) | tidak berubah (atribusi dari sesi) |
| `updateLetter` (`:1209`) | tidak berubah |
| `deleteLetter` (`:1227`) | tidak berubah (soft delete) |
| `ACTION_SCHEMAS.listLetters` (`schemas.js:139`) | tambah `includeArchived: z.boolean().optional()` (default `false` → aktif saja) |

Rute publik `GET /letters/:id` (`server/src/routes/public.js:298`) tidak berubah: tetap `status = 'active'`, jadi arsip otomatis mematikan tautan.

## 8. Otorisasi

| Role | Kertas | Simpan/Arsipkan/Hapus | Riwayat |
|---|---|---|---|
| superadmin, admin | edit | ya | ya |
| demo | baca-saja | tidak (UI + backend) | ya |

## 9. Gerbang selesai

1. `npm run build` (tsc ikut) hijau.
2. Seluruh vitest yang menyentuh area berubah: `src/components/pdf/__tests__/*`, `src/utils/api/__tests__/surveysApi.test.ts`, `src/components/dashboard/__tests__/dashboardNavigation.test.tsx`, `server/src/__tests__/roleMatrix.test.js`, `server/src/routes/__tests__/adminReadGate.test.js` — `NODE_ENV=test npx vitest run --maxWorkers=2`.
3. Tes baru:
   - `letterDates`: ISO → `7 November 2026`, input tak valid dikembalikan apa adanya, `bangunHariTanggal` merapikan spasi ekor `day`;
   - `buildLetterPdf`: PDF memuat `penandatanganNama` + `penandatanganJabatan` + `tempatSurat`, dan nama PIC EO **tidak** muncul di blok tanda tangan;
   - `LetterPaper`: semua field wajib ditandai dan pesan per-field muncul; `readOnly` mematikan input;
   - `LetterWorkspace`: inisialisasi tidak mengulang saat objek `event` baru dengan `id` sama (regresi T3); "Bagikan" menyalin tautan setelah simpan pertama (regresi T4);
   - `listLetters`: SQL tidak menyertakan `pdf_base64`; default `status = 'active'`, `includeArchived` menambah `archived` (mock `db.query`);
   - `PublicLetterViewer`: unduh memakai `pdf_base64` tersimpan, bukan render ulang.
4. **Dokumen uji nyata** (bukan fixture sintetis), dirender ke kertas dan PDF lalu dinilai visual oleh user sebelum maintenance dicabut:
   1. nama event ≥ 60 karakter + lokasi panjang;
   2. EO + alamat multi-baris + nomor telepon;
   3. nama penanda tangan panjang (3 kata) dengan jabatan `Building Manager`;
   4. jadwal loading panjang (`08.00 - 11.30` + tanggal loading beda bulan);
   5. satu event multi-hari dari data produksi (mis. `Lomba Sanggar Tari Kreasi`, 9–10 Mei 2026).
5. Smoke: buka `/dashboard/content/surat` sebagai admin → pilih event → kertas terisi → edit → Simpan → Salin tautan → buka `/letter/:id` tanpa login → Unduh PDF. Ulangi sebagai `demo` (tidak bisa menyimpan).
6. Maintenance dicabut **terakhir**, setelah user menyatakan dokumen layak: `dashboardNavigation.tsx:178` (`maintenance: true`), `:488`, `DashboardPage.tsx:784-792` (ganti `UnderMaintenance` dengan `<LetterWorkspace/>`), dan `featureDocs.ts:625` (`status: 'maintenance'` → `'aktif'` + langkah penggunaan baru).

## 10. File

**Baru**
- `src/components/letters/LetterWorkspace.tsx`
- `src/components/letters/LetterPaper.tsx`
- `src/components/letters/LetterHistoryList.tsx`
- `src/components/letters/letterDates.ts`
- `src/components/pdf/letterLayout.ts`
- tes: `src/components/letters/__tests__/*.test.tsx`, `src/components/pdf/__tests__/letterPdf.test.ts`

**Edit**
- `src/components/pdf/buildLetterPdf.ts` (font times, tanda tangan, konstanta layout)
- `src/types/index.ts` (`LetterRequestItem` + 3 field)
- `src/pages/PublicLetterViewer.tsx` (unduh dari snapshot)
- `src/components/dashboard/DashboardPage.tsx` (render `LetterWorkspace`, hapus `UnderMaintenance` untuk rute surat)
- `src/components/dashboard/dashboardNavigation.tsx` (hapus penanda maintenance rail + kartu, subtitle modul)
- `src/data/featureDocs.ts` (status `aktif` + langkah baru)
- `src/hooks/useDashboardHandlers.ts`, `src/App.tsx` (hapus wiring `useLetterHandlers`; `letterEvent` diganti state di workspace)
- `server/src/routes/admin.js` (`listLetters` kolom eksplisit + status)
- `server/src/lib/schemas.js` (`listLetters.includeArchived`)
- `docs/LETTER_GENERATOR.md` (path lama supabase/migrate → Opsi B; field baru; alur baru)

**Hapus**
- `src/components/modals/DraftLetterModal.tsx`
- `src/hooks/useLetterHandlers.ts`
- `src/components/events/LetterGenerator.tsx` (digantikan `LetterWorkspace` + `LetterPaper`)

## 11. Risiko

| Risiko | Mitigasi |
|---|---|
| Kertas HTML dan PDF tetap bisa berbeda beberapa baris karena metrik font | gerbang §9.4 (5 dokumen nyata, dinilai user) sebelum maintenance dicabut |
| jsPDF base-14 `times` kurang mendukung karakter khusus (mis. `–`, `“ ”`) | uji dokumen memakai teks asli produksi yang mengandung tanda baca tersebut |
| Snapshot `pdf_base64` membengkak bila surat banyak | ±50–100 KB/baris, volume puluhan/tahun; `listLetters` tidak menarik kolom itu |
| Surat untuk draft event tidak tersedia | di luar lingkup (D-goal); `draft_event_id` tetap dibiarkan ada di skema untuk masa depan |

## 12. Urutan eksekusi (status 2026-11-08)

| # | Langkah | Status |
|---|---|---|
| 1 | Model data + `letterLayout.ts` + perbaikan `buildLetterPdf.ts` → tes PDF | ✅ selesai |
| 2 | `letterDates.ts` + `LetterPaper` (inline, readOnly, validasi per field) → tes | ✅ selesai |
| 3 | `LetterWorkspace` (pilih → tulis → simpan/bagikan, guard belum disimpan) → tes regresi T3/T4 | ⚠️ komponen selesai; **tes regresi T3/T4 belum ada** |
| 4 | `listLetters` server + `LetterHistoryList` → tes query + UI | ⚠️ implementasi + tes SQL selesai; **tes UI `LetterHistoryList` belum ada** |
| 5 | `PublicLetterViewer` unduh dari snapshot | ⚠️ kode selesai; **tanpa tes otomatis** |
| 6 | Hapus dead code, bersihkan wiring `useLetterHandlers` | ✅ selesai |
| 7 | Gerbang §9 lengkap + 5 dokumen uji untuk penilaian user | ✅ 5 dokumen SKE + 5 dokumen SIK dirender sebagai pasangan (5 pasang `<slug>.html/.png/.pdf` + `<slug>-SIK.html/.png/.pdf/.json`, total 41 tautan di `index.html`); menunggu penilaian ulang |
| 8 | Cabut maintenance (navigasi, halaman, `featureDocs`), perbarui `docs/LETTER_GENERATOR.md` | ✅ selesai — maintenance dicabut 2026-11-08 atas keputusan user; tiga keputusan §5 terjawab: paritas penuh, blok loading dicabut, varian berbayar masuk |

**Catatan gerbang §9.3:** tes regresi T3/T4 dan tes unduh-snapshot `PublicLetterViewer` sudah tertutup sebagian oleh `letterDocuments.test.ts`, `LetterWorkspace.test.tsx` (dua tab), dan `PublicLetterViewer.test.tsx` (judul/snapshot/fallback per `docType`). Tes eksplisit "objek event baru dengan `id` sama" dan "klipboard berisi dua tautan setelah Simpan pertama" belum ditulis.

**✅ Keputusan user 2026-11-08 & implementasinya.** Generator kini menghasilkan **dua dokumen per event**: SKE + SIK (Surat Izin Kerja / loading & unloading), mengikuti Google Docs resmi **"SKE - EVENT FEBRUARI 2026"** yang dibaca read-only via `gog docs cat`. Tanpa DDL: `docType` (`'ske'|'sik'`) disimpan di `letter_data` JSONB, baris lama dinormalisasi jadi SKE. Yang sudah ada: `SikPaper.tsx`, `buildSikPdf.ts` (6 syarat tetap + `DILARANG MEROKOK`), `sikPdfExport.ts`, tab SKE/SIK di `LetterWorkspace` dengan satu Simpan yang menulis **dua baris + dua snapshot PDF**, `Bagikan` menyalin **dua tautan**, badge `docType` di riwayat, filter server `COALESCE(letter_data->>'docType','ske')` + zod `docType`, viewer publik dengan judul/builder per jenis, dan `maskPiiDeep` yang kini menyamarkan `nomorHp`/`nohp` untuk demo. Detail: `docs/LETTER_GENERATOR.md` v3.0.0.

**Ketiga keputusan lanjutan sudah dijawab oleh user (2026-11-08)** — (1) paritas tampilan SKE penuh ke format resmi; (2) blok "JADWAL LOADING" lama di SKE dicabut; (3) varian berbayar (Biaya Kebersihan + VA/Bank) masuk scope. Pengerjaan paritas SKE berjalan paralel; SKE lama dipertahankan sampai paritas selesai.

**Temuan paritas dari 5 dokumen contoh** (`reports/letter-samples-2026-11-08/README.md`, kini sekunder): tanda baca em-dash/en-dash **terbukti aman** pada `times` + `WinAnsiEncoding` (risiko §11 tertutup), tetapi ada 6 catatan kertas↔PDF: titik dua `Label : Nilai` jatuh di ujung kanan kertas, prefix `u.p.` hilang di kertas, kop kertas tanpa logo, alamat multi-baris luruh **hanya di kertas** (PDF sudah 3 baris), kertas tanpa footer, dan 2 dari 5 PDF memecah blok tanda tangan ke halaman 2 sementara kertas tetap satu A4.
