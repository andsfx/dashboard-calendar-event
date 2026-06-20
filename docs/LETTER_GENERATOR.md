# 📄 Letter Generator - Panduan Penggunaan

## 🎯 Overview

Letter Generator adalah fitur WYSIWYG untuk membuat surat konfirmasi event secara otomatis dengan template PDF profesional. Terintegrasi dengan Supabase untuk penyimpanan dan sharing.

## 🚀 Fitur Utama

### 1. **WYSIWYG Editor**
- Edit inline seperti dokumen Word
- 12 field yang bisa diedit
- Auto-populate dari data event
- Preview mode toggle

### 2. **PDF Generation**
- Template surat resmi Indonesia
- Kop surat Metropolitan Mall Bekasi
- Format A4 profesional
- Download langsung ke device

### 3. **Database Storage**
- Simpan surat di Supabase
- Track history surat yang dibuat
- Link to event/draft event

### 4. **Public Sharing**
- Generate link publik untuk setiap surat
- Viewer page dengan PDF embed
- Download button untuk penerima

## 📋 Cara Penggunaan

### Untuk Admin

#### Membuat Surat Baru

1. **Akses Dashboard**
   ```
   Login sebagai admin → Dashboard
   ```

2. **Klik Tombol "Buat Surat"**
   - Akan muncul modal EventLetterPicker
   - Pilih event yang ingin dibuat suratnya

3. **Edit Surat**
   - LetterGenerator akan terbuka dengan data event auto-filled
   - Field yang wajib diisi:
     - ✅ Tanggal Surat
     - ✅ Nomor Surat
     - ✅ Nama EO
     - ✅ Penanggung Jawab
     - ✅ Alamat EO
     - ✅ Nama Event
     - ✅ Lokasi
     - ✅ Hari/Tanggal Pelaksanaan
     - ✅ Hari/Tanggal Loading
     - ✅ Waktu Loading

4. **Preview & Download**
   - Klik **"Pratinjau"** untuk melihat PDF
   - Klik **"Unduh PDF"** untuk download
   - Klik **"Simpan"** untuk save ke database
   - Klik **"Bagikan"** untuk copy link publik

#### Mengedit Surat yang Sudah Ada

```typescript
// Dari Supabase API
import { fetchGeneratedLetters } from './utils/supabaseApi';

const letters = await fetchGeneratedLetters();
// letters berisi array dari GeneratedLetter
```

### Untuk Penerima Surat

1. **Terima Link**
   - Admin kirim link: `https://domain.com/letter/{id}`

2. **Buka Link**
   - PublicLetterViewer page akan terbuka
   - PDF tampil inline di browser
   - Bisa download PDF langsung

## 🔧 Technical Details

### Database Schema

```sql
CREATE TABLE generated_letters (
  id UUID PRIMARY KEY,
  letter_data JSONB NOT NULL,
  pdf_base64 TEXT,
  pdf_url TEXT,
  event_id UUID REFERENCES events(id),
  draft_event_id UUID REFERENCES draft_events(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### File Structure

```
src/
├── components/
│   ├── LetterGenerator.tsx          # Modal editor WYSIWYG
│   ├── PublicLetterViewer.tsx       # Viewer page publik
│   ├── EventLetterPickerModal.tsx   # Modal pilih event
│   ├── pdf/
│   │   └── LetterDocument.tsx       # PDF template
│   └── ui/
│       └── Editable.tsx             # Editable components
├── utils/
│   ├── letterPdfExport.tsx          # PDF generation utilities
│   └── supabaseApi.ts               # CRUD operations
└── App.tsx                          # Integration & routing

migrate/
└── generated-letters.sql            # Database migration
```

### API Functions

```typescript
// Fetch all generated letters
fetchGeneratedLetters(): Promise<GeneratedLetter[]>

// Create new letter
createGeneratedLetter(data: {
  letterData: LetterRequestItem;
  pdfBase64?: string;
  pdfUrl?: string;
  eventId?: string;
  draftEventId?: string;
  createdBy?: string;
}): Promise<GeneratedLetter>

// Update existing letter
updateGeneratedLetter(id: string, data: Partial<GeneratedLetter>): Promise<GeneratedLetter>

