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
  /**
   * Penyelenggara unik — dibaca dari `eo`, nama penyelenggara yang dipakai
   * SELURUH permukaan lain (CalendarView, EventTable, FeaturedEvents, dan
   * detail event publik, semuanya "Penyelenggara: {eo}"). `pic` hanya
   * cadangan bila `eo` kosong.
   *
   * Sebelumnya angka ini dihitung dari `pic` (nama PIC/kontak). Di produksi
   * `pic` NULL untuk SEMUA event, jadi band kepercayaan menampilkan
   * "- Penyelenggara" di bawah 234+ dan 254+ — satu-satunya angka yang
   * kosong, tepat di label yang paling menjual.
   */
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
  const organizers = new Set(
    events.map(e => (e.eo || e.pic || '').trim()).filter(Boolean),
  ).size;
  return { completed, total, organizers };
}
