// TypeScript · src/components/letters/letterDocuments.ts · klien Vite/React 19
// Model bersama untuk PASANGAN dokumen surat: SKE (konfirmasi) + SIK (izin kerja).
// Tanpa DDL: `docType` hidup di dalam `letter_data` (JSONB), jadi satu event =
// dua baris `generated_letters` dengan nomor & snapshot PDF masing-masing.
// Baris lama tanpa `docType` dinormalisasi jadi 'ske' saat dibaca (back-compat).

import type { EventItem, LetterRequestItem, SikRequestItem, LetterDocType } from '../../types';
import { bangunHariTanggal } from './letterDates';

export { readDocType, isSikDocument, normalizeLetterData } from '../../lib/letterDocType';
export type { LetterDocType, LetterDocument } from '../../types';

export const DOC_TYPE_LABEL: Record<LetterDocType, string> = {
  ske: 'Surat konfirmasi event',
  sik: 'Surat Izin Kerja',
};

/** 6 syarat tetap SIK — teks persis dari dokumen resmi "SKE - EVENT FEBRUARI 2026". */
export const SIK_SYARAT: readonly string[] = [
  'Tidak menyalahgunakan kegiatan tersebut untuk kegiatan lain yang menyimpang dari keperluan tersebut diatas.',
  'Memelihara kebersihan, ketertiban dan keamanan lingkungan Metropolitan Mall Bekasi.',
  'Segala akibat yang ditimbulkan dari pekerjaan tersebut, menjadi tanggung jawab yang bersangkutan.',
  'Surat izin kerja ini dapat dicabut seketika dan dinyatakan tidak berlaku lagi, bilamana syarat - syarat tersebut diatas dilanggar.',
  'Pekerjaan ini berlangsung dari tanggal tertera diatas.',
  'DILARANG MEROKOK selama berada didalam gedung Metropolitan Mall Bekasi.',
] as const;

export const EMPTY_SKE: LetterRequestItem = {
  tanggalSurat: '',
  nomorSurat: '',
  namaEO: '',
  penanggungJawab: '',
  alamatEO: '',
  namaEvent: '',
  lokasi: '',
  hariTanggalPelaksanaan: '',
  waktuPelaksanaan: '',
  nomorTelepon: '',
  hariTanggalLoading: '',
  waktuLoading: '',
  menyetujuiNama: '',
  menyetujuiOrg: '',
  biayaKebersihan: '',
  vaBank: '',
  tempatSurat: '',
  penandatanganNama: '',
  penandatanganJabatan: '',
};

/**
 * SIK = Surat Izin Kerja (loading & unloading / keluar-masuk barang), dokumen
 * TERPISAH dari SKE. Nomor berakhiran `A`, tanggal terbit bisa beda, penanda
 * tangan `Marcomm Manager`, memuat 6 syarat keselamatan tetap.
 */
export const EMPTY_SIK: SikRequestItem = {
  tanggalSurat: '',
  nomorSurat: '',
  namaEO: '',
  penanggungJawab: '',
  nomorHp: '',
  jenisKegiatan: '',
  tanggalMulai: '',
  tanggalSelesai: '',
  waktu: '',
  lokasi: '',
  namaEvent: '',
  tempatSurat: '',
  penandatanganNama: '',
  penandatanganJabatan: '',
  catatan: '',
};

export function todayIso(): string {
  return new Date().toISOString().split('T')[0] || '';
}

/**
 * Auto-isi saat event dipilih (D7). SKE tetap memakai bentuk lamanya; SIK
 * mengambil alih jadwal bongkar muat + `No. Hp` penanggung jawab lapangan.
 * Nomor SIK tidak ditebak dari nomor SKE — operator mengisi dua nomor sendiri,
 * sesuai contoh resmi yang memakai suffiks `A` + segmen `MKT.SIKI`.
 */
