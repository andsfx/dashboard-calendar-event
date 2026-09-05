// ─── Area Conflict — deteksi double-booking space (Fase 4 space entity) ───
// Soft warning di form admin: area yang sama dipakai event lain pada rentang tanggal overlap.
// Area mall sah menggelar dua aktivasi kecil paralel — admin bisa override lewat checkbox.
import type { EventItem } from '../types';
import { parseIsoDateLocal } from './eventDateTime';

function isoToTime(iso: string): number | null {
  const d = parseIsoDateLocal(iso);
  return d ? d.getTime() : null;
}

/** Rentang event efektif: [dateStr, dateEnd ?? dateStr]. */
function eventRange(ev: EventItem): { start: number; end: number } | null {
  const start = isoToTime(ev.dateStr);
  if (start === null) return null;
  const end = isoToTime(ev.dateEnd || ev.dateStr);
  if (end === null) return null;
  return { start, end };
}

/**
 * Event lain yang memakai `areaId` sama dengan rentang tanggal overlap.
 * `excludeId` = id event yang sedang diedit (self tidak dihitung konflik).
 */
export function findAreaConflicts(
  areaId: string,
  dateStr: string,
  dateEnd: string | undefined,
  excludeId: string | undefined,
  events: EventItem[],
): EventItem[] {
  if (!areaId) return [];
  const start = isoToTime(dateStr);
  if (start === null) return [];
  const end = isoToTime(dateEnd || dateStr);
  if (end === null) return [];
  return events.filter(ev => {
    if (ev.id === excludeId) return false;
    if (ev.areaId !== areaId) return false;
    const range = eventRange(ev);
    if (!range) return false;
    return range.start <= end && range.end >= start;
  });
}