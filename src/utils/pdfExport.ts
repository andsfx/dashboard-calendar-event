import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { PhotoAlbum, EventPhoto } from '../types';

// ============================================================
// PDF Export — Landscape A4 grid report for event photo albums
// Images compressed client-side to keep PDF size small.
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
// A4 landscape inner area ≈ 760×500 pt. Grid: 4 cols × 3 rows = 12 photos/page.
const PHOTOS_PER_PAGE = 12;
const GRID_COLS = 4;
const GRID_GAP = 6;

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  coverPage: {
    padding: 48,
    backgroundColor: '#1e1b4b',
    color: '#ffffff',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverTopLabel: {
    fontSize: 10,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: '#a5b4fc',
    fontFamily: 'Helvetica-Bold',
  },
  coverTitle: {
    fontSize: 44,
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    color: '#ffffff',
  },
  coverSubtitle: {
    fontSize: 16,
    marginTop: 8,
    color: '#cbd5e1',
  },
  coverMeta: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 'auto',
  },
  coverMetaItem: { flexDirection: 'column' },
  coverMetaLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#a5b4fc',
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  coverFooter: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 16,
  },
  albumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1b4b',
    paddingBottom: 6,
    marginBottom: 10,
  },
  albumName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  albumMeta: {
    fontSize: 9,
    color: '#475569',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoCell: {
    width: `${100 / GRID_COLS}%`,
    padding: GRID_GAP / 2,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
  },
  emptyNote: {
    fontSize: 9,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});

interface AlbumWithPhotos {
  album: PhotoAlbum;
  photos: EventPhoto[];
}

function chunkPhotos(photos: EventPhoto[], size: number): EventPhoto[][] {
  const chunks: EventPhoto[][] = [];
  for (let i = 0; i < photos.length; i += size) {
    chunks.push(photos.slice(i, i + size));
  }
  return chunks;
}

function CoverPage({ themeName, dateRange, albumCount }: { themeName?: string; dateRange: { start: string; end: string }; albumCount: number }) {
  return createElement(Page, { size: 'A4', orientation: 'landscape', style: styles.coverPage },
    createElement(View, null,
      createElement(Text, { style: styles.coverTopLabel }, 'METROPOLITAN MALL BEKASI'),
      createElement(Text, { style: styles.coverTitle }, 'Dokumentasi Event'),
      themeName
        ? createElement(Text, { style: styles.coverSubtitle }, `Tema: ${themeName}`)
        : null,
    ),
    createElement(View, { style: styles.coverMeta },
      createElement(View, { style: styles.coverMetaItem },
        createElement(Text, { style: styles.coverMetaLabel }, 'PERIODE'),
        createElement(Text, { style: styles.coverMetaValue },
          dateRange.start && dateRange.end
            ? `${formatDateID(dateRange.start)} — ${formatDateID(dateRange.end)}`
            : 'Semua tanggal',
        ),
      ),
      createElement(View, { style: styles.coverMetaItem },
        createElement(Text, { style: styles.coverMetaLabel }, 'TOTAL ALBUM'),
        createElement(Text, { style: styles.coverMetaValue }, `${albumCount} Album`),
      ),
    ),
    createElement(Text, { style: styles.coverFooter }, `Diekspor pada ${formatDateID(new Date().toISOString().slice(0, 10))}`),
  );
}

function AlbumPages({ album, photos, compressedUrls }: AlbumWithPhotos & { compressedUrls: Map<string, string> }) {
  const photoChunks = chunkPhotos(photos, PHOTOS_PER_PAGE);

  if (photoChunks.length === 0) {
    return createElement(Page, { size: 'A4', orientation: 'landscape', style: styles.page },
      createElement(View, { style: styles.albumHeader },
        createElement(Text, { style: styles.albumName }, album.name),
        createElement(Text, { style: styles.albumMeta },
          [album.eventDate ? formatDateID(album.eventDate) : '', album.lokasi].filter(Boolean).join(' • '),
        ),
      ),
      createElement(Text, { style: styles.emptyNote }, 'Belum ada foto.'),
    );
  }

  return photoChunks.map((chunk, chunkIdx) =>
    createElement(Page, { key: `${album.id}-${chunkIdx}`, size: 'A4', orientation: 'landscape', style: styles.page },
      chunkIdx === 0
        ? createElement(View, { style: styles.albumHeader },
            createElement(Text, { style: styles.albumName }, album.name),
            createElement(Text, { style: styles.albumMeta },
              [album.eventDate ? formatDateID(album.eventDate) : '', album.lokasi].filter(Boolean).join(' • '),
            ),
          )
        : null,
      createElement(View, { style: styles.grid },
        ...chunk.map((photo) =>
          createElement(View, { key: photo.id, style: styles.photoCell },
            createElement(View, { style: styles.photoFrame },
              photo.url
                ? createElement(Image, { src: compressedUrls.get(photo.url) || photo.url, style: styles.photo })
                : null,
            ),
          ),
        ),
      ),
      createElement(View, { style: styles.footer, fixed: true },
        createElement(Text, null, album.name),
        createElement(Text, { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
      ),
    ),
  );
}

export async function generateAlbumPdf(
  albumsWithPhotos: AlbumWithPhotos[],
  themeName?: string,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const dateRange = getDateRange(albumsWithPhotos.map(a => a.album));

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
    const compressed = await compressImage(url);
    compressedUrls.set(url, compressed);
    processed++;
    if (onProgress) onProgress(processed, urlList.length);
  });

  const doc = createElement(Document, null,
    createElement(CoverPage, { themeName, dateRange, albumCount: albumsWithPhotos.length }),
    ...albumsWithPhotos.map(({ album, photos }) =>
      createElement(AlbumPages, { key: album.id, album, photos, compressedUrls }),
    ),
  );

  return pdf(doc).toBlob();
}

export type { AlbumWithPhotos };
