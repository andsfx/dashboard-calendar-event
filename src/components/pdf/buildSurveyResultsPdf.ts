import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DistMap, ResultsAggregate, ResultsFilter } from '../../utils/tenantSurveyResultsAggregate';

// ============================================================
// Hasil Evaluasi Tenant — jsPDF port of the old react-pdf document.
// A4 portrait, helvetica base-14, unit pt. Konten mengalir antar halaman.
// ============================================================

const COLORS = {
  primary: '#0f766e',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  head: '#f1f5f9',
};

const MARGIN = 40;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_BOTTOM = PAGE_H - 40;
const FOOTER_Y = PAGE_H - 20;

export interface TenantSurveyResultsPdfPayload {
  aggregate: ResultsAggregate;
  filter: ResultsFilter;
  eventLabel: string;
  generatedAt: string;
  generatedBy?: string;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 4, PAGE_W - MARGIN, y + 4);
  return y + 12;
}

function distTable(doc: jsPDF, title: string, dist: DistMap, startY: number): number {
  let y = drawSectionTitle(doc, title, startY);
  const total = Object.values(dist.counts).reduce((a, b) => a + b, 0) || 1;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 40 },
    head: [['Kategori', 'Jumlah', 'Persen']],
    body: dist.labels.map((label) => {
      const n = dist.counts[label] || 0;
      const pct = Math.round((n / total) * 100);
      return [label, String(n), `${pct}%`];
    }),
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: COLORS.text,
      lineWidth: 0,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    },
    headStyles: { fillColor: COLORS.head, textColor: COLORS.text, lineWidth: { bottom: 1 } as unknown as number },
    columnStyles: {
      0: { cellWidth: (PAGE_W - MARGIN * 2) * 0.55 },
      1: { cellWidth: (PAGE_W - MARGIN * 2) * 0.2 },
      2: { cellWidth: (PAGE_W - MARGIN * 2) * 0.25 },
    },
    didDrawCell(data) {
      if (data.section === 'head' || data.section === 'body') {
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
  });
  return doc.lastAutoTable.finalY + 14;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > CONTENT_BOTTOM) {
    doc.addPage('a4', 'portrait');
    return MARGIN;
  }
  return y;
}