// Soft delete letter
deleteGeneratedLetter(id: string): Promise<void>
```

### PDF Export Functions

```typescript
// Download PDF to device
downloadLetterPdf(letter: LetterRequestItem): Promise<void>

// Open PDF in new tab
openLetterPdfPreview(letter: LetterRequestItem): Promise<void>

// Render PDF to base64 string
renderLetterPdfBase64(letter: LetterRequestItem): Promise<string>
```

## 🎨 Template Fields

LetterDocument menggunakan field berikut:

```typescript
interface LetterRequestItem {
  tanggalSurat: string;           // Format: YYYY-MM-DD
  nomorSurat: string;             // Contoh: 001/MMB/VI/2025
  namaEO: string;                 // Nama Event Organizer
  penanggungJawab: string;        // Nama PIC
  alamatEO: string;               // Alamat lengkap EO
  namaEvent: string;              // Nama acara
  lokasi: string;                 // Lokasi event
  hariTanggalPelaksanaan: string; // Contoh: Sabtu, 15 Juni 2025
  waktuPelaksanaan: string;       // Contoh: 10:00 - 18:00
  nomorTelepon: string;           // Nomor kontak EO
  hariTanggalLoading: string;     // Contoh: Jumat, 14 Juni 2025
  waktuLoading: string;           // Contoh: 08:00 - 10:00
}
```

## 🧪 Testing Checklist

### Frontend Testing

- [ ] LetterGenerator modal terbuka saat klik "Buat Surat"
- [ ] Data event auto-populate ke form
- [ ] Semua field editable berfungsi
- [ ] Toggle preview mode bekerja
- [ ] Validasi field wajib bekerja
- [ ] Tombol "Pratinjau" membuka PDF di tab baru
- [ ] Tombol "Unduh PDF" download file PDF
- [ ] Tombol "Simpan" save ke Supabase
- [ ] Tombol "Bagikan" copy link ke clipboard

### Backend Testing

- [ ] Tabel `generated_letters` sudah ada di Supabase
- [ ] CRUD operations berfungsi (create, read, update, delete)
- [ ] PDF base64 tersimpan di database
- [ ] RLS policies aktif

### Public Viewer Testing

- [ ] Link `/letter/:id` bisa diakses publik
- [ ] PDF tampil di viewer page
- [ ] Tombol download berfungsi
- [ ] Error handling untuk surat tidak ditemukan

## 🐛 Troubleshooting

### PDF tidak muncul di preview
```bash
# Pastikan @react-pdf/renderer terinstall
npm list @react-pdf/renderer

# Jika belum ada
npm install @react-pdf/renderer
```

### Database error saat save
```sql
-- Cek apakah tabel ada
SELECT * FROM generated_letters LIMIT 1;

-- Jika tidak ada, jalankan migration
-- Lihat file: migrate/generated-letters.sql
```

### TypeScript error
```bash
# Clear cache dan rebuild
npm run build

# Jika masih error, check types
npx tsc --noEmit
```

## 📊 Performance Notes

- **PDF Generation**: ~2-3 detik untuk surat standar
- **Database Storage**: ~50-100KB per surat (base64)
- **Public Viewer**: Load time < 1 detik untuk PDF < 500KB

## 🔒 Security

- **RLS Policies**: Hanya authenticated users yang bisa create/update
- **Public Access**: Viewer page read-only untuk semua orang
- **Data Validation**: Semua field divalidasi sebelum save
- **XSS Protection**: React auto-escape semua input

## 🚀 Future Enhancements

- [ ] Template customization (upload logo custom)
- [ ] Multiple template options (surat undangan, surat perjanjian, dll)
- [ ] Email integration (kirim surat langsung via email)
- [ ] Signature integration (tanda tangan digital)
- [ ] Batch generation (generate banyak surat sekaligus)
- [ ] Version history (track perubahan surat)

## 📞 Support

Untuk pertanyaan atau issue terkait Letter Generator:
1. Check dokumentasi ini
2. Review source code di `src/components/LetterGenerator.tsx`
3. Test di development environment dulu sebelum deploy

---

**Last Updated**: 2025-06-20
**Version**: 1.0.0
