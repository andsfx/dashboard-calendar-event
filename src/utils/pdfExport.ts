import { Document, Page, View, Text, Image, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { PhotoAlbum, EventPhoto } from '../types';

// ============================================================
// PDF Export — Landscape report for event photo albums
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

const styles = StyleSheet.create({
  page: {
    padding: 32,
    backgroundColor: '#fbfaf7',
    fontFamily: 'Helvetica',
  },
  // Cover page
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
  coverMetaItem: {
    flexDirection: 'column',
  },
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
  // Album header
  albumHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#1e1b4b',
    paddingBottom: 12,
    marginBottom: 16,
  },
  albumLabel: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#7c3aed',
    fontFamily: 'Helvetica-Bold',
  },
  albumName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 4,
  },
  albumMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  albumMetaText: {
    fontSize: 10,
    color: '#475569',
  },
  albumDescription: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 1.4,
  },
  // Photo grid (3 columns x 2 rows on landscape A4)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoCell: {
    width: '32.5%',
    marginBottom: 12,
  },
  photoFrame: {
    width: '100%',
    height: 150,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  caption: {
    fontSize: 8,
    color: '#475569',
    marginTop: 4,
    lineHeight: 1.3,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
  // Empty state
  emptyAlbumNote: {
    fontSize: 10,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 8,
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

function AlbumPages({ album, photos }: AlbumWithPhotos) {
  const photoChunks = chunkPhotos(photos, 6); // 3x2 per page

  if (photoChunks.length === 0) {
    return createElement(Page, { size: 'A4', orientation: 'landscape', style: styles.page },
      createElement(View, { style: styles.albumHeader },
        createElement(Text, { style: styles.albumLabel }, 'ALBUM'),
        createElement(Text, { style: styles.albumName }, album.name),
        createElement(View, { style: styles.albumMetaRow },
          album.eventDate ? createElement(Text, { style: styles.albumMetaText }, formatDateID(album.eventDate)) : null,
          album.lokasi ? createElement(Text, { style: styles.albumMetaText }, album.lokasi) : null,
        ),
        album.description ? createElement(Text, { style: styles.albumDescription }, album.description) : null,
      ),
      createElement(Text, { style: styles.emptyAlbumNote }, 'Belum ada foto dalam album ini.'),
      createElement(View, { style: styles.footer, fixed: true },
        createElement(Text, null, album.name),
        createElement(Text, { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
      ),
    );
  }

  return photoChunks.map((chunk, chunkIdx) =>
    createElement(Page, { key: `${album.id}-${chunkIdx}`, size: 'A4', orientation: 'landscape', style: styles.page },
      // Show album header only on first page of album
      chunkIdx === 0
        ? createElement(View, { style: styles.albumHeader },
            createElement(Text, { style: styles.albumLabel }, 'ALBUM'),
            createElement(Text, { style: styles.albumName }, album.name),
            createElement(View, { style: styles.albumMetaRow },
              album.eventDate ? createElement(Text, { style: styles.albumMetaText }, formatDateID(album.eventDate)) : null,
              album.lokasi ? createElement(Text, { style: styles.albumMetaText }, album.lokasi) : null,
            ),
            album.description ? createElement(Text, { style: styles.albumDescription }, album.description) : null,
          )
        : null,
      // Photo grid
      createElement(View, { style: styles.grid },
        ...chunk.map((photo) =>
          createElement(View, { key: photo.id, style: styles.photoCell },
            createElement(View, { style: styles.photoFrame },
              photo.url ? createElement(Image, { src: photo.url, style: styles.photo }) : null,
            ),
            photo.caption ? createElement(Text, { style: styles.caption }, photo.caption) : null,
          ),
        ),
      ),
      // Footer
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
): Promise<Blob> {
  const dateRange = getDateRange(albumsWithPhotos.map(a => a.album));

  const doc = createElement(Document, null,
    createElement(CoverPage, { themeName, dateRange, albumCount: albumsWithPhotos.length }),
    ...albumsWithPhotos.map(({ album, photos }) =>
      createElement(AlbumPages, { key: album.id, album, photos }),
    ),
  );

  return pdf(doc).toBlob();
}

export type { AlbumWithPhotos };
