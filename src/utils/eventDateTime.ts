import { getStatus as getStatusCanonical } from './eventUtils';

export type EventStatus = 'upcoming' | 'ongoing' | 'past';

export interface TimeRange {
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}

export function parseIsoDateLocal(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function getTodayIsoLocal(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseTimeRange(jam: string): TimeRange | null {
  const normalized = jam.trim().replace(/\./g, ':');
  const match = /^([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)$/.exec(normalized);
  if (!match) return null;
  return {
    startHour: Number(match[1]),
    startMin: Number(match[2]),
    endHour: Number(match[3]),
    endMin: Number(match[4]),
  };
}

/** Thin wrapper — canonical logic lives in eventUtils.getStatus (SPEC §3.3). */
export function getStatus(dateStr: string, jam: string, now = new Date()): EventStatus {
  return getStatusCanonical(dateStr, jam, undefined, undefined, now);
}
