import type { jsPDF } from 'jspdf';
// `?inline` → data URL saat build. Aset sumber PNG 32-bit ber-alpha 87 KB
// membengkak jadi ~33 MB begitu disematkan mentah ke PDF (terukur), jadi
// dipakai versi krop + latar putih + 1000 px (≈40 KB) yang aman dicetak.
import logoDataUrl from '../../assets/brand/logo-metmal-pdf.jpg?inline';

// ============================================================
// Tema & tata letak bersama untuk semua dokumen PDF.
//
// Sebelumnya tiap builder punya palet, margin, dan footer sendiri — satu
// brand tampil dalam empat warna berbeda (indigo, tosca, teal, slate).
// Semua konstanta di sini adalah nilai tunggal yang dipakai bersama;
// jangan hardcode ulang di builder masing-masing.
//
// Palet mengikuti DESIGN.md: tosca #00918e hanya untuk elemen dekoratif
// (garis, aksen) dan #007a78 untuk permukaan berteks, supaya kontras
// putih di atasnya tetap ≥ 4.5:1 saat dicetak.
// ============================================================

export const PDF_BRAND = {
  /** Dekoratif saja: garis, aksen, bar, ikon. */
  primary: '#00918e',
  /** Permukaan berteks (heading, header tabel) — kontras aman. */
  primaryDark: '#007a78',
  primaryDeep: '#006260',
  primaryWash: '#e6f7f6',
  /** Sekunder — maksimal satu sinyal pink per halaman. */
  pink: '#e24378',
  ink: '#16211b',
  text: '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e2e8f0',
  rowAlt: '#f8fafc',
  paper: '#ffffff',
  live: '#047857',
  soon: '#b45309',
  past: '#64748b',
  danger: '#be123c',
} as const;

/** A4 dalam pt (satuan default jsPDF). */
export const A4 = {
  w: 595.28,
  h: 841.89,
  landscapeW: 841.89,
  landscapeH: 595.28,
} as const;

export const PDF_MARGIN = 40;
export const PDF_CONTENT_W = A4.w - PDF_MARGIN * 2;

/** Rasio tinggi baris terhadap ukuran font. Satu sumber untuk semua builder. */
export const LINE_RATIO = 1.45;

/** Logo Metmal (krop rapat ke bbox alpha, latar putih) — rasio 1000×289. */
export const LOGO_ASPECT = 1000 / 289;

/**
 * Logo siap `addImage`, sudah data URL sejak build (lihat impor `?inline`).
 * Pemanggil tetap wajib menangani `addImage` yang melempar.
 */
export const PDF_LOGO_DATA_URL: string = logoDataUrl;

export interface PdfHeaderOptions {
  title: string;
  subtitle?: string;
  meta?: string;
  logoDataUrl?: string;
  /** Sumbu Y awal; default PDF_MARGIN. */
  y?: number;
  /** Margin kiri/kanan; default PDF_MARGIN. */
  margin?: number;
  /** Lebar halaman; default A4 portrait. */
  pageWidth?: number;
  /** Warna garis aksen di bawah kop. */
  accent?: string;
}

/**
 * Kop dokumen: logo + nama mall + judul + baris meta, ditutup garis aksen.
 * Mengembalikan Y tepat di bawah garis — titik mulai konten berikutnya.
 */
export function drawPdfHeader(doc: jsPDF, options: PdfHeaderOptions): number {
  const margin = options.margin ?? PDF_MARGIN;
  const pageWidth = options.pageWidth ?? A4.w;
  const y = options.y ?? margin;
  const contentW = pageWidth - margin * 2;

  const logoH = 30;
  let textX = margin;
  if (options.logoDataUrl) {
    const logoW = logoH * LOGO_ASPECT;
    try {
      doc.addImage(options.logoDataUrl, 'JPEG', margin, y, logoW, logoH);
      textX = margin + logoW + 16;
    } catch {
      // Data URL rusak — lanjut tanpa logo, jangan gagalkan ekspor.
      textX = margin;
    }
  } else {
    // Tanpa logo, kop tetap harus mengidentifikasi brand.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(PDF_BRAND.primaryDark);
    doc.text('METROPOLITAN MALL BEKASI', margin, y + 8, { charSpace: 0.8 });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(PDF_BRAND.ink);
  doc.text(options.title, textX, y + 14);

  let baseline = y + logoH;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(PDF_BRAND.muted);
  if (options.subtitle) {
    baseline += 4;
    doc.text(options.subtitle, textX, baseline);
    baseline += 11;
  }
  if (options.meta) {
    baseline += 4;
    doc.text(options.meta, textX, baseline);
  }

  const ruleY = Math.max(y + logoH, baseline) + 12;
  doc.setDrawColor(options.accent ?? PDF_BRAND.primary);
  doc.setLineWidth(2);
  doc.line(margin, ruleY, margin + contentW, ruleY);

  return ruleY + 20;
}

export interface PdfFlowOptions {
  pageHeight?: number;
  margin?: number;
  /** Ruang yang disisakan di bawah untuk footer. */
  footerReserve?: number;
  /** Dipanggil tepat setelah halaman baru dibuat. */
  onNewPage?: (doc: jsPDF, pageNumber: number) => void;
}

/**
 * Pastikan `needed` pt masih muat; kalau tidak, buat halaman baru.
 *
 * Dipakai builder yang menggambar konten sendiri (surat, agenda per area,
 * cuplikan feedback). Nilai `needed` WAJIB tinggi blok sebenarnya — bug
 * lama di feedback survey memakai angka tetap 40 pt padahal satu blok
 * bisa ~145 pt sehingga teks menabrak footer.
 */
export function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  options: PdfFlowOptions = {},
): number {
  const pageHeight = options.pageHeight ?? A4.h;
  const margin = options.margin ?? PDF_MARGIN;
  const footerReserve = options.footerReserve ?? 52;
  if (y + needed <= pageHeight - footerReserve) return y;
  doc.addPage();
  const next = margin;
  options.onNewPage?.(doc, doc.getNumberOfPages());
  return next;
}

