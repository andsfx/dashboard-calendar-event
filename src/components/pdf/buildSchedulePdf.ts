import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EventItem } from '../../types';
import {
  A4,
  EVENT_STATUS_LABEL,
  PDF_BRAND,
  PDF_CONTENT_W,
  PDF_LOGO_DATA_URL,
  PDF_MARGIN,
  drawPdfFooter,
  drawPdfHeader,
  ensureSpace,
  eventStatusColor,
  formatDateId,
} from './pdfTheme';

// ============================================================
// Jadwal Event — A4 portrait, helvetica base-14, unit pt.
//
// Bagian dokumen dapat dipilih lewat `sections` supaya pemakai bisa
// mengekspor ringkasan saja, tabel saja, atau lembar kontak EO saja.
// ============================================================

export type SchedulePdfSection = 'summary' | 'table' | 'areas' | 'contacts';

export const SCHEDULE_PDF_SECTIONS: SchedulePdfSection[] = ['summary', 'table', 'areas', 'contacts'];

const CARD_GAP = 8;
const FONT = 'helvetica';

interface ScheduleRow {
  event: EventItem;
  dateLine: string;
  timeLine: string;
  acara: string;
  eo: string;
  lokasi: string;
  kategori: string;
  statusLabel: string;
}

function toRow(ev: EventItem): ScheduleRow {
  const start = ev.tanggal || formatDateId(ev.dateStr);
  const dateLine = ev.isMultiDay && ev.dateEnd
    ? `${start} – ${formatDateId(ev.dateEnd)}`
    : start || '-';
  return {
    event: ev,
    dateLine: dateLine || '-',
    timeLine: ev.jam || '-',
    acara: ev.acara || '-',
    eo: ev.eo || '',
    lokasi: ev.lokasi || '-',
    kategori: ev.categories?.length ? ev.categories.join(', ') : ev.category || '-',
    statusLabel: EVENT_STATUS_LABEL[ev.status] ?? ev.status,
  };
}

function sortEvents(events: EventItem[]): EventItem[] {
  return [...events].sort(
    (a, b) => (a.dateStr || '').localeCompare(b.dateStr || '') || (a.acara || '').localeCompare(b.acara || ''),
  );
}

/**
 * Ukur tinggi sel "Acara" (nama bold + EO baris kedua).
 *
 * autoTable hanya mengukur teks yang diberikan lewat `body`; karena sel ini
 * digambar manual (dua gaya font dalam satu sel), tingginya dihitung di sini
 * dan diteruskan lewat `minCellHeight`. Bug sebelumnya: tinggi sel tetap 22pt
 * sementara teks digambar tanpa wrap sehingga menembus kolom sebelah.
 */
function measureAcaraCell(
  doc: jsPDF,
  acara: string,
  eo: string,
  innerWidth: number,
): { nameLines: string[]; eoLines: string[]; height: number; padding: number } {
  const padding = 5;
  const nameSize = 8;
  const eoSize = 7.5;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(nameSize);
  const nameLines = doc.splitTextToSize(acara, innerWidth);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(eoSize);
  const eoLines = eo ? doc.splitTextToSize(eo, innerWidth) : [];
  const height =
    padding * 2 +
    nameLines.length * nameSize * 1.25 +
    (eoLines.length ? eoLines.length * eoSize * 1.25 + 1.5 : 0);
  return { nameLines, eoLines, height: Math.max(height, 20), padding };
}

function drawStatCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  valueColor: string,
): void {
  const height = 44;
  doc.setDrawColor(PDF_BRAND.border);
  doc.setFillColor(PDF_BRAND.paper);
  doc.roundedRect(x, y, width, height, 3, 3, 'FD');
  doc.setFillColor(valueColor);
  doc.roundedRect(x, y, 3, height, 1.5, 1.5, 'F');

  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(PDF_BRAND.muted);
  doc.text(label.toUpperCase(), x + 10, y + 15, { charSpace: 0.4 });

  doc.setFont(FONT, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(valueColor);
  doc.text(value, x + 10, y + 34);
}

/** Baris tabel utama jadwal. */
function drawScheduleTable(doc: jsPDF, rows: ScheduleRow[], startY: number): void {
  const innerAcara = PDF_CONTENT_W * 0.3 - 8;
  const widths = [0.15, 0.11, 0.3, 0.17, 0.14, 0.13];

  autoTable(doc, {
    startY,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN, top: PDF_MARGIN + 40, bottom: 56 },
    // Baris yang terbelah dua halaman meninggalkan fragmen tanpa konteks.
    rowPageBreak: 'avoid',
    head: [['Tanggal', 'Jam', 'Acara', 'Lokasi', 'Kategori', 'Status']],
    body: rows.map((row) => [
      row.dateLine,
      row.timeLine,
      row.eo ? `${row.acara}\n${row.eo}` : row.acara,
      row.lokasi,
      row.kategori,
      row.statusLabel,
    ]),
    styles: {
      font: FONT,
      fontSize: 8,
      textColor: PDF_BRAND.text,
      lineColor: PDF_BRAND.border,
      lineWidth: 0,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      valign: 'top',
    },
    headStyles: {
      fillColor: PDF_BRAND.primaryDark,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: 7.5,
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: PDF_BRAND.rowAlt },
    columnStyles: {
      0: { cellWidth: PDF_CONTENT_W * widths[0]!, fontStyle: 'bold' },
      1: { cellWidth: PDF_CONTENT_W * widths[1]!, textColor: PDF_BRAND.muted },
      2: { cellWidth: PDF_CONTENT_W * widths[2]! },
      3: { cellWidth: PDF_CONTENT_W * widths[3]!, textColor: PDF_BRAND.muted },
      4: { cellWidth: PDF_CONTENT_W * widths[4]!, textColor: PDF_BRAND.muted },
      5: { cellWidth: PDF_CONTENT_W * widths[5]!, fontStyle: 'bold', fontSize: 7.5 },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const row = rows[data.row.index];
      if (!row) return;
      if (data.column.index === 5) {
        data.cell.styles.textColor = eventStatusColor(row.event.status);
      }
      if (data.column.index === 2 && row.eo) {
        const measured = measureAcaraCell(doc, row.acara, row.eo, innerAcara);
        data.cell.styles.minCellHeight = measured.height;
      }
    },
    willDrawCell(data) {
      if (data.section !== 'body' || data.column.index !== 2) return true;
      const row = rows[data.row.index];
      if (!row?.eo) return true;

      const measured = measureAcaraCell(doc, row.acara, row.eo, innerAcara);
      const x = data.cell.x + 4;
      let y = data.cell.y + measured.padding + 8;

      doc.setFont(FONT, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(PDF_BRAND.text);
      for (const line of measured.nameLines) {
        doc.text(line, x, y);
        y += 8 * 1.25;
      }
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(PDF_BRAND.muted);
      for (const line of measured.eoLines) {
        doc.text(line, x, y);
        y += 7.5 * 1.25;
      }
      return false;
    },
  });
}

/** Agenda dikelompokkan per lokasi/area — tiap PIC area membaca bagiannya sendiri. */
function drawAreaAgenda(doc: jsPDF, rows: ScheduleRow[], startY: number): number {
  const groups = new Map<string, ScheduleRow[]>();
  for (const row of rows) {
    const key = row.lokasi || 'Tanpa lokasi';
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'id'));

  let y = startY;
  for (const [area, items] of sortedGroups) {
    y = ensureSpace(doc, y, 44, {});
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(PDF_BRAND.ink);
    doc.text(area, PDF_MARGIN, y);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(PDF_BRAND.muted);
    doc.text(`${items.length} event`, PDF_MARGIN + PDF_CONTENT_W, y, { align: 'right' });
    doc.setDrawColor(PDF_BRAND.primary);
    doc.setLineWidth(1);
    doc.line(PDF_MARGIN, y + 4, PDF_MARGIN + PDF_CONTENT_W, y + 4);
    y += 18;

    for (const item of items) {
      y = ensureSpace(doc, y, 26, {});
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(PDF_BRAND.text);
      const titleLines = doc.splitTextToSize(item.acara, PDF_CONTENT_W - 170);
      doc.text(titleLines, PDF_MARGIN, y);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(PDF_BRAND.muted);
      doc.text(`${item.dateLine} · ${item.timeLine}`, PDF_MARGIN + PDF_CONTENT_W, y, { align: 'right' });
      y += titleLines.length * 10 + 6;
    }
    y += 8;
  }
  return y;
}

