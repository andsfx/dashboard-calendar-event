import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EventItem } from '../../types';

// ============================================================
// Jadwal Event PDF — jsPDF port of the old react-pdf document.
// A4 portrait, helvetica base-14, unit pt.
// ============================================================

const COLORS = {
  primary: '#00918e',
  primaryDark: '#007a78',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  paper: '#ffffff',
  rowAlt: '#f8fafc',
  live: '#047857',
  soon: '#b45309',
  past: '#64748b',
};

const STATUS_LABEL: Record<string, string> = {
  ongoing: 'Berlangsung',
  upcoming: 'Akan Datang',
  past: 'Selesai',
  draft: 'Internal',
};

const MARGIN = 40;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

function statusColor(status: string): string {
  if (status === 'ongoing') return COLORS.live;
  if (status === 'upcoming') return COLORS.soon;
  return COLORS.past;
}

function formatDateLine(ev: EventItem): string {
  if (ev.isMultiDay && ev.dateEnd) {
    return `${ev.tanggal || ev.dateStr} – ${ev.dateEnd}`;
  }
  return ev.tanggal || ev.dateStr || '–';
}

function categoriesLine(ev: EventItem): string {
  if (ev.categories?.length) return ev.categories.join(', ');
  return ev.category || '–';
}

function drawStatCard(doc: jsPDF, x: number, y: number, label: string, value: string, valueColor: string): void {
  const w = 90;
  const h = 36;
  doc.setDrawColor(COLORS.border);
  doc.setFillColor(COLORS.paper);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted);
  doc.text(label.toUpperCase(), x + 8, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(valueColor);
  doc.text(value, x + 8, y + 28);
}

function drawFooter(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    const y = PAGE_H - 24;
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y - 8, PAGE_W - MARGIN, y - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLORS.muted);
    doc.text('Metropolitan Mall Bekasi · Event Schedule', MARGIN, y);
    doc.text(`${page} / ${total}`, PAGE_W - MARGIN, y, { align: 'right' });
  }
}

export interface SchedulePdfPayload {
  events: EventItem[];
  generatedAt: string;
}

export function buildSchedulePdf({ events, generatedAt }: SchedulePdfPayload): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: false });
  doc.setProperties({
    title: 'Jadwal Event — Metropolitan Mall Bekasi',
    author: 'Metropolitan Mall Bekasi',
    subject: 'Event Schedule',
  });

  const live = events.filter(e => e.status === 'ongoing').length;
  const soon = events.filter(e => e.status === 'upcoming').length;
  const sorted = [...events].sort(
    (a, b) => a.dateStr.localeCompare(b.dateStr) || a.acara.localeCompare(b.acara),
  );

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.primary);
  doc.text('METROPOLITAN MALL BEKASI', MARGIN, MARGIN + 4, { charSpace: 1.2 });

  doc.setFontSize(18);
  doc.setTextColor(COLORS.text);
  doc.text('Jadwal Event', MARGIN, MARGIN + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.muted);
  doc.text(`Diekspor ${generatedAt} · ${sorted.length} event`, MARGIN, MARGIN + 38);

  doc.setDrawColor(COLORS.primary);
  doc.setLineWidth(2);
  doc.line(MARGIN, MARGIN + 44, PAGE_W - MARGIN, MARGIN + 44);

  // Stat cards: Total / Live / Akan Datang
  const cardsY = MARGIN + 60;
  drawStatCard(doc, MARGIN, cardsY, 'Total', String(sorted.length), COLORS.text);
  drawStatCard(doc, MARGIN + 98, cardsY, 'Live', String(live), COLORS.live);
  drawStatCard(doc, MARGIN + 196, cardsY, 'Akan Datang', String(soon), COLORS.soon);

  if (sorted.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.muted);
    doc.text('Belum ada event untuk diekspor.', PAGE_W / 2, cardsY + 60, { align: 'center' });
    drawFooter(doc);
    return doc;
  }

  autoTable(doc, {
    startY: cardsY + 48,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN + 56, bottom: 48 },
    head: [['Tanggal', 'Jam', 'Acara', 'Lokasi', 'Kategori', 'Status']],
    body: sorted.map(ev => [
      formatDateLine(ev),
      ev.jam || '–',
      ev.eo ? `${ev.acara || '–'}\n${ev.eo}` : ev.acara || '–',
      ev.lokasi || '–',
      categoriesLine(ev),
      STATUS_LABEL[ev.status] ?? ev.status,
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: COLORS.rowAlt },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.16 },
      1: { cellWidth: CONTENT_W * 0.12, textColor: COLORS.muted },
      2: { cellWidth: CONTENT_W * 0.32 },
      3: { cellWidth: CONTENT_W * 0.18, textColor: COLORS.muted },
      4: { cellWidth: CONTENT_W * 0.12, textColor: COLORS.muted },
      5: { cellWidth: CONTENT_W * 0.10, fontStyle: 'bold', fontSize: 7 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const status = sorted[data.row.index]?.status ?? '';
        data.cell.styles.textColor = statusColor(status);
      }
      // Kolom Acara: nama bold + EO baris kedua normal → gambar manual.
      if (data.section === 'body' && data.column.index === 2) {
        const ev = sorted[data.row.index];
        if (ev?.eo) {
          data.cell.styles.minCellHeight = 22;
        }
      }
    },
    didDrawCell(data) {
      // Border-bottom per baris (setara borderBottomWidth di dokumen lama).
      if (data.section === 'body' && data.column.index === 0) {
        doc.setDrawColor(COLORS.border);
        doc.setLineWidth(0.5);
        doc.line(
          MARGIN,
          data.cell.y + data.cell.height,
          PAGE_W - MARGIN,
          data.cell.y + data.cell.height,
        );
      }
    },
    willDrawCell(data) {
      if (data.section === 'body' && data.column.index === 2) {
        const ev = sorted[data.row.index];
        if (ev?.eo) {
          // Nama acara bold; EO baris kedua normal (default draw = semua bold).
          const { x, y } = data.cell;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(COLORS.text);
          doc.text(ev.acara || '–', x + 4, y + 12);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(COLORS.muted);
          doc.text(ev.eo, x + 4, y + 23);
          return false; // suppress default draw
        }
      }
      return true;
    },
  });

  drawFooter(doc);
  return doc;
}
