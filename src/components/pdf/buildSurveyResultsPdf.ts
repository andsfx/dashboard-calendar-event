import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DistMap, ResultsAggregate, ResultsFilter } from '../../utils/tenantSurveyResultsAggregate';
import {
  PDF_BRAND,
  PDF_CONTENT_W,
  PDF_LOGO_DATA_URL,
  PDF_MARGIN,
  SURVEY_STATUS_LABEL,
  drawPdfFooter,
  drawPdfHeader,
  ensureSpace,
  formatDateId,
} from './pdfTheme';

// ============================================================
// Hasil Evaluasi Tenant — A4 portrait, konten mengalir antar halaman.
//
// Bagian dokumen dapat dipilih supaya ringkasan eksekutif (KPI saja)
// tidak selalu membawa serta seluruh lampiran distribusi.
// ============================================================

export type SurveyPdfSection = 'kpi' | 'distribution' | 'topGerai' | 'crossTab' | 'feedback';

export const SURVEY_PDF_SECTIONS: SurveyPdfSection[] = ['kpi', 'distribution', 'topGerai', 'crossTab', 'feedback'];

const FONT = 'helvetica';

export interface TenantSurveyResultsPdfPayload {
  aggregate: ResultsAggregate;
  filter: ResultsFilter;
  eventLabel: string;
  generatedAt: string;
  generatedBy?: string;
  sections?: SurveyPdfSection[];
  logoDataUrl?: string;
}

function drawSectionTitle(doc: jsPDF, title: string, subtitle: string, y: number): number {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(PDF_BRAND.ink);
  doc.text(title, PDF_MARGIN, y);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(PDF_BRAND.muted);
  doc.text(subtitle, PDF_MARGIN + PDF_CONTENT_W, y, { align: 'right' });
  doc.setDrawColor(PDF_BRAND.border);
  doc.setLineWidth(0.5);
  doc.line(PDF_MARGIN, y + 5, PDF_MARGIN + PDF_CONTENT_W, y + 5);
  return y + 18;
}

/** Tabel distribusi dengan bar proporsi — angka telanjang sulit dibaca cepat. */
function drawDistribution(doc: jsPDF, title: string, dist: DistMap, startY: number): number {
  const total = Object.values(dist.counts).reduce((sum, value) => sum + value, 0) || 1;
  let y = drawSectionTitle(doc, title, `n = ${total}`, startY);

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN, top: PDF_MARGIN + 40, bottom: 56 },
    rowPageBreak: 'avoid',
    head: [['Jawaban', 'Jumlah', 'Persen', 'Proporsi']],
    body: dist.labels.map((label) => {
      const count = dist.counts[label] ?? 0;
      return [label, String(count), `${Math.round((count / total) * 100)}%`, ''];
    }),
    styles: {
      font: FONT,
      fontSize: 8.5,
      textColor: PDF_BRAND.text,
      lineWidth: 0,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    headStyles: {
      fillColor: PDF_BRAND.primaryWash,
      textColor: PDF_BRAND.primaryDeep,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: PDF_BRAND.rowAlt },
    columnStyles: {
      0: { cellWidth: PDF_CONTENT_W * 0.4 },
      1: { cellWidth: PDF_CONTENT_W * 0.14, halign: 'right' },
      2: { cellWidth: PDF_CONTENT_W * 0.14, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: PDF_CONTENT_W * 0.32 },
    },
    didDrawCell(data) {
      if (data.section !== 'body' || data.column.index !== 3) return;
      const label = dist.labels[data.row.index];
      if (label === undefined) return;
      const count = dist.counts[label] ?? 0;
      const ratio = count / total;
      const barW = (data.cell.width - 10) * ratio;
      if (barW <= 0) return;
      const barY = data.cell.y + data.cell.height / 2 - 3.5;
      doc.setFillColor(PDF_BRAND.primaryWash);
      doc.rect(data.cell.x + 5, barY, data.cell.width - 10, 7, 'F');
      doc.setFillColor(PDF_BRAND.primary);
      doc.rect(data.cell.x + 5, barY, barW, 7, 'F');
    },
  });
  return (doc.lastAutoTable?.finalY ?? y) + 16;
}