/**
 * Lembar kontak EO — daftar penyelenggara untuk koordinasi teknis.
 *
 * Kolom PIC & Telepon hanya muncul bila datanya ada: API publik sudah
 * menghapus PII (`pic`/`phone`) sebelum sampai ke klien, jadi ekspor dari
 * halaman publik tidak boleh menampilkan dua kolom kosong. Bila tidak ada
 * EO maupun PIC/telepon sama sekali, lembar ini tidak digambar (lihat
 * `hasContacts`).
 */
const EO_CONTACT_FIXED_COL = 0.34;

/**
 * Header + baris + lebar kolom lembar kontak.
 *
 * Kolom PIC/Telepon hanya ikut bila datanya ada — API publik sudah menghapus
 * PII sebelum sampai klien, sehingga tanpa keduanya tabel hanya punya tiga
 * kolom. Diekspor agar jumlah kolom flex bisa diuji tanpa merender PDF.
 */
export function buildContactTable(contacts: ScheduleRow[]): {
  head: string[];
  body: string[][];
  columnStyles: Record<number, { cellWidth: number; textColor?: string }>;
} {
  const hasPic = contacts.some((row) => row.event.pic);
  const hasPhone = contacts.some((row) => row.event.phone);

  const head = ['Acara', 'Tanggal', 'Penyelenggara'];
  const body: string[][] = contacts.map((row) => [row.acara, row.dateLine, row.eo || '-']);
  if (hasPic) {
    head.push('PIC');
    contacts.forEach((row, index) => body[index]?.push(row.event.pic || '-'));
  }
  if (hasPhone) {
    head.push('Telepon');
    contacts.forEach((row, index) => body[index]?.push(row.event.phone || '-'));
  }

  // Jumlah kolom flex = semua kolom selain "Acara". Dulu dipatok
  // `hasPic && hasPhone ? 4 : 3`, jadi saat hanya ada kolom EO (kasus normal
  // untuk ekspor publik — PII sudah dihapus server) sisa lebar dibagi 3 padahal
  // hanya 2 kolom yang ada: tabel tergambar 402 pt dari 515 pt (78%), dan
  // jspdf-autotable memperingatkan 113 pt tidak muat.
  const flexCount = head.length - 1;
  const perFlex = (1 - EO_CONTACT_FIXED_COL) / flexCount;
  const columnStyles: Record<number, { cellWidth: number; textColor?: string }> = {
    0: { cellWidth: PDF_CONTENT_W * EO_CONTACT_FIXED_COL },
  };
  for (let index = 1; index < head.length; index += 1) {
    columnStyles[index] = {
      cellWidth: PDF_CONTENT_W * perFlex,
      ...(index === 1 ? { textColor: PDF_BRAND.muted } : {}),
      ...(index === head.length - 1 && head[index] === 'Telepon' ? { textColor: PDF_BRAND.muted } : {}),
    };
  }
  return { head, body, columnStyles };
}

function drawEoContacts(doc: jsPDF, rows: ScheduleRow[], startY: number): void {
  // Pemanggil hanya memanggil ini bila ada EO/PIC/telepon sama sekali — lihat
  // pemeriksaan `hasContacts` di `buildSchedulePdf`.
  const contacts = rows.filter((row) => row.eo || row.event.pic || row.event.phone);
  const { head, body, columnStyles } = buildContactTable(contacts);

  autoTable(doc, {
    startY,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN, top: PDF_MARGIN + 40, bottom: 56 },
    rowPageBreak: 'avoid',
    head: [head],
    body,
    styles: {
      font: FONT,
      fontSize: 8,
      textColor: PDF_BRAND.text,
      lineWidth: 0,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    headStyles: {
      fillColor: PDF_BRAND.primaryWash,
      textColor: PDF_BRAND.primaryDeep,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: PDF_BRAND.rowAlt },
    columnStyles,
  });
}

function drawSectionHeading(doc: jsPDF, title: string, subtitle: string, y: number): number {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(PDF_BRAND.ink);
  doc.text(title, PDF_MARGIN, y);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(PDF_BRAND.muted);
  doc.text(subtitle, PDF_MARGIN + PDF_CONTENT_W, y, { align: 'right' });
  doc.setDrawColor(PDF_BRAND.border);
  doc.setLineWidth(0.5);
  doc.line(PDF_MARGIN, y + 5, PDF_MARGIN + PDF_CONTENT_W, y + 5);
  return y + 20;
}

