import { jsPDF } from 'jspdf';
import type { PhotoAlbum, EventPhoto } from '../types';

// ============================================================
// PDF Export — Landscape A4 grid report for event photo albums
// Images compressed client-side to keep PDF size small.
// Engine: jsPDF (pengganti @react-pdf/renderer, bundle lebih kecil).
// ============================================================

const MONTH_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatDateID(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const day = d ? parseInt(d) : 0;
  const monthIndex = m ? parseInt(m) - 1 : 0;
  const monthName = MONTH_LONG[monthIndex] ?? '';
  return `${day} ${monthName} ${y ?? ''}`;
}

function getDateRange(albums: PhotoAlbum[]): { start: string; end: string } {
  const dates = albums.map(a => a.eventDate).filter(Boolean).sort();
  return {
    start: dates[0] ?? '',
    end: dates[dates.length - 1] ?? '',
  };
}

// ─── Image compression ────────────────────────────────────
// Fetches image, resizes to maxDim, re-encodes as JPEG at given quality.
// Drastically reduces PDF size: source 3000×4000 PNG → ~1200px JPEG.
const MAX_IMAGE_DIM = 1200;
const JPEG_QUALITY = 0.72;

async function compressImage(url: string): Promise<string> {
  if (!url) return '';
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return url;
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const ratio = Math.min(1, MAX_IMAGE_DIM / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.round(bitmap.width * ratio);
    const targetHeight = Math.round(bitmap.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return url;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return url;
  }
}

async function compressInBatches<T>(items: T[], worker: (item: T) => Promise<void>, batchSize = 6): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(worker));
  }
}

// ─── Layout config ────────────────────────────────────────
// A4 landscape ≈ 842×595 pt, padding 24. Grid: 4 cols × 3 rows = 12 photos/page.
const PHOTOS_PER_PAGE = 12;
const GRID_COLS = 4;
const GRID_GAP = 6;
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const PAGE_PADDING = 24;
const CELL_W = (PAGE_W - PAGE_PADDING * 2) / GRID_COLS;
const CELL_H = CELL_W * (3 / 4); // frame aspect 4:3

interface AlbumWithPhotos {
  album: PhotoAlbum;
  photos: EventPhoto[];
}

export function chunkPhotos(photos: EventPhoto[], size: number): EventPhoto[][] {
  const chunks: EventPhoto[][] = [];
  for (let i = 0; i < photos.length; i += size) {
    chunks.push(photos.slice(i, i + size));
  }
  return chunks;
}

