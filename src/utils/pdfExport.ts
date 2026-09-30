import { jsPDF } from 'jspdf';
import type { EventPhoto, PhotoAlbum } from '../types';
import {
  A4,
  PDF_BRAND,
  PDF_LOGO_DATA_URL,
  drawPdfFooter,
  fitWithin,
  formatDateId,
  formatDateRangeId,
  nowIdLong,
} from '../components/pdf/pdfTheme';

// ============================================================
// Laporan Dokumentasi Event — album foto, A4 landscape.
//
// Engine: jsPDF. Foto dikompres di sisi klien supaya berkasnya kecil.
//
// Perubahan penting dari versi sebelumnya:
//  - Setiap foto dulu dipaksa mengisi frame 4:3 (`addImage(..., CELL_W,
//    CELL_H)`), sehingga sumber 16:9 gepeng 25%. Sekarang rasio asli
//    dipertahankan (`fitWithin`).
//  - Caption foto tersedia di data tapi tidak pernah dicetak.
//  - `compress: false` membuat stream tidak dideflate.
// ============================================================

// ─── Kompresi gambar ──────────────────────────────────────
// Ambil gambar, kecilkan ke `MAX_IMAGE_DIM`, encode ulang sebagai JPEG.
// 1000 px cukup untuk cetak: frame terbesar hanya ~194 pt (≈ 347 dpi).
const MAX_IMAGE_DIM = 1000;
const JPEG_QUALITY = 0.75;

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
    // Latar putih supaya PNG transparan tidak jadi hitam di cetak.
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

// ─── Tata letak ───────────────────────────────────────────
const PAGE_W = A4.landscapeW;
const PAGE_H = A4.landscapeH;
const PAGE_PADDING = 24;
const GRID_COLS = 4;
const GRID_GAP = 6;
const FOOTER_Y = PAGE_H - 22;
const HEADER_BAND_H = 50;
const CAPTION_H = 22;

interface AlbumWithPhotos {
  album: PhotoAlbum;
  photos: EventPhoto[];
}

export type AlbumPdfSection = 'cover' | 'header' | 'photos' | 'captions';

export const ALBUM_PDF_SECTIONS: AlbumPdfSection[] = ['cover', 'header', 'photos', 'captions'];

export function chunkPhotos(photos: EventPhoto[], size: number): EventPhoto[][] {
  const chunks: EventPhoto[][] = [];
  for (let i = 0; i < photos.length; i += size) {
    chunks.push(photos.slice(i, i + size));
  }
  return chunks;
}

