import type { EventItem, PhotoAlbum } from '../types';

/**
 * Gambar promo sebuah event — satu sumber kebenaran untuk semua permukaan
 * (kartu /events, kartu beranda, modal & halaman detail).
 *
 * Urutan: `posterUrl` (unggahan admin) → cover album foto event tersebut
 * (fallback yang sudah dipakai hero /events). String kosong bila keduanya
 * tidak ada, sehingga pemanggil bisa memilih untuk tidak merender banner.
 */
export function resolveEventPoster(event: EventItem | null | undefined, albums: PhotoAlbum[] = []): string {
  if (!event) return '';
  if (event.posterUrl) return event.posterUrl;
  const album = albums.find(a => a.eventId === event.id);
  return album?.coverPhotoUrl || '';
}
