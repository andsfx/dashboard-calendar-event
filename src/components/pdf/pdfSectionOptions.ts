import type { PdfSectionOption } from './PdfExportOptionsModal';

// ============================================================
// Label bagian dokumen untuk pemilih ekspor PDF.
//
// Dipisah dari builder supaya UI tidak perlu mengimpor modul jsPDF
// (yang berat) hanya untuk membaca daftar label.
// ============================================================

export const SCHEDULE_SECTION_OPTIONS: PdfSectionOption[] = [
  { id: 'summary', label: 'Ringkasan', hint: 'Kartu jumlah event per status' },
  { id: 'table', label: 'Tabel Jadwal', hint: 'Daftar lengkap tanggal, acara, lokasi, status' },
  { id: 'areas', label: 'Agenda per Area', hint: 'Dikelompokkan menurut lokasi' },
  { id: 'contacts', label: 'Kontak Penyelenggara', hint: 'EO, PIC, dan nomor telepon' },
];

export const ALBUM_SECTION_OPTIONS: PdfSectionOption[] = [
  { id: 'cover', label: 'Halaman Sampul', hint: 'Identitas laporan, periode, jumlah foto' },
  { id: 'header', label: 'Judul Album', hint: 'Nama album, tanggal, lokasi di tiap halaman' },
  { id: 'photos', label: 'Grid Foto', hint: 'Susunan foto per halaman' },
  { id: 'captions', label: 'Keterangan Foto', hint: 'Caption di bawah tiap foto' },
];

export const SURVEY_SECTION_OPTIONS: PdfSectionOption[] = [
  { id: 'kpi', label: 'Ringkasan KPI', hint: 'Total submisi, tenant, traffic & sales positif' },
  { id: 'distribution', label: 'Distribusi Jawaban', hint: 'Traffic, sales, kategori, zona' },
  { id: 'topGerai', label: 'Top Gerai', hint: 'Peringkat gerai berdasarkan skor' },
  { id: 'crossTab', label: 'Cross-tab', hint: 'Kategori × sales, maksimal 20 baris' },
  { id: 'feedback', label: 'Cuplikan Feedback', hint: 'Komentar teks, maksimal 30' },
];