export function buildInitialPair(event: EventItem): { ske: LetterRequestItem; sik: SikRequestItem } {
  const tanggalSurat = todayIso();
  const namaEO = event.eo || '';
  const penanggungJawab = event.pic || '';
  const namaEvent = event.acara || '';
  const lokasi = event.lokasi || '';

  const ske: LetterRequestItem = {
    ...EMPTY_SKE,
    tanggalSurat,
    tempatSurat: 'Bekasi',
    penandatanganJabatan: 'Pimpinan Unit',
    namaEO,
    penanggungJawab,
    namaEvent,
    lokasi,
    nomorTelepon: event.phone || '',
    waktuPelaksanaan: event.jam ? (event.jam.includes('WIB') ? event.jam : `${event.jam} WIB`) : '',
    hariTanggalPelaksanaan: bangunHariTanggal(event.day, event.tanggal),
    menyetujuiNama: penanggungJawab,
    menyetujuiOrg: namaEO,
  };

  const sik: SikRequestItem = {
    ...EMPTY_SIK,
    tanggalSurat,
    tempatSurat: 'Bekasi',
    penandatanganJabatan: 'Marcomm Manager',
    namaEO,
    penanggungJawab,
    nomorHp: event.phone || '',
    jenisKegiatan: `Loading & Unloading ${namaEvent}`.trim(),
    tanggalMulai: event.tanggal || '',
    tanggalSelesai: event.dateEnd || event.tanggal || '',
    waktu: event.jam || '',
    lokasi,
    namaEvent,
  };

  return { ske, sik };
}

export const SKE_REQUIRED_FIELDS: Array<keyof LetterRequestItem> = [
  'tanggalSurat', 'nomorSurat', 'namaEO', 'penanggungJawab', 'alamatEO',
  'namaEvent', 'lokasi', 'hariTanggalPelaksanaan', 'menyetujuiNama',
];

/** Varian berbayar: dicetak hanya bila diisi (contoh resmi TK Al Jasmine). */
export const SKE_PAID_FIELDS = ['biayaKebersihan', 'vaBank'] as const;

export const SIK_REQUIRED_FIELDS: Array<keyof SikRequestItem> = [
  'tanggalSurat', 'nomorSurat', 'namaEO', 'penanggungJawab', 'nomorHp',
  'jenisKegiatan', 'tanggalMulai', 'waktu', 'lokasi',
];

export const SKE_ERRORS: Record<keyof LetterRequestItem, string> = {
  tanggalSurat: 'Tanggal surat wajib diisi',
  nomorSurat: 'Nomor surat wajib diisi',
  namaEO: 'Nama EO wajib diisi',
  penanggungJawab: 'Penanggung jawab wajib diisi',
  alamatEO: 'Alamat EO wajib diisi',
  namaEvent: 'Nama event wajib diisi',
  lokasi: 'Lokasi wajib diisi',
  hariTanggalPelaksanaan: 'Hari/tanggal pelaksanaan wajib diisi',
  waktuPelaksanaan: '',
  nomorTelepon: '',
  hariTanggalLoading: '',
  waktuLoading: '',
  tempatSurat: '',
  penandatanganNama: '',
  penandatanganJabatan: '',
  menyetujuiNama: 'Nama penyetuju (EO) wajib diisi',
  menyetujuiOrg: '',
  biayaKebersihan: '',
  vaBank: '',
};

export const SIK_ERRORS: Record<keyof SikRequestItem, string> = {
  tanggalSurat: 'Tanggal surat wajib diisi',
  nomorSurat: 'Nomor surat wajib diisi',
  namaEO: 'Nama EO wajib diisi',
  penanggungJawab: 'Penanggung jawab wajib diisi',
  nomorHp: 'No. Hp penanggung jawab wajib diisi',
  jenisKegiatan: 'Jenis kegiatan/lokasi wajib diisi',
  tanggalMulai: 'Tanggal mulai wajib diisi',
  tanggalSelesai: '',
  waktu: 'Waktu wajib diisi',
  lokasi: 'Lokasi wajib diisi',
  namaEvent: '',
  tempatSurat: '',
  penandatanganNama: '',
  penandatanganJabatan: '',
  catatan: '',
};

export type LetterErrors<T> = Partial<Record<keyof T, string>>;

/** Validasi per field (menutup T10), pesan diambil dari peta per dokumen. */
export function validateRequired<T extends object>(
  value: T,
  fields: Array<keyof T>,
  messages: Record<keyof T, string>,
): LetterErrors<T> {
  const errors: LetterErrors<T> = {};
  for (const field of fields) {
    const v = value[field];
    if (typeof v === 'string' && !v.trim()) errors[field] = messages[field];
  }
  return errors;
}