/** Kartu KPI ringkas — dipakai untuk ringkasan eksekutif. */
function drawKpis(doc: jsPDF, aggregate: ResultsAggregate, y: number): number {
  const kpis: Array<[string, string, string]> = [
    ['Total Submisi', String(aggregate.total), PDF_BRAND.ink],
    ['Tenant Mengisi', String(aggregate.uniqueGerai), PDF_BRAND.ink],
    ['Traffic Positif', `${aggregate.trafficPosPct}%`, PDF_BRAND.live],
    ['Sales Positif', `${aggregate.salesPosPct}%`, PDF_BRAND.live],
  ];
  const gap = 8;
  const width = (PDF_CONTENT_W - gap * 3) / 4;
  kpis.forEach(([label, value, color], index) => {
    const x = PDF_MARGIN + index * (width + gap);
    doc.setDrawColor(PDF_BRAND.border);
    doc.setFillColor(PDF_BRAND.paper);
    doc.roundedRect(x, y, width, 46, 3, 3, 'FD');
    doc.setFillColor(color);
    doc.roundedRect(x, y, 3, 46, 1.5, 1.5, 'F');
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_BRAND.muted);
    doc.text(label.toUpperCase(), x + 10, y + 16, { charSpace: 0.4 });
    doc.setFont(FONT, 'bold');
    doc.setFontSize(17);
    doc.setTextColor(color);
    doc.text(value, x + 10, y + 36);
  });
  return y + 60;
}

