# 📄 Generator Surat — Panduan Penggunaan

## 🎯 Overview

Generator Surat membuat **dua dokumen berpasangan per event**, keduanya di atas kertas A4 yang bisa diklik langsung (inline editing):

| Dokumen | Singkatan | Fungsi | Nomor contoh | Penanda tangan |
|---|---|---|---|---|
| Surat Konfirmasi Event | **SKE** | mengonfirmasi pelaksanaan event ke EO | `097/MMB/MKT.MC/II/2026` | `Pimpinan Unit` |
| Surat Izin Kerja (loading & unloading) | **SIK** | izin keluar-masuk barang + 6 syarat keselamatan | `097A/MMB/MKT.SIKI/2026` | `Marcomm Manager` |

Ini mengikuti dokumen resmi mall (Google Docs **"SKE - EVENT FEBRUARI 2026"** dan contoh cetak SIK). SIK **bukan** blok di dalam SKE — nomor, tanggal terbit, dan penanda tangannya berbeda, serta masing-masing punya tautan publik dan snapshot PDF sendiri.

Kertas adalah editor sekaligus pratinjau (bukan form terpisah + pratinjau terpisah).

**Arsitektur local-first (v4)**: workspace terbuka **langsung** pada pasangan SKE/SIK yang siap diisi — tanpa gerbang setup. Semua data tersimpan lokal di `localStorage` (dua kunci: `letter-studio:v1` untuk riwayat ber-version, `letter-studio:draft` untuk draf yang sedang dibuka), divalidasi Zod dan tahan korupsi (entri rusak dilewati, bukan melempar error). Server hanya menyentuh data saat aksi **Terbitkan** yang eksplisit (menulis dua baris `generated_letters` via admin REST); **Bagikan** hanya aktif setelah terbit sukses.

> ✅ Status 2026-11-08: rute **Buat Surat sudah HIDUP di dashboard** (`/dashboard/content/surat` me-render workspace letter). Dokumen contoh dan perbandingan format tetap ada di `reports/letter-samples-2026-11-08/` (gitignored, memuat PII produksi).

## 🚀 Fitur Utama

### 1. Dua tab dokumen
- Tab **Surat Konfirmasi Event** dan **Surat Izin Kerja** di workspace yang sama.
- Auto-populate dari data event terpilih untuk kedua dokumen.
- Titik merah pada tab = ada field wajib yang belum diisi di dokumen itu.
- Toggle "Pratinjau bersih" menyembunyikan affordance edit.

### 2. PDF Generation
- SKE: `buildLetterPdf.ts` — font `times`, A4, kop Metropolitan Mall Bekasi, blok tanda tangan kanan.
- SIK: `buildSikPdf.ts` — judul + nomor di tengah, 8 field penerima izin, 6 syarat tetap (termasuk **DILARANG MEROKOK**), tanda tangan kiri `Marcomm Manager`.
- Unduh langsung ke device, atau pratinjau lewat kertas.

### 3. Penyimpanan dua baris
- **Tanpa DDL**: `docType` (`'ske' | 'sik'`) disimpan di dalam `letter_data` (JSONB); baris lama tanpa kunci itu dibaca sebagai SKE.
- Alur: **Draft lokal** (localStorage, autosave) → satu klik **Terbitkan** menulis **dua baris** `generated_letters` dengan nomor & snapshot `pdf_base64` masing-masing (D5) → **Bagikan** (hanya aktif setelah terbit).
- Filter server memakai `COALESCE(letter_data->>'docType', 'ske') = $n`.
- Riwayat menampilkan badge jenis dokumen; buka ulang, salin tautan, arsipkan, hapus per dokumen.

### 4. Public Sharing
- **Dua** tautan publik `/letter/:id`, satu per dokumen.
- Tombol **Bagikan** menyalin kedua tautan sekaligus (dipisah baris baru).
- Viewer publik menampilkan judul sesuai `docType`; unduh memakai snapshot tersimpan, dan fallback render ulang memilih builder SKE/SIK yang tepat.

## 📋 Cara Penggunaan

### Untuk Admin

