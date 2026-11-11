import { jsPDF } from 'jspdf';
import type { LetterRequestItem } from '../../types';
import {
  A4,
  LINE_RATIO,
  PDF_BRAND,
  PDF_LOGO_DATA_URL,
} from './pdfTheme';
import { formatTanggalSurat } from '../letters/letterDates';
import {
  LETTER_LABEL_W_PT,
  LETTER_LABEL_GAP_PT,
  LETTER_VALUE_W_PT,
} from './letterLayout';

// ============================================================
// Surat Konfirmasi Event — format resmi MMB (PERBANDINGAN-FORMAT-RESMI.md §2).
//
// Struktur (A1–A14): kop logo saja; meta tempat/tanggal + "No." tanpa label
// dan tanpa Perihal (A3/A4); tujuan tanpa `u.p.`/telepon (A5); kalimat
// pembuka dinamis menyebut nama EO + nama event (A6); tabel 3 baris tanpa
// latar berwarna (A7/A8/A14); penutup tunggal (A9); DUA kolom tanda tangan
// mall + EO (A10/A11); TANPA jadwal loading (A12 — milik SIK); footer blok
// identitas PT + pita hijau (A2). Margin 72 pt (1 inci) sesuai dokumen resmi.
//
// Ritme baris tetap dihitung dari satu rumus (`LINE_RATIO`) dan tiap blok
// melewati `ensureSpace` sebelum digambar (lihat catatan riwayat di bawah).
// ============================================================

const FONT = 'times';
/** Margin resmi 72 pt = 1 inci — BUKAN LETTER_MARGIN_MM (20 mm, dipakai SIK). */
const MARGIN_X = 72;
const MARGIN_TOP = 72;
const CONTENT_W = A4.w - MARGIN_X * 2;

/** Cadangan bawah untuk footer identitas PT (A2) sebelum page-break. */
const FOOTER_RESERVE = 110;

interface TextOptions {
  size?: number;
  style?: 'normal' | 'bold';
  color?: string;
  maxWidth?: number;
}

/**
 * Gambar satu blok teks pada baseline `y` dan kembalikan Y berikutnya.
 * Tinggi balik = jumlah baris × `size × LINE_RATIO`.
 */