export function buildAlbumPdf(
  albumsWithPhotos: AlbumWithPhotos[],
  themeName: string | undefined,
  compressedUrls: Map<string, string>,
): jsPDF {
  const dateRange = getDateRange(albumsWithPhotos.map(a => a.album));
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape', compress: false });
  doc.setProperties({
    title: `Dokumentasi Event${themeName ? ` — ${themeName}` : ''}`,
    author: 'Metropolitan Mall Bekasi',
    subject: 'Dokumentasi Event',
  });

  // ── Cover page ────────────────────────────────────────────
  doc.setFillColor('#1e1b4b');
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor('#a5b4fc');
  doc.text('METROPOLITAN MALL BEKASI', 48, 84, { charSpace: 4 });

  doc.setFontSize(44);
  doc.setTextColor('#ffffff');
  doc.text('Dokumentasi Event', 48, 140);
  if (themeName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.setTextColor('#cbd5e1');
    doc.text(`Tema: ${themeName}`, 48, 168);
  }

  const metaY = PAGE_H - 120;
  const periode = dateRange.start && dateRange.end
    ? `${formatDateID(dateRange.start)} — ${formatDateID(dateRange.end)}`
    : 'Semua tanggal';
  doc.setFontSize(9);
  doc.setTextColor('#a5b4fc');
  doc.text('PERIODE', 48, metaY, { charSpace: 2 });
  doc.text('TOTAL ALBUM', 48 + 250, metaY, { charSpace: 2 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor('#ffffff');
  doc.text(periode, 48, metaY + 20);
  doc.text(`${albumsWithPhotos.length} Album`, 48 + 250, metaY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#94a3b8');
  doc.text(`Diekspor pada ${formatDateID(new Date().toISOString().slice(0, 10))}`, 48, PAGE_H - 60);

  // ── Album pages ───────────────────────────────────────────
  for (const { album, photos } of albumsWithPhotos) {
    const chunks = chunkPhotos(photos, PHOTOS_PER_PAGE);

    if (chunks.length === 0) {
      doc.addPage('a4', 'landscape');
      doc.setFillColor('#ffffff');
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
      doc.setDrawColor('#1e1b4b');
      doc.setLineWidth(1);
      doc.line(PAGE_PADDING, PAGE_PADDING + 26, PAGE_W - PAGE_PADDING, PAGE_PADDING + 26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor('#0f172a');
      doc.text(album.name, PAGE_PADDING, PAGE_PADDING + 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor('#475569');
      const meta = [album.eventDate ? formatDateID(album.eventDate) : '', album.lokasi].filter(Boolean).join(' • ');
      doc.text(meta, PAGE_W - PAGE_PADDING, PAGE_PADDING + 16, { align: 'right' });
      doc.setTextColor('#94a3b8');
      doc.text('Belum ada foto.', PAGE_PADDING, PAGE_PADDING + 60);
      continue;
    }

    chunks.forEach((chunk, chunkIdx) => {
      doc.addPage('a4', 'landscape');
      doc.setFillColor('#ffffff');
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

      let gridTop = PAGE_PADDING;
      if (chunkIdx === 0) {
        doc.setDrawColor('#1e1b4b');
        doc.setLineWidth(1);
        doc.line(PAGE_PADDING, PAGE_PADDING + 26, PAGE_W - PAGE_PADDING, PAGE_PADDING + 26);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor('#0f172a');
        doc.text(album.name, PAGE_PADDING, PAGE_PADDING + 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor('#475569');
        const meta = [album.eventDate ? formatDateID(album.eventDate) : '', album.lokasi].filter(Boolean).join(' • ');
        doc.text(meta, PAGE_W - PAGE_PADDING, PAGE_PADDING + 16, { align: 'right' });
        gridTop = PAGE_PADDING + 40;
      }

      chunk.forEach((photo, i) => {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const x = PAGE_PADDING + col * (CELL_W + GRID_GAP);
        const y = gridTop + row * (CELL_H + GRID_GAP);
        // frame background
        doc.setFillColor('#e2e8f0');
        doc.roundedRect(x, y, CELL_W, CELL_H, 3, 3, 'F');
        const src = photo.url ? (compressedUrls.get(photo.url) || photo.url) : '';
        if (src) {
          try {
            doc.addImage(src, 'JPEG', x, y, CELL_W, CELL_H);
          } catch {
            // dataURL tidak valid — biarkan frame abu-abu
          }
        }
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor('#94a3b8');
      doc.text(album.name, PAGE_PADDING, PAGE_H - 12);
    });
  }

  // Footer nomor halaman global (semua halaman kecuali cover)
  const total = doc.getNumberOfPages();
  for (let page = 2; page <= total; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#94a3b8');
    doc.text(`${page} / ${total}`, PAGE_W - PAGE_PADDING, PAGE_H - 12, { align: 'right' });
  }

  return doc;
}

export async function generateAlbumPdf(
  albumsWithPhotos: AlbumWithPhotos[],
  themeName?: string,
  onProgress?: (current: number, total: number) => void,
  compress: (url: string) => Promise<string> = compressImage,
): Promise<Blob> {
  // Collect all unique photo URLs
  const allUrls = new Set<string>();
  for (const { photos } of albumsWithPhotos) {
    for (const photo of photos) {
      if (photo.url) allUrls.add(photo.url);
    }
  }

  // Compress images in batches
  const urlList = Array.from(allUrls);
  const compressedUrls = new Map<string, string>();
  let processed = 0;

  await compressInBatches(urlList, async (url) => {
    const compressed = await compress(url);
    compressedUrls.set(url, compressed);
    processed++;
    if (onProgress) onProgress(processed, urlList.length);
  });

  return buildAlbumPdf(albumsWithPhotos, themeName, compressedUrls).output('blob');
}

export type { AlbumWithPhotos };
