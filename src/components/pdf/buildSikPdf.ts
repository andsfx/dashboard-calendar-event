// TypeScript · src/components/pdf/buildSikPdf.ts · jsPDF 4, A4 pt, times base-14
// SURAT IZIN KERJA (loading & unloading) — dokumen TERPISAH dari SKE.
// Urutan blok identik dengan SikPaper.tsx: kop → 8 field → 6 syarat → penutup
// → catatan → tanda tangan kiri. `ensureSpace` dipakai dengan tinggi blok
// terukur (bukan angka tetap) supaya tidak ada teks yang menabrak footer.

import { jsPDF } from 'jspdf';
import type { SikRequestItem } from '../../types';
import {
  A4, LINE_RATIO, PDF_BRAND, PDF_LOGO_DATA_URL, ensureSpace, drawPdfFooter,
} from './pdfTheme';
import { LETTER_MARGIN_MM, LETTER_LABEL_W_PT, mmToPt } from './letterLayout';
import { formatTanggalSurat } from '../letters/letterDates';
import { SIK_SYARAT } from '../letters/letterDocuments';

const FONT = 'times';
const MARGIN_X = mmToPt(LETTER_MARGIN_MM);
const MARGIN_TOP = mmToPt(LETTER_MARGIN_MM);
const CONTENT_W = A4.w - MARGIN_X * 2;
const LABEL_W = LETTER_LABEL_W_PT;
const VALUE_W = CONTENT_W - LABEL_W - 8;
const LEADING = 10 * LINE_RATIO;

/** Baris "Label : Nilai" dengan nilai yang membungkus, bukan meluber. */
function drawFieldRow(
  doc: jsPDF, label: string, value: string, x: number, y: number,
): number {
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(PDF_BRAND.muted);
  doc.text(label, x, y);
  doc.text(':', x + LABEL_W, y);

  doc.setFont(FONT, 'bold');
  doc.setTextColor(PDF_BRAND.text);
  const lines: string[] = doc.splitTextToSize(value || '-', VALUE_W);
  doc.text(lines, x + LABEL_W + 8, y);
  return y + Math.max(LEADING, lines.length * LEADING);
}

/** Blok teks bebas; kembalikan baseline berikutnya. */
function drawBlock(
  doc: jsPDF, text: string, x: number, y: number,
  size: number, maxWidth: number, options: { style?: 'normal' | 'bold'; color?: string } = {},
): number {
  doc.setFont(FONT, options.style ?? 'normal');
  doc.setFontSize(size);
  doc.setTextColor(options.color ?? PDF_BRAND.text);
  const lines: string[] = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * size * LINE_RATIO;
}

function measureBlock(
  doc: jsPDF, text: string, size: number, maxWidth: number,
): number {
  doc.setFont(FONT, 'normal');
  doc.setFontSize(size);
  const lines: string[] = doc.splitTextToSize(text, maxWidth);
  return lines.length * size * LINE_RATIO;
}