function drawBlock(doc: jsPDF, text: string, x: number, y: number, options: TextOptions = {}): number {
  const size = options.size ?? 11;
  const lineHeight = size * LINE_RATIO;
  doc.setFont(FONT, options.style ?? 'normal');
  doc.setFontSize(size);
  doc.setTextColor(options.color ?? PDF_BRAND.text);

  const lines = options.maxWidth ? doc.splitTextToSize(text, options.maxWidth) : [text];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/** Tinggi blok tanpa menggambar — untuk mengukur sebelum page-break. */
function measureBlock(doc: jsPDF, text: string, options: TextOptions = {}): number {
  const size = options.size ?? 11;
  doc.setFont(FONT, options.style ?? 'normal');
  doc.setFontSize(size);
  const lines = options.maxWidth ? doc.splitTextToSize(text, options.maxWidth) : [text];
  return lines.length * size * LINE_RATIO;
}

/** Baris "Label : Nilai" dengan kolom nilai yang membungkus, bukan meluber. */
function drawFieldRow(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW: number,
  valueW: number,
): number {
  const lineHeight = 11 * LINE_RATIO;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(PDF_BRAND.text);
  doc.text(label, x, y);
  doc.text(':', x + labelW, y);
  const valueLines = doc.splitTextToSize(value || '-', valueW);
  doc.text(valueLines, x + labelW + LETTER_LABEL_GAP_PT, y);
  return y + Math.max(lineHeight, valueLines.length * lineHeight);
}

interface RichSegment {
  text: string;
  bold?: boolean;
}

/**
 * Satu paragraf dengan segmen tebal di tengahnya (kalimat pembuka A6:
 * nama EO + nama event dicetak tebal seperti dokumen resmi). Wrapping kata
 * manual memakai `getTextWidth` karena jsPDF tidak bisa mencampur gaya di
 * dalam satu panggilan `text()`. Mengembalikan Y berikutnya.
 */
function drawRichParagraph(doc: jsPDF, segments: RichSegment[], x: number, y: number, maxWidth: number): number {
  const size = 11;
  const lineHeight = size * LINE_RATIO;
  const spaceW = doc.getTextWidth(' ');
  const lines: Array<Array<{ text: string; style: 'normal' | 'bold' }>> = [[]];
  let lineW = 0;

  for (const segment of segments) {
    const style = segment.bold ? 'bold' : 'normal';
    doc.setFont(FONT, style);
    doc.setFontSize(size);
    for (const word of segment.text.split(/\s+/).filter(Boolean)) {
      const wordW = doc.getTextWidth(word);
      if (lineW > 0 && lineW + spaceW + wordW > maxWidth) {
        lines.push([]);
        lineW = 0;
      }
      if (lineW > 0) lineW += spaceW;
      lineW += wordW;
      lines.at(-1)?.push({ text: word, style });
    }
  }

  let by = y;
  for (const line of lines) {
    if (!line.length) continue;
    let bx = x;
    for (const word of line) {
      doc.setFont(FONT, word.style);
      doc.setFontSize(size);
      doc.setTextColor(PDF_BRAND.text);
      doc.text(word.text, bx, by);
      doc.setFont(FONT, word.style);
      bx += doc.getTextWidth(word.text) + spaceW;
    }
    by += lineHeight;
  }
  return by;
}

/** Nilai biaya + suffix PPN resmi, tanpa menggandakan bila sudah tertulis. */
function biayaDenganPpn(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /PPN/i.test(trimmed) ? trimmed : `${trimmed} (Exclude PPN)`;
}

/** Baris varian berbayar yang benar-benar tercetak (kosong = dilewati). */
function paidRows(letter: LetterRequestItem): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const biaya = biayaDenganPpn(letter.biayaKebersihan ?? '');
  if (biaya) rows.push(['Biaya Kebersihan', biaya]);
  const va = (letter.vaBank ?? '').trim();
  if (va) rows.push(['No. VA / Bank', va]);
  return rows;
}

export interface LetterPdfPayload {
  letter: LetterRequestItem;
  logoDataUrl?: string;
}

