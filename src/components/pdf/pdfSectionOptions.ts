import type { PdfSectionOption } from './PdfExportOptionsModal';

// ============================================================
// Label bagian dokumen untuk pemilih ekspor PDF.
//
// Dipisah dari builder supaya UI tidak perlu mengimpor modul jsPDF
// (yang berat) hanya untuk membaca daftar label.
// ============================================================

export const SCHEDULE_SECTION_OPTIONS: PdfSectionOption[] = [
  { id: 'summary', label: 'Ringkasan', hint: 'Kartu jumlah event per status' },
  { id: 'table', label: 'Tabel jadwal', hint: 'Daftar lengkap tanggal, acara, lokasi, status' },
  { id: 'areas', label: 'Agenda per area', hint: 'Dikelompokkan menurut lokasi' },
  { id: 'contacts', label: 'Kontak penyelenggara', hint: 'EO, PIC, dan nomor telepon' },
];

export const ALBUM_SECTION_OPTIONS: PdfSectionOption[] = [
  { id: 'cover', label: 'Halaman sampul', hint: 'Identitas laporan, periode, jumlah foto' },
  { id: 'header', label: 'Judul album', hint: 'Nama album, tanggal, lokasi di tiap halaman' },
  { id: 'photos', label: 'Susunan foto', hint: 'Susunan foto per halaman' },
  { id: 'captions', label: 'Keterangan foto', hint: 'Teks keterangan di bawah tiap foto' },
];

export const SURVEY_SECTION_OPTIONS: PdfSectionOption[] = [
  { id: 'kpi', label: 'Ringkasan KPI', hint: 'Total isian, tenant, kunjungan naik, dan penjualan naik' },
  { id: 'distribution', label: 'Sebaran jawaban', hint: 'Kunjungan, penjualan, kategori, zona' },
  { id: 'topGerai', label: 'Tenant teratas', hint: 'Peringkat tenant berdasarkan skor' },
  { id: 'crossTab', label: 'Tabel silang', hint: 'Kategori dan penjualan, maksimal 20 baris' },
  { id: 'feedback', label: 'Cuplikan umpan balik', hint: 'Komentar teks, maksimal 30' },
];