export function buildSikPdf(letter: SikRequestItem, logoDataUrl = PDF_LOGO_DATA_URL): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.setProperties({
    title: `Surat Izin Kerja - ${letter.jenisKegiatan || 'Tanpa Kegiatan'}`,
    author: 'Metropolitan Mall Bekasi',
    subject: 'Surat Izin Kerja (Loading & Unloading)',
    keywords: 'surat izin kerja, loading, unloading, Metropolitan Mall Bekasi',
    creator: 'Dashboard Event System',
  });

  let y = MARGIN_TOP;

  // ── Kop: logo MetLand kiri, judul + nomor di tengah ─────────
  if (logoDataUrl) {
    const logoH = 30;
    try {
      doc.addImage(logoDataUrl, 'JPEG', MARGIN_X, y, logoH * (1000 / 289), logoH);
    } catch {
      // Data URL rusak — lanjut tanpa logo, jangan gagalkan ekspor.
    }
    y += 46;
  } else {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(PDF_BRAND.primaryDark);
    doc.text('METROPOLITAN MALL BEKASI', MARGIN_X, y + 16, { charSpace: 0.5 });
    y += 34;
  }

  doc.setFont(FONT, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(PDF_BRAND.ink);
  doc.text('SURAT IZIN KERJA', A4.w / 2, y, { align: 'center' });
  y += 20;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(PDF_BRAND.text);
  doc.text(letter.nomorSurat || '-', A4.w / 2, y, { align: 'center' });
  y += 28;

  // ── Penerima izin ──────────────────────────────────────────
  y = drawBlock(doc, 'Diberikan surat izin kepada :', MARGIN_X, y, 11, CONTENT_W, { style: 'bold' }) + 10;

  const rows: Array<[string, string]> = [
    ['Nama', letter.namaEO],
    ['Penanggung Jawab', letter.penanggungJawab],
    ['No. Hp', letter.nomorHp],
    ['Jenis kegiatan/Lokasi', letter.jenisKegiatan],
    ['Tanggal Mulai', letter.tanggalMulai],
    ['Tanggal Selesai', letter.tanggalSelesai],
    ['Lokasi', letter.lokasi],
    ['Waktu', letter.waktu],
  ];
  for (const [label, value] of rows) {
    // Ukur per baris sebelum menggambar agar tidak terbelah halaman.
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    const lines: string[] = doc.splitTextToSize(value || '-', VALUE_W);
    const needed = Math.max(LEADING, lines.length * LEADING) + 4;
    y = ensureSpace(doc, y, needed, { margin: MARGIN_TOP });
    y = drawFieldRow(doc, label, value, MARGIN_X, y) + 4;
  }

  // ── 6 syarat tetap ─────────────────────────────────────────
  y += 12;
  y = ensureSpace(doc, y, 24, { margin: MARGIN_TOP });
  y = drawBlock(doc, 'Syarat – syarat yang harus dipatuhi  :', MARGIN_X, y, 11, CONTENT_W, { style: 'bold' }) + 8;

  for (let i = 0; i < SIK_SYARAT.length; i += 1) {
    const syarat = SIK_SYARAT[i] ?? '';
    const isLast = i === SIK_SYARAT.length - 1;
    const lines: string[] = doc.splitTextToSize(syarat, VALUE_W - 8);
    const needed = Math.max(LEADING, lines.length * LEADING) + 5;
    y = ensureSpace(doc, y, needed, { margin: MARGIN_TOP });

    // Bullet digambar sebagai lingkaran, bukan karakter Unicode: base-14
    // `times` + WinAnsiEncoding tidak menjamin glyph bullet tersedia.
    doc.setFillColor(PDF_BRAND.ink);
    doc.circle(MARGIN_X + 8, y - 3, 1.2, 'F');
    y = drawBlock(doc, syarat, MARGIN_X + 18, y, 10, VALUE_W - 8, {
      style: isLast ? 'bold' : 'normal',
    }) + 5;
  }

  // ── Penutup ────────────────────────────────────────────────
  const closing = 'Demikian surat izin ini diberikan agar dapat dipergunakan sebagaimana mestinya dan harapan yang berkepentingan maklum.';
  const closingH = measureBlock(doc, closing, 11, CONTENT_W);
  y += 12;
  y = ensureSpace(doc, y, closingH + 8, { margin: MARGIN_TOP });
  y = drawBlock(doc, closing, MARGIN_X, y, 11, CONTENT_W) + 16;

  // ── Catatan opsional ───────────────────────────────────────
  if (letter.catatan.trim()) {
    const noteH = measureBlock(doc, letter.catatan, 9, CONTENT_W);
    y = ensureSpace(doc, y, noteH + 10, { margin: MARGIN_TOP });
    y = drawBlock(doc, `Catatan : ${letter.catatan}`, MARGIN_X, y, 9, CONTENT_W, {
      color: PDF_BRAND.muted,
    }) + 10;
  }

  // ── Tanda tangan kiri (Marcomm Manager) ─────────────────────
  // Blok tidak boleh terbelah: ukur seluruh tingginya lebih dahulu.
  const signatureHeight = 96;
  y = ensureSpace(doc, y, signatureHeight, { margin: MARGIN_TOP });

  const tempat = (letter.tempatSurat || '').trim();
  const tanggal = formatTanggalSurat(letter.tanggalSurat).trim();
  const tempatTanggal = tempat && tanggal ? `${tempat}, ${tanggal}` : tempat || tanggal;

  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(PDF_BRAND.text);
  doc.text(tempatTanggal, MARGIN_X, y);
  doc.text('Metropolitan Mall Bekasi', MARGIN_X, y + 14);

  if (letter.penandatanganNama.trim()) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.text(letter.penandatanganNama, MARGIN_X, y + 64);
  } else {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(PDF_BRAND.faint);
    doc.text('( ____________________ )', MARGIN_X, y + 64);
  }
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(PDF_BRAND.muted);
  doc.text(letter.penandatanganJabatan || '-', MARGIN_X, y + 78);

  drawPdfFooter(doc, {
    label: 'Surat Izin Kerja · Metropolitan Mall Bekasi',
    margin: MARGIN_X,
  });
  return doc;
}