export interface SchedulePdfPayload {
  events: EventItem[];
  generatedAt: string;
  /** Bagian yang digambar; default seluruh bagian. */
  sections?: SchedulePdfSection[];
  /** Logo data URL; kosong → kop berbasis teks. */
  logoDataUrl?: string;
}

export function buildSchedulePdf({
  events,
  generatedAt,
  sections = SCHEDULE_PDF_SECTIONS,
  logoDataUrl = PDF_LOGO_DATA_URL,
}: SchedulePdfPayload): jsPDF {
  const enabled = new Set(sections);
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.setProperties({
    title: 'Jadwal Event - Metropolitan Mall Bekasi',
    author: 'Metropolitan Mall Bekasi',
    subject: 'Jadwal Event',
    keywords: 'jadwal, event, Metropolitan Mall Bekasi',
    creator: 'Dashboard Event System',
  });

  const sorted = sortEvents(events);
  const rows = sorted.map(toRow);
  const live = sorted.filter((event) => event.status === 'ongoing').length;
  const soon = sorted.filter((event) => event.status === 'upcoming').length;
  const past = sorted.filter((event) => event.status === 'past').length;

  let y = drawPdfHeader(doc, {
    title: 'Jadwal Event',
    subtitle: 'Metropolitan Mall Bekasi',
    meta: `Diekspor ${generatedAt} · ${sorted.length} event`,
    logoDataUrl,
  });

  if (enabled.has('summary')) {
    doc.outline.add(null, 'Ringkasan', { pageNumber: doc.getNumberOfPages() });
    const cardW = (PDF_CONTENT_W - CARD_GAP * 3) / 4;
    drawStatCard(doc, PDF_MARGIN, y, cardW, 'Total Event', String(sorted.length), PDF_BRAND.ink);
    drawStatCard(doc, PDF_MARGIN + (cardW + CARD_GAP), y, cardW, 'Berlangsung', String(live), PDF_BRAND.live);
    drawStatCard(doc, PDF_MARGIN + (cardW + CARD_GAP) * 2, y, cardW, 'Akan Datang', String(soon), PDF_BRAND.soon);
    drawStatCard(doc, PDF_MARGIN + (cardW + CARD_GAP) * 3, y, cardW, 'Selesai', String(past), PDF_BRAND.past);
    y += 64;
  }

  if (sorted.length === 0) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(PDF_BRAND.muted);
    doc.text('Belum ada event untuk diekspor.', A4.w / 2, y + 24, { align: 'center' });
    drawPdfFooter(doc, { label: 'Metropolitan Mall Bekasi · Jadwal Event' });
    return doc;
  }

  if (enabled.has('table')) {
    y = drawSectionHeading(doc, 'Tabel Jadwal', `${sorted.length} event`, y);
    doc.outline.add(null, 'Tabel Jadwal', { pageNumber: doc.getNumberOfPages() });
    drawScheduleTable(doc, rows, y);
    y = doc.lastAutoTable.finalY + 24;
  }

  if (enabled.has('areas')) {
    y = ensureSpace(doc, y, 60, {});
    y = drawSectionHeading(doc, 'Agenda per Area', 'dikelompokkan menurut lokasi', y);
    doc.outline.add(null, 'Agenda per Area', { pageNumber: doc.getNumberOfPages() });
    y = drawAreaAgenda(doc, rows, y);
  }

  if (enabled.has('contacts')) {
    // Tidak ada EO/PIC/telepon → jangan buka lembar kosong. Pemicunya nyata:
    // ekspor dari halaman publik (`/events`) sudah kehilangan PII sebelum
    // sampai klien, jadi bila sekaligus tidak ada EO, satu halaman penuh hanya
    // berisi "Belum ada data penyelenggara".
    const hasContacts = rows.some((row) => row.eo || row.event.pic || row.event.phone);
    if (hasContacts) {
      // Lembar kontak selalu mulai di halaman baru: dipakai berdiri sendiri
      // oleh tim operasional, bukan dibaca menyambung dari tabel.
      doc.addPage();
      doc.outline.add(null, 'Kontak Penyelenggara', { pageNumber: doc.getNumberOfPages() });
      const contactsY = drawSectionHeading(
        doc,
        'Kontak Penyelenggara',
        'untuk koordinasi teknis',
        PDF_MARGIN,
      );
      drawEoContacts(doc, rows, contactsY);
    }
  }

  drawPdfFooter(doc, { label: 'Metropolitan Mall Bekasi · Jadwal Event' });
  return doc;
}
