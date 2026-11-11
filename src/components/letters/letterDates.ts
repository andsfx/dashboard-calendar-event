// ============================================================
// Helper tanggal surat — murni, tanpa React.
//
// Dipakai bersama oleh kertas HTML (LetterPaper) dan builder PDF
// (buildLetterPdf) supaya hanya ada satu cara memformat tanggal surat.
// ============================================================

import type { LetterRequestItem } from '../../types';

/** Nama bulan panjang — identik dengan MONTH_LONG di pdfTheme.ts. */
const MONTH_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `2026-11-07` → `7 November 2026`.
 * Input non-ISO (tidak cocok `YYYY-MM-DD`) atau kosong dikembalikan apa adanya.
 */
export function formatTanggalSurat(iso: string): string {
  if (!iso) return iso;
  const match = iso.match(ISO_DATE_RE);
  if (!match) return iso;

  const year = match[1] ?? '';
  const month = Number(match[2] ?? '0');
  const day = Number(match[3] ?? '0');

  const monthName = MONTH_LONG[month - 1];
  if (!monthName || !day) return iso;

  return `${day} ${monthName} ${year}`;
}

/**
 * Gabung `day` dan `tanggal` dengan koma + spasi, sambil merapikan spasi
 * ekor pada `day` (event menyimpan `day` seperti `"Sabtu  "`).
 */
export function bangunHariTanggal(day: string, tanggal: string): string {
  return `${day.trim()}, ${tanggal.trim()}`;
}

/** Baris-blok tanda tangan yang dipakai kertas HTML dan PDF. */
export interface SignerBlock {
  /** "Bekasi, 7 November 2026" — kosong bila tidak ada tempat maupun tanggal. */
  tempatTanggal: string;
  nama: string;
  jabatan: string;
}

/**
 * Susun blok tanda tangan dari `letter_data`.
 *
 * Sumber tunggal agar kertas dan PDF tidak bisa berbeda: penanda tangan adalah
 * pihak mall (`penandatanganNama`/`penandatanganJabatan`), BUKAN PIC EO
 * (`penanggungJawab` dipakai hanya untuk `u.p.` penerima).
 */
export function letterSignerBlock(
  letter: Pick<LetterRequestItem, 'tempatSurat' | 'penandatanganNama' | 'penandatanganJabatan' | 'tanggalSurat'>,
): SignerBlock {
  const tempat = (letter.tempatSurat ?? '').trim();
  const tanggal = formatTanggalSurat(letter.tanggalSurat).trim();
  return {
    tempatTanggal: tempat && tanggal ? `${tempat}, ${tanggal}` : tempat || tanggal,
    nama: (letter.penandatanganNama ?? '').trim(),
    jabatan: (letter.penandatanganJabatan ?? '').trim(),
  };
}