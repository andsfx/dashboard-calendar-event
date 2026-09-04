import { jsPDF } from 'jspdf';
import type { LetterRequestItem } from '../../types';

// ============================================================
// Surat Konfirmasi Event — jsPDF port of the old react-pdf letter.
// A4 portrait, helvetica base-14, unit pt.
// ============================================================

const BULAN_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const COLORS = {
  primary: '#1e293b',
  text: '#0f172a',
  muted: '#64748b',
  accent: '#0891b2',
  border: '#e2e8f0',
  blockBg: '#f8fafc',
};

const MARGIN_X = 60;
const MARGIN_TOP = 50;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

export function formatTanggalSurat(value: string | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const day = parseInt(match[3] || '1', 10);
  const monthIndex = parseInt(match[2] || '1', 10) - 1;
  const year = match[1] || '';
  const monthName = BULAN_LONG[monthIndex] ?? '';
  return `${day} ${monthName} ${year}`;
}

function line(doc: jsPDF, text: string, x: number, y: number, opts?: {
  size?: number;
  style?: 'normal' | 'bold';
  color?: string;
  maxWidth?: number;
  charSpace?: number;
}): number {
  doc.setFont('helvetica', opts?.style ?? 'normal');
  doc.setFontSize(opts?.size ?? 11);
  doc.setTextColor(opts?.color ?? COLORS.text);
  if (opts?.maxWidth) {
    const lines = doc.splitTextToSize(text, opts.maxWidth);
    doc.text(lines, x, y, { charSpace: opts?.charSpace });
    return lines.length * (opts.size ?? 11) * 1.35;
  }
  doc.text(text, x, y, { charSpace: opts?.charSpace });
  return opts?.size ?? 11 * 1.35;
}

function drawFooter(doc: jsPDF, tanggalFormatted: string): void {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    const y = PAGE_H - 30;
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, y - 10, PAGE_W - MARGIN_X, y - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text(
      `Dokumen ini digenerate otomatis oleh Dashboard Event System · ${tanggalFormatted || new Date().toISOString().slice(0, 10)}`,
      PAGE_W / 2,
      y,
      { align: 'center' },
    );
  }
}

