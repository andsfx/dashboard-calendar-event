import { describe, expect, it } from 'vitest';
import type { EventPhoto, PhotoAlbum } from '../../types';
import { buildAlbumPdf } from '../../utils/pdfExport';
import { extractImagePlacements, extractPdfStrings } from '../../test/pdfText';

const JPEG_FIXTURE = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofGh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAAKAA4BAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const ALBUM = {
  id: 'a1', name: 'Grand Sale 2026', slug: 'gs', eventDate: '2026-08-10',
  lokasi: 'Atrium', coverPhotoUrl: '', description: '', sortOrder: 0, eventId: 'e1', themeId: '',
} as PhotoAlbum;

const PHOTOS = [
  { id: 'p1', url: 'u1', caption: 'Pembukaan stan', eventDate: '2026-08-10', sortOrder: 0, albumId: 'a1' },
  { id: 'p2', url: 'u2', caption: '', eventDate: '2026-08-10', sortOrder: 1, albumId: 'a1' },
] as EventPhoto[];

function build(sections: Parameters<typeof buildAlbumPdf>[3]) {
  return buildAlbumPdf(
    [{ album: ALBUM, photos: PHOTOS }],
    'Ramadan Berkah',
    new Map(PHOTOS.map((p) => [p.url, JPEG_FIXTURE])),
    sections,
  );
}

describe('buildAlbumPdf bagian', () => {
  it('sampul memuat periode tunggal tanpa pengulangan tanggal', () => {
    // Regresi: dulu tercetak "10 Agustus 2026 - 10 Agustus 2026".
    const text = extractPdfStrings(build(['cover']));
    expect(text).toContain('10 Agustus 2026');
    expect(text).not.toContain('10 Agustus 2026 - 10 Agustus 2026');
    expect(text).toContain('Dokumentasi Event');
  });

  it('tanpa bagian foto, tidak ada halaman berisi frame kosong', () => {
    const doc = build(['cover']);
    expect(doc.getNumberOfPages()).toBe(1);
    // Satu-satunya gambar adalah logo di sampul (tinggi 46 pt); frame foto
    // berukuran ~148 pt, jadi tidak ada grid yang ikut tercetak.
    const placements = extractImagePlacements(doc);
    expect(placements.every((placement) => placement.height < 60)).toBe(true);
  });

  it('keterangan foto hanya dicetak bila diminta', () => {
    expect(extractPdfStrings(build(['photos', 'captions']))).toContain('Pembukaan stan');
    expect(extractPdfStrings(build(['photos']))).not.toContain('Pembukaan stan');
  });

  it('judul album hanya muncul bila bagian header dipilih', () => {
    expect(extractPdfStrings(build(['header', 'photos']))).toContain('Grand Sale 2026');
    expect(extractPdfStrings(build(['photos']))).not.toContain('Grand Sale 2026');
  });

  it('nomor halaman konten tidak menghitung sampul', () => {
    const text = extractPdfStrings(build(['cover', 'header', 'photos']));
    // Sampul + 1 halaman grid → penomoran konten "1 / 1", bukan "2 / 2".
    expect(text).toContain('1 / 1');
    expect(text).not.toContain('2 / 2');
  });
});
