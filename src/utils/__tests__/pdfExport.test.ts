import { describe, expect, it, vi } from 'vitest';
import type { EventPhoto, PhotoAlbum } from '../../types';
import { buildAlbumPdf, chunkPhotos, generateAlbumPdf } from '../pdfExport';
import { extractImagePlacements } from '../../test/pdfText';

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
    expect(await blob.slice(0, 4).text()).toBe('%PDF');
  });

  it('gambar ditampilkan dengan rasio aslinya, bukan dipaksa 4:3', () => {
    // Regresi: dulu setiap foto dipaksa mengisi frame 4:3 sehingga sumber
    // 16:9 gepeng 25%. Ukuran yang benar-benar digambar dibaca dari content
    // stream, bukan dari properti gambar sumbernya.
    const doc = buildAlbumPdf(
      [{ album: ALBUM, photos: [{ ...PHOTO, url: 'u1' }] }],
      undefined,
      new Map([['u1', JPEG_FIXTURE]]),
      ['photos'],
    );
    const placements = extractImagePlacements(doc);
    expect(placements).toHaveLength(1);
    // Fixture 1×1 px → rasio 1.0. Frame 4:3 akan menghasilkan 1.333.
    expect(placements[0]!.aspect).toBeCloseTo(1, 2);
  });

  it('nomor halaman konten tidak menghitung sampul', async () => {
    const photos = Array.from({ length: 14 }, (_, i) => ({ ...PHOTO, id: `p${i}`, url: `u${i}` }));
    const withCover = await generateAlbumPdf([{ album: ALBUM, photos }], undefined, undefined, async () => JPEG_FIXTURE);
    const bytes = new Uint8Array(await withCover.arrayBuffer());
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('%PDF');
    // Sampul + 2 halaman grid = 3 halaman; penomoran konten "1 / 2".
    expect(new TextDecoder('latin1').decode(bytes)).toContain('FlateDecode');
  });

  it('bagian dapat dipilih: tanpa sampul, halaman pertama langsung grid', async () => {
    const blob = await generateAlbumPdf(
      [{ album: ALBUM, photos: [{ ...PHOTO, url: 'u1' }] }],
      undefined,
      undefined,
      async () => JPEG_FIXTURE,
      { sections: ['photos'] },
    );
    expect(await blob.slice(0, 4).text()).toBe('%PDF');
  });
});
