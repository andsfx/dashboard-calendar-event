import { jsPDF } from 'jspdf';
import type { LetterRequestItem } from '../../types';
import {
  A4,
  LINE_RATIO,
  PDF_BRAND,
  PDF_LOGO_DATA_URL,
  drawPdfFooter,
  formatDateId,
  ensureSpace,
} from './pdfTheme';

// ============================================================
// Surat Konfirmasi Event — A4 portrait, helvetica base-14, unit pt.
//
// Catatan riwayat: dokumen ini dulu tidak pernah `addPage`, dan helper
// `line()` mengembalikan `size ?? 11 * 1.35` — precedence-nya salah
// sehingga tinggi baris yang dikembalikan hanya sebesar font size
// (11 pt, bukan 14.85 pt). Ritme baris jadi tidak teratur dan blok tanda
// tangan bisa keluar halaman tanpa peringatan. Sekarang tinggi baris
// dihitung dari satu rumus (`LINE_RATIO`) dan tiap blok melewati
// `ensureSpace` sebelum digambar.
// ============================================================

const FONT = 'helvetica';
const MARGIN_X = 60;
const MARGIN_TOP = 50;
const CONTENT_W = A4.w - MARGIN_X * 2;

interface TextOptions {
  size?: number;
  style?: 'normal' | 'bold';
  color?: string;
  maxWidth?: number;
  charSpace?: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Gambar satu blok teks pada baseline `y` dan kembalikan Y berikutnya.
 *
 * `leading` = `size * LINE_RATIO`; nilai balik selalu tinggi blok
 * (`jumlah baris × leading`), bukan ukuran font.
 */
function drawBlock(doc: jsPDF, text: string, x: number, y: number, options: TextOptions = {}): number {
  const size = options.size ?? 11;
  const lineHeight = size * LINE_RATIO;
  doc.setFont(FONT, options.style ?? 'normal');
  doc.setFontSize(size);
  doc.setTextColor(options.color ?? PDF_BRAND.text);

  const lines = options.maxWidth ? doc.splitTextToSize(text, options.maxWidth) : [text];
  doc.text(lines, x, y, { charSpace: options.charSpace, align: options.align });
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
  const lineHeight = 10 * LINE_RATIO;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(PDF_BRAND.muted);
  doc.text(label, x, y);
  doc.text(':', x + labelW, y);

  doc.setFont(FONT, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(PDF_BRAND.text);
  const valueLines = doc.splitTextToSize(value || '-', valueW);
  doc.text(valueLines, x + labelW + 8, y);
  return y + Math.max(lineHeight, valueLines.length * lineHeight);
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

  const tanggalFormatted = formatDateId(letter.tanggalSurat);
  let y = MARGIN_TOP;

  // ── Kop surat ─────────────────────────────────────────────
  const logoH = 46;
  let kopTextX = MARGIN_X;
  if (logoDataUrl) {
    const logoW = logoH * (1000 / 289);
    try {
      doc.addImage(logoDataUrl, 'JPEG', MARGIN_X, y, logoW, logoH);
      kopTextX = MARGIN_X + logoW + 16;
    } catch {
      kopTextX = MARGIN_X;
    }
  }

  if (kopTextX === MARGIN_X) {
    // Tanpa logo: kop berbasis teks agar surat tetap berkop.
    doc.setFont(FONT, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(PDF_BRAND.primaryDark);
    doc.text('METROPOLITAN MALL BEKASI', kopTextX, y + 16, { charSpace: 0.5 });
    kopTextX = MARGIN_X;
  }

  doc.setFont(FONT, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(PDF_BRAND.text);
  doc.text('Marketing & Tenant Relations Division', kopTextX, y + 16);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(PDF_BRAND.muted);
  const addressLines = doc.splitTextToSize(
    'Jl. KH. Noer Ali No.1, Pekayon Jaya, Bekasi Selatan\nTelp. (021) 8243 7000 · www.metropolitanmallbekasi.co.id',
    A4.w - MARGIN_X - kopTextX,
  );
  doc.text(addressLines, kopTextX, y + 28);

  const kopBottom = Math.max(y + logoH, y + 28 + addressLines.length * 10) + 10;
  doc.setDrawColor(PDF_BRAND.primary);
  doc.setLineWidth(2);
  doc.line(MARGIN_X, kopBottom, A4.w - MARGIN_X, kopBottom);
  y = kopBottom + 26;

  // ── Metadata surat ────────────────────────────────────────
  const metaRows: Array<[string, string]> = [
    ['Nomor', letter.nomorSurat || '-'],
    ['Tanggal', tanggalFormatted || '-'],
    ['Perihal', 'Konfirmasi Pelaksanaan Event'],
  ];
  for (const [label, value] of metaRows) {
    y = drawFieldRow(doc, label, value, MARGIN_X, y, 80, CONTENT_W - 88) + 6;
  }
  y += 12;

  // ── Tujuan surat ──────────────────────────────────────────
  y = drawBlock(doc, 'Kepada Yth.', MARGIN_X, y, { size: 11, style: 'bold' }) + 2;
  y = drawBlock(doc, letter.namaEO || '-', MARGIN_X, y, {
    size: 11,
    style: 'bold',
    maxWidth: CONTENT_W,
  });
  if (letter.penanggungJawab) {
    y = drawBlock(doc, `u.p. ${letter.penanggungJawab}`, MARGIN_X, y, {
      size: 10,
      color: PDF_BRAND.muted,
      maxWidth: CONTENT_W,
    });
  }
  if (letter.alamatEO) {
    y = drawBlock(doc, letter.alamatEO, MARGIN_X, y, {
      size: 10,
      color: PDF_BRAND.muted,
      maxWidth: CONTENT_W,
    });
  }
  if (letter.nomorTelepon) {
    y = drawBlock(doc, `Telp. ${letter.nomorTelepon}`, MARGIN_X, y, {
      size: 10,
      color: PDF_BRAND.muted,
    });
  }
  y += 14;

  // ── Pembuka ───────────────────────────────────────────────
  const intro = 'Melalui surat ini kami sampaikan konfirmasi pelaksanaan event yang akan diselenggarakan di Metropolitan Mall Bekasi dengan rincian sebagai berikut:';
  const introHeight = measureBlock(doc, intro, { size: 11, maxWidth: CONTENT_W });
  y = ensureSpace(doc, y, 20 + introHeight, {});
  y = drawBlock(doc, 'Dengan hormat,', MARGIN_X, y, { size: 11 }) + 4;
  y = drawBlock(doc, intro, MARGIN_X, y, { size: 11, maxWidth: CONTENT_W }) + 16;

  // ── Blok data event ───────────────────────────────────────
  const eventRows: Array<[string, string]> = [
    ['Nama Event', letter.namaEvent || '-'],
    ['Lokasi', letter.lokasi || '-'],
    ['Hari/Tanggal', letter.hariTanggalPelaksanaan || '-'],
    ['Waktu', letter.waktuPelaksanaan || '-'],
  ];
  const loadingRows: Array<[string, string]> = [];
  if (letter.hariTanggalLoading) loadingRows.push(['Hari/Tanggal', letter.hariTanggalLoading]);
  if (letter.waktuLoading) loadingRows.push(['Waktu', letter.waktuLoading]);

  const labelW = 150;
  const valueW = CONTENT_W - 26 - labelW - 8;
  const fieldGap = 10 * LINE_RATIO + 5;

  // Ukur dulu supaya blok tidak pernah terbelah dua halaman.
  let measured = 24 + 16;
  for (const [, value] of [...eventRows, ...loadingRows]) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    measured += Math.max(fieldGap, doc.splitTextToSize(value || '-', valueW).length * 10 * LINE_RATIO + 5);
  }
  if (loadingRows.length) measured += 24;

  y = ensureSpace(doc, y, measured + 16, {});

  const blockY = y;
  const blockHeight = measured;
  doc.setFillColor(PDF_BRAND.primaryWash);
  doc.rect(MARGIN_X, blockY, CONTENT_W, blockHeight, 'F');
  doc.setFillColor(PDF_BRAND.primary);
  doc.rect(MARGIN_X, blockY, 3, blockHeight, 'F');

  let by = blockY + 20;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(PDF_BRAND.primaryDeep);
  doc.text('DATA EVENT', MARGIN_X + 16, by, { charSpace: 0.3 });
  by += 16;
  for (const [label, value] of eventRows) {
    by = drawFieldRow(doc, label, value, MARGIN_X + 16, by, labelW, valueW) + 5;
  }

  if (loadingRows.length) {
    by += 4;
    doc.setDrawColor(PDF_BRAND.border);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X + 16, by - 4, A4.w - MARGIN_X - 16, by - 4);
    by += 16;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(PDF_BRAND.primaryDeep);
    doc.text('JADWAL LOADING', MARGIN_X + 16, by, { charSpace: 0.3 });
    by += 16;
    for (const [label, value] of loadingRows) {
      by = drawFieldRow(doc, label, value, MARGIN_X + 16, by, labelW, valueW) + 5;
    }
  }

  y = blockY + blockHeight + 18;

  // ── Penutup ───────────────────────────────────────────────
  const closing =
    'Demikian surat konfirmasi ini kami sampaikan. Mohon agar seluruh persiapan dilakukan sesuai jadwal yang telah disepakati. Untuk koordinasi teknis lebih lanjut, dapat menghubungi Marketing Metropolitan Mall Bekasi pada nomor yang tertera di kop surat.';
  const thanks = 'Demikian, atas perhatian dan kerja samanya kami ucapkan terima kasih.';
  const closingHeight =
    measureBlock(doc, closing, { size: 11, maxWidth: CONTENT_W }) +
    measureBlock(doc, thanks, { size: 11, maxWidth: CONTENT_W }) +
    30;
  y = ensureSpace(doc, y, closingHeight, {});
  y = drawBlock(doc, closing, MARGIN_X, y, { size: 11, maxWidth: CONTENT_W }) + 14;
  y = drawBlock(doc, thanks, MARGIN_X, y, { size: 11, maxWidth: CONTENT_W }) + 30;

  // ── Tanda tangan ──────────────────────────────────────────
  // Blok tanda tangan tidak boleh terbelah: ukur seluruh tingginya lebih
  // dahulu (Hormat kami → ruang tanda tangan → garis → nama → jabatan).
  const signatureHeight = 100;
  y = ensureSpace(doc, y, signatureHeight, {});

  const signerName = letter.penanggungJawab || '';
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(PDF_BRAND.muted);
  doc.text('Hormat kami,', A4.w - MARGIN_X, y, { align: 'right' });
  doc.setFontSize(9);
  doc.text('Marketing Manager', A4.w - MARGIN_X, y + 13, { align: 'right' });

  const ruleY = y + 54;
  doc.setDrawColor(PDF_BRAND.ink);
  doc.setLineWidth(0.8);
  doc.line(A4.w - MARGIN_X - 170, ruleY, A4.w - MARGIN_X, ruleY);

  if (signerName) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(PDF_BRAND.text);
    doc.text(signerName, A4.w - MARGIN_X - 85, ruleY + 15, { align: 'center', maxWidth: 170 });
  } else {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(PDF_BRAND.faint);
    doc.text('( ____________________ )', A4.w - MARGIN_X - 85, ruleY + 15, { align: 'center' });
  }
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(PDF_BRAND.muted);
  doc.text('Metropolitan Mall Bekasi', A4.w - MARGIN_X - 85, ruleY + 29, { align: 'center' });

  drawPdfFooter(doc, {
    label: 'Surat Konfirmasi Event · Metropolitan Mall Bekasi',
    margin: MARGIN_X,
  });
  return doc;
}