export function buildLetterPdf(letter: LetterRequestItem, logoDataUrl = PDF_LOGO_DATA_URL): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.setProperties({
    title: `Surat Konfirmasi Event - ${letter.namaEvent || 'Tanpa Judul'}`,
    author: 'Metropolitan Mall Bekasi',
    subject: 'Surat Konfirmasi Pelaksanaan Event',
    keywords: 'surat konfirmasi, event, Metropolitan Mall Bekasi',
    creator: 'Dashboard Event System',
  });

  const tanggalFormatted = formatTanggalSurat(letter.tanggalSurat);
  let y = MARGIN_TOP;

  // ── A1 — kop: logo saja, tanpa nama mall/divisi/alamat di badan ──
  const logoH = 32;
  let kopDrawn = false;
  if (logoDataUrl) {
    const logoW = logoH * (1000 / 289);
    try {
      doc.addImage(logoDataUrl, 'JPEG', MARGIN_X, y, logoW, logoH);
      kopDrawn = true;
    } catch {
      kopDrawn = false;
    }
  }
  if (!kopDrawn) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(20);
    doc.setTextColor(PDF_BRAND.primaryDark);
    doc.text('Metland', MARGIN_X, y + 20);
  }
  y += logoH + 24;

  // ── A3 — meta kiri atas tanpa label, tanpa Perihal (A4) ──
  const tempat = (letter.tempatSurat ?? '').trim();
  const metaDate = tempat && tanggalFormatted ? `${tempat}, ${tanggalFormatted}` : tempat || tanggalFormatted;
  y = drawBlock(doc, metaDate || '-', MARGIN_X, y) + 2;
  y = drawBlock(doc, `No. ${letter.nomorSurat || '-'}`, MARGIN_X, y);
  y += 18;

  // ── A5 — tujuan: nama EO + alamat, tanpa `u.p.` dan tanpa telepon ──
  y = drawBlock(doc, 'Kepada Yth,', MARGIN_X, y) + 2;
  y = drawBlock(doc, letter.namaEO || '-', MARGIN_X, y, {
    style: 'bold',
    maxWidth: CONTENT_W,
  });
  if (letter.alamatEO) {
    y = drawBlock(doc, letter.alamatEO, MARGIN_X, y, { maxWidth: CONTENT_W });
  }
  y += 14;

  // ── A6 — salam + kalimat pembuka dinamis (nama EO + event dicetak tebal) ──
  const introSegments: RichSegment[] = [
    { text: 'Bersama ini kami sampaikan konfirmasi ' },
    { text: letter.namaEO || '……', bold: true },
    { text: ' untuk mengadakan ' },
    { text: letter.namaEvent || '……', bold: true },
    { text: ' di Metropolitan Mall Bekasi sebagai berikut :' },
  ];
  const introHeight = measureRichParagraph(doc, introSegments, CONTENT_W);
  y = ensureSpaceLocal(doc, y, 16 + introHeight + 16);
  y = drawBlock(doc, 'Dengan hormat,', MARGIN_X, y) + 2;
  y = drawRichParagraph(doc, introSegments, MARGIN_X, y, CONTENT_W);
  y += 14;

  // ── A7/A8 — tabel 3 baris (tanpa Nama Event — sudah di kalimat pembuka),
  //     tanpa latar berwarna (A14), plus varian berbayar bila diisi ──
  const tableRows: Array<[string, string]> = [
    ['Lokasi', letter.lokasi || '-'],
    ['Hari / Tanggal Pelaksanaan', letter.hariTanggalPelaksanaan || '-'],
    ['Waktu Pelaksanaan', letter.waktuPelaksanaan || '-'],
    ...paidRows(letter),
  ];

  const labelW = LETTER_LABEL_W_PT;
  const valueW = LETTER_VALUE_W_PT;
  const lineHeight = 11 * LINE_RATIO;
  let measured = 0;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  for (const [, value] of tableRows) {
    measured += Math.max(lineHeight, doc.splitTextToSize(value || '-', valueW).length * lineHeight);
  }
  y = ensureSpaceLocal(doc, y, measured + 8);
  for (const [label, value] of tableRows) {
    y = drawFieldRow(doc, label, value, MARGIN_X, y, labelW, valueW) + 6;
  }
  y += 6;

  // ── A9 — penutup resmi tunggal ──
  const closing = 'Demikian kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.';
  const closingHeight = measureBlock(doc, closing, { maxWidth: CONTENT_W });
  y = ensureSpaceLocal(doc, y, closingHeight + 8);
  y = drawBlock(doc, closing, MARGIN_X, y, { maxWidth: CONTENT_W }) + 34;

  // ── A10/A11 — dua kolom tanda tangan: mall kiri (`Pimpinan Unit`),
  //     EO kanan (`Menyetujui,` + nama + organisasi) ──
  const signatureHeight = 14 * LINE_RATIO * 2 + 20;
  y = ensureSpaceLocal(doc, y, signatureHeight);

  const leftX = MARGIN_X;
  const rightX = MARGIN_X + CONTENT_W / 2;

  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(PDF_BRAND.text);
  doc.text('Hormat kami,', leftX, y);
  doc.text('Menyetujui,', rightX, y);
  y += 14 * LINE_RATIO + 16;

  if (letter.penandatanganNama) {
    doc.setFont(FONT, 'bold');
    doc.text(letter.penandatanganNama, leftX, y, { maxWidth: CONTENT_W / 2 - 16 });
  }
  if (letter.menyetujuiNama) {
    doc.setFont(FONT, 'bold');
    doc.text(letter.menyetujuiNama, rightX, y, { maxWidth: CONTENT_W / 2 - 16 });
  }
  y += 14 * LINE_RATIO + 4;

  doc.setFont(FONT, 'normal');
  if (letter.penandatanganJabatan) {
    doc.text(letter.penandatanganJabatan, leftX, y, { maxWidth: CONTENT_W / 2 - 16 });
  }
  if (letter.menyetujuiOrg) {
    doc.text(letter.menyetujuiOrg, rightX, y, { maxWidth: CONTENT_W / 2 - 16 });
  }

  drawIdentityFooter(doc, logoDataUrl);
  return doc;
}