1. **Buka** `Dashboard → Konten → Buat Surat` (setelah maintenance dicabut).
2. **Pilih event** — nama EO, PIC, nama event, lokasi, waktu, hari/tanggal terisi otomatis di SKE; SIK otomatis terisi `Loading & Unloading <nama event>`, `No. Hp` PIC lapangan, tanggal mulai/selesai, dan lokasi.
3. **Isi nomor kedua surat** — pola resmi: SKE `NNN/MMB/MKT.MC/{bulan Romawi}/{tahun}`, SIK `NNNA/MMB/MKT.SIKI/{tahun}`. Nomor disarankan **otomatis** per seri (pemindaian nomor tahun berjalan, max+1, zero-pad 3 digit) dan **selalu bisa ditimpa**; tombol "Nomor baru" menyegarkan saran per dokumen.
4. **Lengkapi field wajib di kedua tab**: alamat EO + jadwal bongkar muat (SKE), `No. Hp`, jenis kegiatan, tanggal mulai, waktu, lokasi (SIK). Titik merah hilang saat lengkap.
5. **Isi nama & jabatan penanda tangan**: SKE default `Pimpinan Unit`, SIK default `Marcomm Manager`.
6. **Unduh PDF** per tab untuk memeriksa, lalu **Terbitkan** (menulis pasangan dua baris ke server).
7. **Bagikan** untuk menyalin dua tautan bagi penerima — hanya aktif setelah Terbitkan sukses.

### Untuk Penerima Surat

1. Terima dua tautan `https://domain.com/letter/{id}` (SKE + SIK).
2. PDF tampil inline (snapshot saat surat disimpan), judul halaman sesuai jenis dokumen.
3. Tombol unduh mengunduh PDF yang sama.

## 🔧 Technical Details

### Model data

```ts
// src/types/index.ts
type LetterDocType = 'ske' | 'sik';
type LetterDocument =
  | ({ docType?: 'ske' } & LetterRequestItem)   // opsional = back-compat baris lama
  | ({ docType: 'sik' } & SikRequestItem);

interface GeneratedLetter {
  id: string;
  docType: LetterDocType;       // turunan letter_data.docType
  letterData: LetterDocument;
  pdfBase64?: string;           // snapshot per dokumen
  status: 'active' | 'archived' | 'deleted';
  // …
}

interface SikRequestItem {
  tanggalSurat: string; nomorSurat: string;
  namaEO: string; penanggungJawab: string; nomorHp: string;
  jenisKegiatan: string; tanggalMulai: string; tanggalSelesai: string;
  waktu: string; lokasi: string; namaEvent: string;
  tempatSurat: string; penandatanganNama: string; penandatanganJabatan: string;
  catatan: string;              // opsional: denda, batas pengosongan
}
```

`LetterRequestItem` (SKE) tidak berubah; `SKE_REQUIRED_FIELDS`, `SIK_REQUIRED_FIELDS`, `SKE_ERRORS`, `SIK_ERRORS`, dan `SIK_SYARAT` ada di `src/components/letters/letterDocuments.ts`. Normalisasi & narrowing ada di `src/lib/letterDocType.ts` (murni, dipakai API + viewer).

### Struktur file

```
src/components/letters/
├── LetterWorkspace.tsx      # tab SKE/SIK, simpan pasangan, dua tautan
├── LetterPaper.tsx          # kertas SKE inline-editable
├── SikPaper.tsx             # kertas SIK inline-editable
├── LetterHistoryList.tsx    # riwayat + badge docType
├── letterDates.ts           # formatTanggalSurat + letterSignerBlock (murni)
└── letterDocuments.ts       # model, auto-isi, 6 syarat, validasi per field
src/components/pdf/
├── buildLetterPdf.ts        # PDF SKE (jsPDF, font times)
├── buildSikPdf.ts           # PDF SIK (jsPDF, 6 syarat)
└── letterLayout.ts          # metrik tata letak bersama kertas + PDF
src/lib/letterDocType.ts     # readDocType / normalizeLetterData / isSikDocument
src/lib/letterStudio/
├── schema.ts                # Zod LetterPair + parsePair/parsePairs (korup → null)
├── persistence.ts           # kunci letter-studio:v1 + letter-studio:draft, try/catch
├── numbering.ts             # suggestNumber: NNN/MMB/... & NNNA/MMB/MKT.SIKI/...
├── backup.ts                # exportBackup / importBackup (merge by id, skip count)
└── automation.ts            # window.letterStudio API, di-install eksplisit
src/pages/PublicLetterViewer.tsx
src/utils/letterPdfExport.ts
src/utils/sikPdfExport.ts
```