/** Baris grid yang muat per halaman, memperhitungkan band judul album. */
function gridMetrics(withHeader: boolean, withCaptions: boolean): { cellW: number; cellH: number; imageH: number; rows: number; top: number } {
  const cellW = (PAGE_W - PAGE_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
  const top = withHeader ? PAGE_PADDING + HEADER_BAND_H + 10 : PAGE_PADDING;
  const available = FOOTER_Y - 10 - top;
  const rows = 3;
  const cellH = (available - GRID_GAP * (rows - 1)) / rows;
  return {
    cellW,
    cellH,
    imageH: withCaptions ? cellH - CAPTION_H : cellH,
    rows,
    top,
  };
}

function photosPerPage(withHeader: boolean): number {
  return GRID_COLS * gridMetrics(withHeader, false).rows;
}

/** Sampul: identitas dokumen, periode, dan jumlah album/foto. */
function drawCover(
  doc: jsPDF,
  payload: { themeName?: string; albumCount: number; photoCount: number; dateStart: string; dateEnd: string },
  logoDataUrl: string,
): void {
  doc.setFillColor(PDF_BRAND.paper);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Pita tosca di tepi bawah sebagai jangkar visual.
  doc.setFillColor(PDF_BRAND.primaryDark);
  doc.rect(0, PAGE_H - 96, PAGE_W, 96, 'F');
  doc.setFillColor(PDF_BRAND.pink);
  doc.rect(0, PAGE_H - 100, PAGE_W, 4, 'F');

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', PAGE_PADDING + 24, 56, 46 * (1000 / 289), 46);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(PDF_BRAND.primaryDark);
      doc.text('METROPOLITAN MALL BEKASI', PAGE_PADDING + 24, 80, { charSpace: 1.5 });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(PDF_BRAND.primaryDark);
    doc.text('METROPOLITAN MALL BEKASI', PAGE_PADDING + 24, 80, { charSpace: 1.5 });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(40);
  doc.setTextColor(PDF_BRAND.ink);
  doc.text('Dokumentasi Event', PAGE_PADDING + 24, 196);

  doc.setDrawColor(PDF_BRAND.primary);
  doc.setLineWidth(3);
  doc.line(PAGE_PADDING + 24, 214, PAGE_PADDING + 24 + 96, 214);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(PDF_BRAND.muted);
  const subtitle = payload.themeName ? `Tema: ${payload.themeName}` : 'Laporan foto kegiatan';
  doc.text(subtitle, PAGE_PADDING + 24, 240);

  const stats: Array<[string, string]> = [
    ['PERIODE', formatDateRangeId(payload.dateStart, payload.dateEnd)],
    ['TOTAL ALBUM', `${payload.albumCount} album`],
    ['TOTAL FOTO', `${payload.photoCount} foto`],
    ['DIEKSPOR', nowIdLong()],
  ];
  const colW = (PAGE_W - (PAGE_PADDING + 24) * 2) / 2;
  stats.forEach(([label, value], index) => {
    const x = PAGE_PADDING + 24 + (index % 2) * colW;
    const y = 320 + Math.floor(index / 2) * 56;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(PDF_BRAND.primaryDeep);
    doc.text(label, x, y, { charSpace: 1.6 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(PDF_BRAND.ink);
    doc.text(value, x, y + 20);
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor('#ffffff');
  doc.text('METROPOLITAN MALL BEKASI', PAGE_PADDING + 24, PAGE_H - 58, { charSpace: 1.2 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#cdeae9');
  doc.text('Marketing & Tenant Relations Division', PAGE_PADDING + 24, PAGE_H - 42);
  doc.text('Jl. KH. Noer Ali No.1, Pekayon Jaya, Bekasi Selatan', PAGE_PADDING + 24, PAGE_H - 28);
}

/** Band judul album di bagian atas halaman. */
function drawAlbumBand(
  doc: jsPDF,
  album: PhotoAlbum,
  photoCount: number,
  pageLabel: string,
): void {
  doc.setFillColor(PDF_BRAND.primaryWash);
  doc.rect(PAGE_PADDING, PAGE_PADDING, PAGE_W - PAGE_PADDING * 2, HEADER_BAND_H, 'F');
  doc.setFillColor(PDF_BRAND.primary);
  doc.rect(PAGE_PADDING, PAGE_PADDING, 4, HEADER_BAND_H, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(PDF_BRAND.ink);
  const titleLines = doc.splitTextToSize(album.name, PAGE_W - PAGE_PADDING * 2 - 260);
  doc.text(titleLines[0] ?? album.name, PAGE_PADDING + 16, PAGE_PADDING + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(PDF_BRAND.muted);
  const meta = [album.eventDate ? formatDateId(album.eventDate) : '', album.lokasi, `${photoCount} foto`]
    .filter(Boolean)
    .join(' · ');
  doc.text(meta, PAGE_PADDING + 16, PAGE_PADDING + 36);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(PDF_BRAND.primaryDeep);
  doc.text(pageLabel, PAGE_W - PAGE_PADDING - 16, PAGE_PADDING + 22, { align: 'right' });
}

/**
 * Gambar satu foto ke dalam frame, mempertahankan rasio asli.
 *
 * Ukuran asli dibaca lewat `getImageProperties`; bila gagal (format tak
 * dikenal), foto diisi penuh seperti perilaku lama — lebih baik gepeng
 * daripada tidak tampil sama sekali.
 */
function drawPhoto(
  doc: jsPDF,
  src: string,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  index: number,
): void {
  doc.setFillColor(PDF_BRAND.rowAlt);
  doc.roundedRect(x, y, boxW, boxH, 3, 3, 'F');

  if (src) {
    let drawW = boxW;
    let drawH = boxH;
    let drawX = x;
    let drawY = y;
    try {
      const props = doc.getImageProperties(src);
      const fitted = fitWithin(props.width, props.height, boxW, boxH);
      drawW = fitted.width;
      drawH = fitted.height;
      drawX = x + fitted.offsetX;
      drawY = y + fitted.offsetY;
    } catch {
      // Biarkan penuh — lihat komentar di atas.
    }

    try {
      doc.addImage(src, 'JPEG', drawX, drawY, drawW, drawH);
    } catch {
      // Data URL tidak valid — frame abu-abu tetap jadi penanda.
    }
  }

  // Nomor urut foto: memudahkan rujukan saat rapat evaluasi. Digambar
  // terlepas dari berhasil/tidaknya gambar dimuat.
  doc.setFillColor(PDF_BRAND.ink);
  doc.circle(x + 9, y + 9, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor('#ffffff');
  doc.text(String(index), x + 9, y + 11.3, { align: 'center' });
}

export function buildAlbumPdf(
  albumsWithPhotos: AlbumWithPhotos[],
  themeName: string | undefined,
  compressedUrls: Map<string, string>,
  sections: AlbumPdfSection[] = ALBUM_PDF_SECTIONS,
  logoDataUrl: string = PDF_LOGO_DATA_URL,
): jsPDF {
  const enabled = new Set(sections);
  // Keterangan foto hanya bermakna bila grid fotonya ikut dicetak.
  const showPhotos = enabled.has('photos');
  const showCaptions = enabled.has('captions') && showPhotos;
  const showHeader = enabled.has('header');
  const showCover = enabled.has('cover');

  const allPhotos = albumsWithPhotos.flatMap((entry) => entry.photos);
  const dates = albumsWithPhotos.map((entry) => entry.album.eventDate).filter(Boolean).sort();

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape', compress: true });
  doc.setProperties({
    title: `Dokumentasi Event${themeName ? ` - ${themeName}` : ''}`,
    author: 'Metropolitan Mall Bekasi',
    subject: 'Dokumentasi Event',
    keywords: 'dokumentasi, album foto, Metropolitan Mall Bekasi',
    creator: 'Dashboard Event System',
  });

  if (showCover) {
    drawCover(
      doc,
      {
        themeName,
        albumCount: albumsWithPhotos.length,
        photoCount: allPhotos.length,
        dateStart: dates[0] ?? '',
        dateEnd: dates[dates.length - 1] ?? '',
      },
      logoDataUrl,
    );
    doc.outline.add(null, 'Sampul', { pageNumber: 1 });
  }

  // Tanpa bagian foto, dokumen berhenti di sampul: halaman album tidak
  // dibuat sama sekali supaya tidak ada halaman berisi frame kosong.
  if (!showPhotos) {
    if (showCover) {
      drawPdfFooter(doc, {
        label: `Metropolitan Mall Bekasi · Dokumentasi Event${themeName ? ` · ${themeName}` : ''}`,
        margin: PAGE_PADDING,
        pageWidth: PAGE_W,
        pageHeight: PAGE_H,
        fromPage: 2,
      });
    }
    return doc;
  }

  let photoNumber = 0;

  for (const { album, photos } of albumsWithPhotos) {
    const perPage = photosPerPage(showHeader);
    const chunks = chunkPhotos(photos, perPage);

    if (chunks.length === 0) {
      doc.addPage('a4', 'landscape');
      if (showHeader) {
        drawAlbumBand(doc, album, 0, 'Tanpa foto');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(PDF_BRAND.faint);
      doc.text('Belum ada foto pada album ini.', PAGE_PADDING, (showHeader ? PAGE_PADDING + HEADER_BAND_H + 40 : PAGE_PADDING + 40));
      continue;
    }

    chunks.forEach((chunk, chunkIndex) => {
      doc.addPage('a4', 'landscape');
      const isFirstChunk = chunkIndex === 0;
      const withHeader = showHeader && isFirstChunk;
      if (withHeader) {
        drawAlbumBand(doc, album, photos.length, `Album ${albumsWithPhotos.findIndex((entry) => entry.album.id === album.id) + 1} dari ${albumsWithPhotos.length}`);
        doc.outline.add(null, album.name, { pageNumber: doc.getNumberOfPages() });
      }

      const withCaptions = showCaptions && chunk.some((photo) => photo.caption);
      const metrics = gridMetrics(withHeader, withCaptions);

      chunk.forEach((photo, index) => {
        const col = index % GRID_COLS;
        const row = Math.floor(index / GRID_COLS);
        const x = PAGE_PADDING + col * (metrics.cellW + GRID_GAP);
        const y = metrics.top + row * (metrics.cellH + GRID_GAP);
        photoNumber += 1;

        const src = photo.url ? compressedUrls.get(photo.url) || photo.url : '';
        drawPhoto(doc, src, x, y, metrics.cellW, metrics.imageH, photoNumber);

        if (withCaptions) {
          const captionY = y + metrics.imageH + 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(PDF_BRAND.muted);
          const captionLines = doc.splitTextToSize(photo.caption || '', metrics.cellW);
          doc.text(captionLines.slice(0, 2), x, captionY + 7);
        }
      });
    });
  }

  // Footer + nomor halaman. Sampul tidak ikut dihitung supaya penomoran
  // konten mulai dari 1 (dulu halaman kedua tertulis "2 / 3").
  const total = doc.getNumberOfPages();
  const coverOffset = showCover ? 1 : 0;
  const contentPages = total - coverOffset;
  for (let page = coverOffset + 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(PDF_BRAND.border);
    doc.setLineWidth(0.5);
    doc.line(PAGE_PADDING, FOOTER_Y - 8, PAGE_W - PAGE_PADDING, FOOTER_Y - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(PDF_BRAND.faint);
    doc.text(
      `Metropolitan Mall Bekasi · Dokumentasi Event${themeName ? ` · ${themeName}` : ''}`,
      PAGE_PADDING,
      FOOTER_Y,
    );
    doc.text(`${page - coverOffset} / ${contentPages}`, PAGE_W - PAGE_PADDING, FOOTER_Y, { align: 'right' });
  }

  return doc;
}

export interface GenerateAlbumPdfOptions {
  themeName?: string;
  onProgress?: (current: number, total: number) => void;
  compress?: (url: string) => Promise<string>;
  sections?: AlbumPdfSection[];
  logoDataUrl?: string;
}

export async function generateAlbumPdf(
  albumsWithPhotos: AlbumWithPhotos[],
  themeName?: string,
  onProgress?: (current: number, total: number) => void,
  compress: (url: string) => Promise<string> = compressImage,
  options: GenerateAlbumPdfOptions = {},
): Promise<Blob> {
  const uniqueUrls = new Set<string>();
  for (const { photos } of albumsWithPhotos) {
    for (const photo of photos) {
      if (photo.url) uniqueUrls.add(photo.url);
    }
  }

  const urlList = Array.from(uniqueUrls);
  const compressedUrls = new Map<string, string>();
  let processed = 0;

  await compressInBatches(urlList, async (url) => {
    compressedUrls.set(url, await compress(url));
    processed += 1;
    onProgress?.(processed, urlList.length);
  });

  return buildAlbumPdf(
    albumsWithPhotos,
    options.themeName ?? themeName,
    compressedUrls,
    options.sections ?? ALBUM_PDF_SECTIONS,
    options.logoDataUrl ?? PDF_LOGO_DATA_URL,
  ).output('blob');
}

export type { AlbumWithPhotos };
