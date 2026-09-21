import type { EventItem } from '../../types';

/**
 * Angka komunitas — SATU sumber derivasi untuk semua permukaan publik.
 *
 * Sebelumnya `App.tsx` menghitung ini inline dan tiap permukaan menamai
 * angkanya sendiri, sehingga hero ("Event Sudah Terlaksana" = status `past`)
 * dan `/events` (label telanjang "Total" = semua event) tampak bertentangan.
 * Keduanya metrik yang berbeda; yang salah adalah LABEL-nya.
 *
 * `COMMUNITY_STAT_LABELS` adalah kosakata tunggal yang dipakai hero,
 * CommunitySocialProof, dan /events. Ubah label di sini, bukan di per komponen.
 */
export interface CommunityStats {
  /** Jumlah event berstatus `past` saja. */
  completed: number;
  /** Semua event publik (past + ongoing + upcoming). */
  total: number;
  /** Penyelenggara unik (PIC, di-trim, kosong dibuang). */
  organizers: number;
}

export const COMMUNITY_STAT_LABELS = {
  completed: 'Event Terlaksana',
  organizers: 'Penyelenggara',
  total: 'Total Event',
} as const;

/**
 * Derivasikan statistik komunitas dari daftar event publik.
 * `events` harus sudah bebas dari `status === 'draft'`.
 */
export function deriveCommunityStats(events: EventItem[]): CommunityStats {
  const completed = events.filter(e => e.status === 'past').length;
  const total = events.length;
  const organizers = new Set(events.map(e => e.pic.trim()).filter(Boolean)).size;
  return { completed, total, organizers };
}