### API Functions

```typescript
// src/utils/domainApi.ts (re-export dari utils/api/surveysApi.ts)
fetchGeneratedLetters(eventId?, draftEventId?, options?: {
  includeArchived?: boolean; docType?: 'ske' | 'sik';
}): Promise<GeneratedLetter[]>
createGeneratedLetter(params): Promise<GeneratedLetter>
updateGeneratedLetter(id, updates): Promise<GeneratedLetter>
deleteGeneratedLetter(id): Promise<void>
```

`listLetters` **tidak** mengembalikan `pdf_base64` (payload list); default hanya `active`, `includeArchived: true` menambah `archived`, `docType` memfilter lewat operator JSONB `->>` + `COALESCE` untuk baris lama. Tanpa `docType`, riwayat menampilkan kedua jenis dokumen.

## 🧪 Testing

- `src/components/letters/__tests__/letterDates.test.ts` — format tanggal + blok tanda tangan
- `src/components/letters/__tests__/letterDocuments.test.ts` — `docType`, back-compat, auto-isi pasangan, 6 syarat, validasi per field
- `src/components/letters/__tests__/LetterPaper.test.tsx` — SKE: inline edit, readOnly, galat per field
- `src/components/letters/__tests__/SikPaper.test.tsx` — SIK: struktur, 6 syarat, inline edit
- `src/components/letters/__tests__/LetterWorkspace.test.tsx` — buka-langsung (tanpa gerbang pilih event), autosave dipulihkan setelah remount, hidrasi pasangan (buka satu sisi mengisi dua sisi), publish tidak menimpa baris event lain, duplikat (id + nomor baru), Bagikan nonaktif sebelum terbit, backup round-trip
- `src/lib/letterStudio/__tests__/schema.test.ts` — round-trip Zod + entri korup dilewati
- `src/lib/letterStudio/__tests__/numbering.test.ts` — pola SKE/SIK, sampel resmi (`041/MMB/VII/2026`, `097A/MMB/MKT.SIKI/2026`), zero-pad, tahun beda diabaikan
- `src/lib/letterStudio/__tests__/backup.test.ts` — export container, merge by id, skip malformed
- `src/lib/letterStudio/__tests__/persistence.test.ts` — kunci kosong/korup → fallback aman, round-trip draft
- `src/components/pdf/__tests__/buildSikPdf.test.ts` — judul/nomor, 8 field, 6 syarat, paginasi, catatan
- `src/components/pdf/__tests__/letterPdf.test.ts` — SKE: penanda tangan ≠ PIC EO + paginasi
- `src/pages/__tests__/PublicLetterViewer.test.tsx` — judul per `docType`, snapshot, fallback SKE vs SIK
- `server/src/routes/__tests__/adminListLetters.test.js` — `listLetters` tanpa `pdf_base64`, filter status + `docType`
- `server/src/routes/__tests__/adminPiiMasking.test.js` + `server/src/__tests__/roleMatrix.test.js` — `nomorHp` SIK tersamar untuk `demo`

## 🔒 Security

- Tautan publik read-only, hanya `status = 'active'` (arsip → 404).
- Snapshot PDF tidak berubah setelah diterbitkan.
- Gated `requireRole` + zod `ACTION_SCHEMAS` (`docType` terbatas `ske|sik`); `demo` baca-saja.
- `maskPiiDeep` mengenali kunci SIK `nomorHp`/`nohp` (ditambahkan bersama fitur ini) sehingga baris SIK tidak membocorkan No. Hp asli ke akun demo.

