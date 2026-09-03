import { describe, expect, it, vi } from 'vitest';
import type { EventPhoto, PhotoAlbum } from '../../types';
import { chunkPhotos, generateAlbumPdf } from '../pdfExport';

const ALBUM: PhotoAlbum = {
  id: 'a1',
  name: 'Grand Sale 2026',
  slug: 'grand-sale-2026',
  eventDate: '2026-08-10',
  lokasi: 'Atrium',
  coverPhotoUrl: '',
} as unknown as PhotoAlbum;

const PHOTO: EventPhoto = { id: 'p1', url: 'x', caption: '' } as unknown as EventPhoto;

// 1x1 px JPEG valid
const JPEG_FIXTURE =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofGh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

describe('chunkPhotos', () => {
  it('membagi sesuai ukuran halaman', () => {
    const photos = Array.from({ length: 25 }, (_, i) => ({ ...PHOTO, id: `p${i}` }));
    expect(chunkPhotos(photos, 12).map(c => c.length)).toEqual([12, 12, 1]);
  });
});

describe('generateAlbumPdf', () => {
  it('PDF valid, compress path bisa di-inject, progress terpanggil', async () => {
    const compress = vi.fn(async () => JPEG_FIXTURE);
    const onProgress = vi.fn();
    const blob = await generateAlbumPdf(
      [{ album: ALBUM, photos: [{ ...PHOTO, url: 'u1' }, { ...PHOTO, id: 'p2', url: 'u2' }] }],
      'Ramadan',
      onProgress,
      compress,
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(1024);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('%PDF');
    expect(compress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });

  it('album tanpa foto → tetap PDF valid (halaman kosong)', async () => {
    const blob = await generateAlbumPdf([{ album: ALBUM, photos: [] }]);
    const head = await blob.slice(0, 4).text();
    expect(head).toBe('%PDF');
  });
});
