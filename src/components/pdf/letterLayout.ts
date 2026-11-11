import { A4, LINE_RATIO } from './pdfTheme';

// ============================================================
// Metrik tata letak surat — satu sumber kebenaran untuk kertas
// HTML (LetterPaper) dan builder PDF (buildLetterPdf).
//
// Kedua renderer memakai satuan mm sebagai angka "murni" (211 × 297)
// lalu dikonversi ke pt hanya saat menggambar di jsPDF. Konstanta di
// sini sengaja bebas React/JSX agar bisa dipakai di keduanya.
// ============================================================

/** Halaman A4 dalam mm (satuan fisik yang dipakai CSS/HTML). */
export const LETTER_PAGE = {
  width: 210,
  height: 297,
} as const;

/** Margin kertas dalam mm (sama untuk kertas HTML dan PDF). */
export const LETTER_MARGIN_MM = 20;

/** Ukuran font dasar surat, dalam pt. */
export const LETTER_BASE_FONT_SIZE = 11;

/** Konversi satuan mm → pt (jsPDF): `mm * 72 / 25.4`. */
export function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

/** Lebar konten dalam pt — A4 lebar dikurangi margin kiri-kanan. */
export const LETTER_CONTENT_W_PT = A4.w - mmToPt(LETTER_MARGIN_MM) * 2;

/** Lebar kolom label "Label : Nilai" di kertas (≈ 150 pt, menyamai buildLetterPdf). */
export const LETTER_LABEL_W_PT = 150;

/** Jarak kolom antara ":" dan awal nilai. */
export const LETTER_LABEL_GAP_PT = 8;

/** Lebar kolom nilai = lebar konten − label − gap. */
export const LETTER_VALUE_W_PT = LETTER_CONTENT_W_PT - LETTER_LABEL_W_PT - LETTER_LABEL_GAP_PT;

// Line-height dipakai dari LINE_RATIO (pdfTheme) — jangan didefinisi ulang.
export { LINE_RATIO };