function drawKpis(doc: jsPDF, a: ResultsAggregate, y: number): number {
  const kpis: Array<[string, string]> = [
    ['Total Submisi (v3)', String(a.total)],
    ['Tenant yang sudah isi', String(a.uniqueGerai)],
    ['Traffic Positif', `${a.trafficPosPct}%`],
    ['Sales Positif', `${a.salesPosPct}%`],
  ];
  const gap = 8;
  const w = (PAGE_W - MARGIN * 2 - gap * 3) / 4;
  kpis.forEach(([label, value], i) => {
    const x = MARGIN + i * (w + gap);
    doc.setDrawColor(COLORS.border);
    doc.setFillColor('#ffffff');
    doc.roundedRect(x, y, w, 40, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text(label, x + 8, y + 13);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(COLORS.text);
    doc.text(value, x + 8, y + 31);
  });
  return y + 54;
}

function drawFooterAll(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text('Internal — Tenant Relation · tanpa data PIC', MARGIN, FOOTER_Y);
    doc.text(`${page} / ${total}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
  }
}

export function buildSurveyResultsPdf(payload: TenantSurveyResultsPdfPayload): jsPDF {
  const { aggregate: a, filter, eventLabel, generatedAt, generatedBy } = payload;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: false });
  doc.setProperties({
    title: 'Hasil Evaluasi Tenant',
    author: 'Metropolitan Mall Bekasi',
    subject: 'Hasil Evaluasi Tenant',
  });

  let y = MARGIN;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLORS.primary);
  doc.text('Hasil Evaluasi Tenant', MARGIN, y + 12);
  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.muted);
  doc.text('Metropolitan Mall Bekasi · Internal Tenant Relation', MARGIN, y);
  y += 16;

  doc.setFontSize(8);
  doc.text(`Event: ${eventLabel}`, MARGIN, y); y += 11;
  doc.text(
    `Periode: ${filter.dateFrom || '—'} s/d ${filter.dateTo || '—'} · Zona: ${filter.zona === 'all' ? 'Semua' : filter.zona} · Kategori: ${filter.kategori === 'all' ? 'Semua' : filter.kategori} · Status: ${filter.status === 'all' ? 'submitted+reviewed' : filter.status}`,
    MARGIN,
    y,
  );
  y += 11;
  doc.text(`Dibuat: ${generatedAt}${generatedBy ? ` · ${generatedBy}` : ''}`, MARGIN, y);
  y += 20;

  y = drawKpis(doc, a, y + 4);

  y = distTable(doc, 'Distribusi Traffic', a.trafficDist, y);
  y = distTable(doc, 'Distribusi Sales', a.salesDist, y);

  y = ensureSpace(doc, y, 120);
  y = distTable(doc, 'Distribusi Kategori', a.kategoriDist, y);
  y = distTable(doc, 'Distribusi Zona', a.zonaDist, y);

  // Top Gerai
  y = ensureSpace(doc, y, 80);
  y = drawSectionTitle(doc, 'Top Gerai (traffic + sales positif)', y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 40 },
    head: [['Gerai', 'N', 'Traffic+', 'Sales+', 'Skor']],
    body: a.topGerai.map(g => [g.nama_gerai, String(g.count), String(g.trafficPos), String(g.salesPos), String(g.score)]),
    styles: { font: 'helvetica', fontSize: 8, textColor: COLORS.text, lineWidth: 0, cellPadding: 3 },
    headStyles: { fillColor: COLORS.head, textColor: COLORS.text },
    columnStyles: {
      0: { cellWidth: (PAGE_W - MARGIN * 2) * 0.4 },
      1: { cellWidth: (PAGE_W - MARGIN * 2) * 0.15 },
      2: { cellWidth: (PAGE_W - MARGIN * 2) * 0.15 },
      3: { cellWidth: (PAGE_W - MARGIN * 2) * 0.15 },
      4: { cellWidth: (PAGE_W - MARGIN * 2) * 0.15 },
    },
  });
  y = doc.lastAutoTable.finalY + 14;
  if (a.topGerai.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text('Tidak ada data', MARGIN, y);
    y += 14;
  }

  // Cross-tab
  y = ensureSpace(doc, y, 80);
  y = drawSectionTitle(doc, 'Cross-tab Kategori × Sales (top 20)', y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 40 },
    head: [['Kategori', 'Sales', 'N']],
    body: a.crossTab.slice(0, 20).map(c => [c.kategori, c.sales, String(c.count)]),
    styles: { font: 'helvetica', fontSize: 8, textColor: COLORS.text, lineWidth: 0, cellPadding: 3 },
    headStyles: { fillColor: COLORS.head, textColor: COLORS.text },
    columnStyles: {
      0: { cellWidth: (PAGE_W - MARGIN * 2) * 0.4 },
      1: { cellWidth: (PAGE_W - MARGIN * 2) * 0.4 },
      2: { cellWidth: (PAGE_W - MARGIN * 2) * 0.2 },
    },
  });
  y = doc.lastAutoTable.finalY + 14;
  if (a.crossTab.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text('Tidak ada data', MARGIN, y);
    y += 14;
  }

  // Cuplikan Feedback
  y = ensureSpace(doc, y, 60);
  y = drawSectionTitle(doc, 'Cuplikan Feedback (maks 30)', y);
  if (a.feedback.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text('Tidak ada feedback teks', MARGIN, y);
  } else {
    for (const f of a.feedback.slice(0, 30)) {
      y = ensureSpace(doc, y, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(COLORS.text);
      doc.text(f.gerai, MARGIN, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.text);
      const wrapped = doc.splitTextToSize(f.text, PAGE_W - MARGIN * 2);
      doc.text(wrapped, MARGIN, y + 18);
      const itemH = 18 + wrapped.length * 10 + 8;
      doc.setDrawColor(COLORS.border);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y + itemH - 4, PAGE_W - MARGIN, y + itemH - 4);
      y += itemH + 4;
    }
  }

  drawFooterAll(doc);
  return doc;
}