export function buildLetterPdf(letter: LetterRequestItem): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: false });
  doc.setProperties({
    title: `Surat Konfirmasi Event - ${letter.namaEvent || 'Tanpa Judul'}`,
    author: 'Metropolitan Mall Bekasi',
    subject: 'Surat Konfirmasi Pelaksanaan Event',
  });
  const tanggalFormatted = formatTanggalSurat(letter.tanggalSurat);

  let y = MARGIN_TOP;

  // ── Kop Surat ───────────────────────────────────────────────
  // Kotak logo "M"
  doc.setFillColor(COLORS.primary);
  doc.roundedRect(MARGIN_X, y, 56, 56, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor('#ffffff');
  doc.text('M', MARGIN_X + 28, y + 36, { align: 'center' });

  const kopX = MARGIN_X + 56 + 16;
  y += 18;
  y += line(doc, 'METROPOLITAN MALL BEKASI', kopX, y, { size: 16, style: 'bold', color: COLORS.primary, charSpace: 0.5 });
  y += line(doc, 'Marketing & Tenant Relations Division', kopX, y + 2, { size: 10, style: 'bold', color: COLORS.text }) + 2;
  y += line(
    doc,
    'Jl. KH. Noer Ali No.1, Pekayon Jaya, Bekasi Selatan\nTelp. (021) 8243 7000 · www.metropolitanmallbekasi.co.id',
    kopX,
    y + 6,
    { size: 9, color: COLORS.muted, maxWidth: CONTENT_W - 72 },
  );
  const kopBottom = Math.max(y, MARGIN_TOP + 56) + 12;
  doc.setDrawColor(COLORS.primary);
  doc.setLineWidth(2);
  doc.line(MARGIN_X, kopBottom, PAGE_W - MARGIN_X, kopBottom);
  y = kopBottom + 24;

  // ── Metadata Surat ─────────────────────────────────────────
  const metaRows: Array<[string, string]> = [
    ['Nomor', letter.nomorSurat || '—'],
    ['Tanggal', tanggalFormatted || '—'],
    ['Perihal', 'Konfirmasi Pelaksanaan Event'],
  ];
  for (const [label, value] of metaRows) {
    line(doc, label, MARGIN_X, y + 10, { size: 10, color: COLORS.muted });
    line(doc, ':', MARGIN_X + 80, y + 10, { size: 10, color: COLORS.muted });
    line(doc, value, MARGIN_X + 92, y + 10, { size: 10, style: 'bold' });
    y += 16;
  }
  y += 12;

  // ── Pembuka / Kepada ───────────────────────────────────────
  y += line(doc, 'Kepada Yth.', MARGIN_X, y + 11, { size: 11, style: 'bold' }) + 4;
  y += line(doc, letter.namaEO || '—', MARGIN_X, y + 11, { size: 11, style: 'bold' }) + 4;
  if (letter.penanggungJawab) {
    y += line(doc, `u.p. ${letter.penanggungJawab}`, MARGIN_X, y + 11, { size: 10, color: COLORS.muted }) + 2;
  }
  if (letter.alamatEO) {
    y += line(doc, letter.alamatEO, MARGIN_X, y + 11, { size: 10, color: COLORS.muted, maxWidth: CONTENT_W }) + 2;
  }
  if (letter.nomorTelepon) {
    y += line(doc, `Telp. ${letter.nomorTelepon}`, MARGIN_X, y + 11, { size: 10, color: COLORS.muted }) + 2;
  }
  y += 12;

  // ── Body intro ─────────────────────────────────────────────
  y += line(
    doc,
    'Dengan hormat,',
    MARGIN_X,
    y + 12,
    { size: 11, maxWidth: CONTENT_W },
  ) + 6;
  y += line(
    doc,
    'Melalui surat ini kami sampaikan konfirmasi pelaksanaan event yang akan diselenggarakan di Metropolitan Mall Bekasi dengan rincian sebagai berikut:',
    MARGIN_X,
    y + 12,
    { size: 11, maxWidth: CONTENT_W },
  ) + 14;

  // ── Data Event block ───────────────────────────────────────
  const rows: Array<[string, string]> = [
    ['Nama Event', letter.namaEvent || '—'],
    ['Lokasi', letter.lokasi || '—'],
    ['Hari/Tanggal', letter.hariTanggalPelaksanaan || '—'],
    ['Waktu', letter.waktuPelaksanaan || '—'],
  ];
  const hasLoading = Boolean(letter.hariTanggalLoading || letter.waktuLoading);
  if (hasLoading) {
    rows.push(['Hari/Tanggal', letter.hariTanggalLoading || '—'], ['Waktu', letter.waktuLoading || '—']);
  }
  const sectionTitleCount = hasLoading ? 2 : 1;
  const blockHeight = 14 + sectionTitleCount * 18 + rows.length * 15 + 12;
  const blockY = y;

  doc.setFillColor(COLORS.blockBg);
  doc.rect(MARGIN_X + 4, blockY, CONTENT_W - 8, blockHeight, 'F');
  doc.setFillColor(COLORS.accent);
  doc.rect(MARGIN_X + 4, blockY, 3, blockHeight, 'F');

  let by = blockY + 18;
  by += line(doc, 'DATA EVENT', MARGIN_X + 18, by, { size: 10, style: 'bold', color: COLORS.primary, charSpace: 0.3 }) + 6;
  if (hasLoading) {
    // DATA EVENT berisi 4 baris, divider, lalu JADWAL LOADING 2 baris.
    const eventRows = rows.slice(0, 4);
    for (const [label, value] of eventRows) {
      line(doc, label, MARGIN_X + 18, by, { size: 10, color: COLORS.muted });
      line(doc, ':', MARGIN_X + 18 + 150, by, { size: 10, color: COLORS.muted });
      line(doc, value, MARGIN_X + 18 + 158, by, { size: 10, style: 'bold' });
      by += 15;
    }
    by += 8;
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X + 18, by - 8, PAGE_W - MARGIN_X - 18, by - 8);
    by += line(doc, 'JADWAL LOADING', MARGIN_X + 18, by, { size: 10, style: 'bold', color: COLORS.primary, charSpace: 0.3 }) + 6;
    for (const [label, value] of rows.slice(4)) {
      line(doc, label, MARGIN_X + 18, by, { size: 10, color: COLORS.muted });
      line(doc, ':', MARGIN_X + 18 + 150, by, { size: 10, color: COLORS.muted });
      line(doc, value, MARGIN_X + 18 + 158, by, { size: 10, style: 'bold' });
      by += 15;
    }
  } else {
    for (const [label, value] of rows) {
      line(doc, label, MARGIN_X + 18, by, { size: 10, color: COLORS.muted });
      line(doc, ':', MARGIN_X + 18 + 150, by, { size: 10, color: COLORS.muted });
      line(doc, value, MARGIN_X + 18 + 158, by, { size: 10, style: 'bold' });
      by += 15;
    }
  }
  y = blockY + blockHeight + 14;

  // ── Body penutup ───────────────────────────────────────────
  y += line(
    doc,
    'Demikian surat konfirmasi ini kami sampaikan. Mohon agar seluruh persiapan dilakukan sesuai jadwal yang telah disepakati. Untuk koordinasi teknis lebih lanjut, dapat menghubungi Marketing Metropolitan Mall Bekasi pada nomor yang tertera di kop surat.',
    MARGIN_X,
    y + 12,
    { size: 11, maxWidth: CONTENT_W },
  ) + 14;

  y += line(
    doc,
    'Demikian, atas perhatian dan kerja samanya kami ucapkan terima kasih.',
    MARGIN_X,
    y + 12,
    { size: 11, maxWidth: CONTENT_W },
  ) + 26;

  // ── Tanda Tangan ───────────────────────────────────────────
  const sigX = PAGE_W - MARGIN_X - 200;
  const sigCenter = sigX + 100;
  line(doc, 'Hormat kami,', sigCenter, y + 10, { size: 10, color: COLORS.muted, maxWidth: 200 });
  // jabatan di atas garis (urutan visual sumber: title, jabatan, ruang, nama bergaris)
  line(doc, 'Marketing Manager', sigCenter, y + 24, { size: 9, color: COLORS.muted, maxWidth: 200 });
  const nameY = y + 24 + 60;
  doc.setDrawColor(COLORS.primary);
  doc.setLineWidth(1);
  doc.line(sigX + 10, nameY - 12, sigX + 190, nameY - 12);
  line(doc, letter.penanggungJawab || '________________', sigCenter, nameY, { size: 11, style: 'bold', maxWidth: 180 });
  line(doc, 'Metropolitan Mall Bekasi', sigCenter, nameY + 14, { size: 9, color: COLORS.muted, maxWidth: 200 });

  drawFooter(doc, tanggalFormatted);
  return doc;
}