/** `ensureSpace` dengan margin & cadangan footer resmi surat ini. */
function ensureSpaceLocal(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= A4.h - FOOTER_RESERVE) return y;
  doc.addPage();
  return MARGIN_TOP;
}

/** Tinggi paragraf rich tanpa menggambar — parametri identik `drawRichParagraph`. */
function measureRichParagraph(doc: jsPDF, segments: RichSegment[], maxWidth: number): number {
  const size = 11;
  const spaceW = doc.getTextWidth(' ');
  let lines = 1;
  let lineW = 0;
  for (const segment of segments) {
    doc.setFont(FONT, segment.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    for (const word of segment.text.split(/\s+/).filter(Boolean)) {
      const wordW = doc.getTextWidth(word);
      if (lineW > 0 && lineW + spaceW + wordW > maxWidth) {
        lines += 1;
        lineW = 0;
      }
      lineW += (lineW > 0 ? spaceW : 0) + wordW;
    }
  }
  return lines * size * LINE_RATIO;
}

// ── A2 — footer blok identitas PT (dari scan reference-01) ──
// Logo mall + baris sertifikasi ISO/UNAS + alamat kantor pusat + alamat
// operasional + telp/fax/website, ditutup pita hijau di tepi bawah halaman.

const PT_HQ_LINES = [
  'PT. Metropolitan Land Tbk.',
  'M Gold Tower Office Wing suite ABCGH Lt. 12',
  '& A-H lt. 15, Jl. Letkol M. Moeffreni Moe\u2019min,',
  'Kel. Pekayon Jaya, Kec. Bekasi Selatan, Kota Bekasi 17148',
  'Tel : +6221 2808 7777  Fax : +6221 2808 5555',
  'Website : www.metropolitanland.com',
];

const PT_OPS_LINES = [
  'Kantor Operasional',
  'Metropolitan Mall Bekasi Lt.3',
  'Jl. Letkol M. Moeffreni Moe\u2019min, Kel. Pekayon Jaya',
  'Kec. Bekasi Selatan, Kota Bekasi 17148',
  'Tel : +6221 885 5555  Fax : +6221 884 0283',
  'Website : www.malmetropolitan.com',
];

const UNAS_LINE = 'UNAS is a member of Registrar of Standards (Woldingham) Ltd';

function drawIdentityFooter(doc: jsPDF, logoDataUrl: string | undefined): void {
  const pageW = A4.w;
  const pageH = A4.h;
  const bandH = 12;
  const topY = pageH - FOOTER_RESERVE;

  // Pita hijau di tepi paling bawah halaman.
  doc.setFillColor(PDF_BRAND.primary);
  doc.rect(0, pageH - bandH, pageW, bandH, 'F');

  let footerY = topY + 10;
  const logoH = 26;
  const logoW = logoH * (1000 / 289);
  let textX = MARGIN_X;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', MARGIN_X, footerY, logoW, logoH);
      textX = MARGIN_X + logoW + 14;
    } catch {
      textX = MARGIN_X;
    }
  }

  const colW = (pageW - MARGIN_X - textX) / 2 - 10;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(PDF_BRAND.muted);
  for (let i = 0; i < PT_HQ_LINES.length; i++) {
    const line = PT_HQ_LINES[i] ?? '';
    doc.setFont(FONT, i === 0 ? 'bold' : 'normal');
    doc.text(doc.splitTextToSize(line, colW), textX, footerY + i * 9);
  }
  const opsX = textX + colW + 20;
  for (let i = 0; i < PT_OPS_LINES.length; i++) {
    const line = PT_OPS_LINES[i] ?? '';
    doc.setFont(FONT, i === 0 ? 'bold' : 'normal');
    doc.text(doc.splitTextToSize(line, colW), opsX, footerY + i * 9);
  }

  doc.setFont(FONT, 'normal');
  doc.setFontSize(6);
  doc.setTextColor(PDF_BRAND.faint);
  doc.text(UNAS_LINE, MARGIN_X, pageH - bandH - 6);
}