function drawTable(
  doc: jsPDF,
  head: string[],
  body: string[][],
  startY: number,
  columnStyles: Record<number, { cellWidth: number; textColor?: string; halign?: 'left' | 'right'; fontStyle?: 'normal' | 'bold' }>,
): number {
  autoTable(doc, {
    startY,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN, top: PDF_MARGIN + 40, bottom: 56 },
    rowPageBreak: 'avoid',
    head: [head],
    body,
    styles: {
      font: FONT,
      fontSize: 8.5,
      textColor: PDF_BRAND.text,
      lineWidth: 0,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
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
  return (doc.lastAutoTable?.finalY ?? startY) + 16;
}

export function buildSurveyResultsPdf(payload: TenantSurveyResultsPdfPayload): jsPDF {
  const {
    aggregate,
    filter,
    eventLabel,
    generatedAt,
    generatedBy,
    sections = SURVEY_PDF_SECTIONS,
    logoDataUrl = PDF_LOGO_DATA_URL,
  } = payload;
  const enabled = new Set(sections);

  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.setProperties({
    title: 'Hasil Evaluasi Tenant',
    author: 'Metropolitan Mall Bekasi',
    subject: 'Hasil Evaluasi Tenant',
    keywords: 'evaluasi tenant, survey, Metropolitan Mall Bekasi',
    creator: 'Dashboard Event System',
  });

  // Periode & status memakai label Indonesia; nilai enum mentah
  // ("submitted+reviewed") tidak boleh muncul di dokumen cetak.
  const periode = filter.dateFrom || filter.dateTo
    ? `${filter.dateFrom ? formatDateId(filter.dateFrom) : '-'} s/d ${filter.dateTo ? formatDateId(filter.dateTo) : '-'}`
    : 'Semua periode';
  const filterLine = [
    `Periode: ${periode}`,
    `Zona: ${!filter.zona || filter.zona === 'all' ? 'Semua' : filter.zona}`,
    `Kategori: ${!filter.kategori || filter.kategori === 'all' ? 'Semua' : filter.kategori}`,
    `Status: ${SURVEY_STATUS_LABEL[filter.status] ?? filter.status}`,
  ].join(' · ');

  let y = drawPdfHeader(doc, {
    title: 'Hasil Evaluasi Tenant',
    subtitle: `Event: ${eventLabel}`,
    meta: `${filterLine}\nDibuat: ${generatedAt}${generatedBy ? ` · ${generatedBy}` : ''}`,
    logoDataUrl,
  });
  y += 4;

  if (enabled.has('kpi')) {
    doc.outline.add(null, 'Ringkasan KPI', { pageNumber: doc.getNumberOfPages() });
    y = drawKpis(doc, aggregate, y);
  }

  if (enabled.has('distribution')) {
    doc.outline.add(null, 'Distribusi Jawaban', { pageNumber: doc.getNumberOfPages() });
    y = drawDistribution(doc, 'Distribusi Traffic', aggregate.trafficDist, y);
    y = drawDistribution(doc, 'Distribusi Sales', aggregate.salesDist, y);
    y = ensureSpace(doc, y, 140, {});
    y = drawDistribution(doc, 'Distribusi Kategori', aggregate.kategoriDist, y);
    y = ensureSpace(doc, y, 140, {});
    y = drawDistribution(doc, 'Distribusi Zona', aggregate.zonaDist, y);
  }

  if (enabled.has('topGerai')) {
    y = ensureSpace(doc, y, 90, {});
    y = drawSectionTitle(doc, 'Top Gerai', 'diurutkan dari traffic + sales positif', y);
    doc.outline.add(null, 'Top Gerai', { pageNumber: doc.getNumberOfPages() });
    if (aggregate.topGerai.length === 0) {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(PDF_BRAND.muted);
      doc.text('Tidak ada data.', PDF_MARGIN, y);
      y += 18;
    } else {
      y = drawTable(
        doc,
        ['Gerai', 'Submisi', 'Traffic+', 'Sales+', 'Skor'],
        aggregate.topGerai.map((gerai) => [
          gerai.nama_gerai,
          String(gerai.count),
          String(gerai.trafficPos),
          String(gerai.salesPos),
          String(gerai.score),
        ]),
        y,
        {
          0: { cellWidth: PDF_CONTENT_W * 0.36 },
          1: { cellWidth: PDF_CONTENT_W * 0.16, halign: 'right' },
          2: { cellWidth: PDF_CONTENT_W * 0.16, halign: 'right', textColor: PDF_BRAND.muted },
          3: { cellWidth: PDF_CONTENT_W * 0.16, halign: 'right', textColor: PDF_BRAND.muted },
          4: { cellWidth: PDF_CONTENT_W * 0.16, halign: 'right', fontStyle: 'bold' },
        },
      );
    }
  }

  if (enabled.has('crossTab')) {
    y = ensureSpace(doc, y, 90, {});
    y = drawSectionTitle(doc, 'Cross-tab Kategori × Sales', 'maksimal 20 baris teratas', y);
    doc.outline.add(null, 'Cross-tab', { pageNumber: doc.getNumberOfPages() });
    if (aggregate.crossTab.length === 0) {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(PDF_BRAND.muted);
      doc.text('Tidak ada data.', PDF_MARGIN, y);
      y += 18;
    } else {
      y = drawTable(
        doc,
        ['Kategori', 'Sales', 'Jumlah'],
        aggregate.crossTab.slice(0, 20).map((row) => [row.kategori, row.sales, String(row.count)]),
        y,
        {
          0: { cellWidth: PDF_CONTENT_W * 0.44 },
          1: { cellWidth: PDF_CONTENT_W * 0.4, textColor: PDF_BRAND.muted },
          2: { cellWidth: PDF_CONTENT_W * 0.16, halign: 'right' },
        },
      );
    }
  }

  if (enabled.has('feedback')) {
    y = ensureSpace(doc, y, 60, {});
    y = drawSectionTitle(doc, 'Cuplikan Feedback', 'maksimal 30 komentar', y);
    doc.outline.add(null, 'Cuplikan Feedback', { pageNumber: doc.getNumberOfPages() });

    if (aggregate.feedback.length === 0) {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(PDF_BRAND.muted);
      doc.text('Tidak ada feedback teks.', PDF_MARGIN, y);
    } else {
      for (const item of aggregate.feedback.slice(0, 30)) {
        // Tinggi blok diukur lebih dulu. Bug lama: `ensureSpace(y, 40)`
        // dengan cadangan tetap 40 pt padahal satu komentar bisa ~145 pt,
        // sehingga teks menabrak footer.
        doc.setFont(FONT, 'normal');
        doc.setFontSize(8.5);
        const bodyLines = doc.splitTextToSize(item.text, PDF_CONTENT_W);
        const blockHeight = 16 + bodyLines.length * 10.5 + 10;
        y = ensureSpace(doc, y, blockHeight, {});

        doc.setFont(FONT, 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(PDF_BRAND.ink);
        doc.text(item.gerai, PDF_MARGIN, y + 8);
        doc.setFont(FONT, 'normal');
        doc.setTextColor(PDF_BRAND.text);
        doc.text(bodyLines, PDF_MARGIN, y + 20);
        doc.setDrawColor(PDF_BRAND.border);
        doc.setLineWidth(0.5);
        doc.line(PDF_MARGIN, y + blockHeight - 4, PDF_MARGIN + PDF_CONTENT_W, y + blockHeight - 4);
        y += blockHeight;
      }
    }
  }

  drawPdfFooter(doc, { label: 'Internal · Tenant Relation · tanpa data PIC' });
  return doc;
}