export interface PdfFooterOptions {
  label?: string;
  /** Mulai dari halaman ini (cover biasanya dilewati). */
  fromPage?: number;
  margin?: number;
  /** Tinggi halaman; default A4 portrait. */
  pageHeight?: number;
  pageWidth?: number;
}

/** Footer seragam + nomor halaman, digambar di setiap halaman. */
export function drawPdfFooter(doc: jsPDF, options: PdfFooterOptions = {}): void {
  const margin = options.margin ?? PDF_MARGIN;
  const pageHeight = options.pageHeight ?? A4.h;
  const pageWidth = options.pageWidth ?? A4.w;
  const label = options.label ?? 'Metropolitan Mall Bekasi · Sistem Event';
  const from = options.fromPage ?? 1;
  const total = doc.getNumberOfPages();
  const y = pageHeight - 24;

  for (let page = from; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(PDF_BRAND.border);
    doc.setLineWidth(0.5);
    doc.line(margin, y - 9, pageWidth - margin, y - 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(PDF_BRAND.faint);
    doc.text(label, margin, y);
    doc.text(`${page} / ${total}`, pageWidth - margin, y, { align: 'right' });
  }
}

/**
 * Dimensi gambar yang muat di dalam kotak `boxW × boxH` tanpa distorsi.
 *
 * Album dulu memaksa setiap foto ke frame 4:3 sehingga sumber 2400×1350
 * (16:9) gepeng 25% (terukur). `contain` menjaga rasio asli.
 */
export function fitWithin(
  sourceW: number,
  sourceH: number,
  boxW: number,
  boxH: number,
): { width: number; height: number; offsetX: number; offsetY: number } {
  if (sourceW <= 0 || sourceH <= 0) {
    return { width: boxW, height: boxH, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(boxW / sourceW, boxH / sourceH);
  const width = sourceW * scale;
  const height = sourceH * scale;
  return { width, height, offsetX: (boxW - width) / 2, offsetY: (boxH - height) / 2 };
}

// ─── Label enum ───────────────────────────────────────────
// Nilai mentah dari API tidak boleh muncul di dokumen yang dibaca pihak
// luar (mis. "Status: submitted+reviewed"). Pemetaan enum → Bahasa
// Indonesia terkumpul di sini, bukan tersebar di tiap builder.

export const EVENT_STATUS_LABEL: Record<string, string> = {
  ongoing: 'Berlangsung',
  upcoming: 'Akan Datang',
  past: 'Selesai',
  draft: 'Internal',
};

export const SURVEY_STATUS_LABEL: Record<string, string> = {
  all: 'Terkirim & Ditinjau',
  submitted: 'Telah Dikirim',
  reviewed: 'Telah Ditinjau',
};

export function eventStatusColor(status: string): string {
  if (status === 'ongoing') return PDF_BRAND.live;
  if (status === 'upcoming') return PDF_BRAND.soon;
  return PDF_BRAND.past;
}

const MONTH_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** `2026-08-10` → `10 Agustus 2026`. Format lain dikembalikan apa adanya. */
export function formatDateId(value: string | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const day = parseInt(match[3] ?? '1', 10);
  const monthName = MONTH_LONG[parseInt(match[2] ?? '1', 10) - 1] ?? '';
  return `${day} ${monthName} ${match[1]}`;
}

/** Rentang tanggal; bila awal = akhir cukup ditulis sekali. */
export function formatDateRangeId(start: string, end: string): string {
  if (!start && !end) return 'Semua tanggal';
  if (!end || start === end) return formatDateId(start);
  if (!start) return formatDateId(end);
  return `${formatDateId(start)} – ${formatDateId(end)}`;
}

/** `30 September 2026, 10.00` — label "Diekspor/Dibuat" yang seragam. */
export function nowIdLong(date = new Date()): string {
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
