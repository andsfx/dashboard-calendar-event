import { EventItem } from '../../types';

const priorityRank: Record<EventItem['priority'], number> = { high: 0, medium: 1, low: 2 };

export function compareUpcomingEvents(a: EventItem, b: EventItem): number {
  const byPriority = priorityRank[a.priority] - priorityRank[b.priority];
  if (byPriority !== 0) return byPriority;
  if (a.status !== b.status) {
    return a.status === 'upcoming' ? -1 : 1;
  }
  return a.dateStr.localeCompare(b.dateStr);
}

/**
 * P0-3: section event tidak pernah kosong tanpa alasan.
 * - Event `ongoing` selalu dimasukkan (masih berlangsung = relevan sekarang),
 *   meskipun `dateStr`-nya bulan lalu.
 * - Hanya event `upcoming` yang dibatasi bulan berjalan (`monthKey` = "YYYY-MM").
 * - Jika gabungan hasilnya kosong → fallback ke event terdekat tanpa filter bulan.
 */
export function filterUpcomingForMonth(events: EventItem[], monthKey: string): EventItem[] {
  const relevant = events.filter(e => e.status === 'upcoming' || e.status === 'ongoing');
  const currentMonth = relevant.filter(e => e.status === 'ongoing' || e.dateStr.startsWith(monthKey));
  const source = currentMonth.length > 0 ? currentMonth : relevant;
  return source.slice().sort(compareUpcomingEvents);
}