## 🚀 Future Enhancements

- [x] Nomor surat otomatis per tahun/bulan (v4 — `suggestNumber`, selalu bisa ditimpa)
- [ ] Paritas tampilan SKE penuh ke format resmi (logo MetLand, footer PT, 3 baris tabel, kolom `Menyetujui,` pihak EO)
- [ ] Varian SKE berbayar (Biaya Kebersihan + No. VA/Bank)
- [ ] Email integration
- [ ] Tanda tangan digital (gambar)
- [ ] Batch generation
- [ ] Version history

---

## 🗄️ Local-first storage (v4)

### Dua kunci localStorage
- **`letter-studio:v1`** — riwayat pasangan dokumen (array `LetterPair`, validated, entri korup dilewati).
- **`letter-studio:draft`** — pasangan yang sedang dibuka; di-autosave (debounce ~300 ms) setiap perubahan, dipulihkan saat refresh.

### Skema Zod (`src/lib/letterStudio/schema.ts`)

```ts
interface LetterPair {
  id: string;
  eventId?: string;
  title: string;
  ske: Record<string, unknown>;   // field loose (string) supaya baris legacy ter-hidrasi
  sik: Record<string, unknown>;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  publishedIds?: { ske?: string; sik?: string };
}
```

Modul: `src/lib/letterStudio/` — `schema.ts` (Zod), `persistence.ts` (try/catch kuota/JSON/storage mati), `numbering.ts` (`suggestNumber`, pola `NNN/MMB/<ROMAN>/<YEAR>` dan `NNNA/MMB/MKT.SIKI/<ROMAN>/<YEAR>`, menerima juga format resmi lama `.../MKT.SIKI/<YEAR>`), `backup.ts` (export/import JSON, merge by id, skipped count), `automation.ts` (API jendela, di-install eksplisit dari workspace, tanpa side-effect impor).

### Seam penerbitan
- **Draft lokal** → **Terbit** hanya lewat tombol **Terbitkan**: satu klik menulis **dua baris** server (create atau update berdasar `publishedIds` pasangan aktif) dengan dua snapshot `pdf_base64`, lalu kedua id disimpan di `pair.publishedIds`.
- **Bagikan** menyalin dua tautan `/letter/:id` dan hanya aktif setelah terbit.
- Pasangan yang belum pernah terbit tetap bisa **diunduh sebagai PDF** dan **diekspor JSON**.
- Duplikat menghasilkan id baru + nomor seri baru; riwayat lokal punya pencarian, buka ulang, duplikat, hapus.

### Automation API (untuk agen)

```js
window.letterStudio.help()
window.letterStudio.createPair({ ske: {...}, sik: {...}, title })
window.letterStudio.listPairs()
window.letterStudio.exportData()
window.letterStudio.importData(jsonOrObject)
await window.letterStudio.downloadPdf(id, 'ske' | 'sik')
await window.letterStudio.getPdfBase64(id, 'ske' | 'sik')
```

Semua hasil berbentuk `{ ok, ... }` — tidak pernah melempar error melewati batas `window`. jsPDF tetap di balik dynamic import `letterPdfExport`/`sikPdfExport`.

API ini beroperasi langsung pada **store yang tersimpan** (localStorage `letter-studio:v1`), BUKAN pada state React workspace yang sedang terbuka; perubahan dari konsol (`createPair`/`importData`) baru terlihat di tampilan Riwayat setelah workspace di-mount ulang / dibuka kembali. `listPairs`/`getPdfBase64` juga belum tentu mencerminkan pasangan yang sedang diedit sampai debounce autosave 300 ms-nya flush. Ini disengaja: permukaan automation memang untuk agen, bukan binding dua arah secara live.

> ✅ Status 2026-11-08: rute surat sudah **HIDUP di dashboard** — `dashboardNavigation` & `DashboardPage` me-render `LetterWorkspace` di `/dashboard/content/surat`. Dokumen contoh tetap di `reports/letter-samples-2026-11-08/` (gitignored, memuat PII produksi).

---

**Last Updated**: 2026-11-08
**Version**: 4.0.0
