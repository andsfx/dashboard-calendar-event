// ─── Calendar Links — ICS + Google Calendar (client-side, tanpa serverless) ───
// Fitur "Tambah ke Kalender" untuk halaman detail event publik.
// Reuse parser tanggal/jam dari eventDateTime.ts (sumber kebenaran format "YYYY-MM-DD" + "HH:MM - HH:MM").
import type { EventItem } from '../types';
import { parseIsoDateLocal, parseTimeRange } from './eventDateTime';

const TZ_LABEL = 'Asia/Jakarta'; // Zona waktu resmi event mall (ADR 002 / SPEC §3.3)

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "YYYY-MM-DD" + jam → "YYYYMMDDTHHMMSS" lokal WIB (untuk ICS TZID / Google dates). */
function formatDateTime(dateStr: string, hour: number, minute: number): string | null {
  const base = parseIsoDateLocal(dateStr);
  if (!base) return null;
  return (
    `${base.getFullYear()}${pad(base.getMonth() + 1)}${pad(base.getDate())}` +
    `T${pad(hour)}${pad(minute)}00`
  );
}

/** "YYYY-MM-DD" → "YYYYMMDD" (all-day ICS / Google). */
function addDaysIso(dateStr: string, days: number): string | null {
  const base = parseIsoDateLocal(dateStr);
  if (!base) return null;
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

/** Escape teks sesuai RFC 5545 §3.3.11 (backslash, koma, titik koma, newline). */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Resolve waktu mulai/selesai event → { start, end } lokal WIB, atau null bila tanggal invalid.
 * - Dengan jam ("10:00 - 12:00"): start = tanggal+jam mulai, end = tanggal (event non-multiday
 *   yang jam selesai < jam mulai digulung ke hari berikutnya).
 * - Tanpa jam: all-day — start 00:00 tanggal mulai, end = tanggal berakhir +1 (eksklusif).
 */
function resolveRange(event: EventItem): { start: string; end: string; allDay: boolean } | null {
  const endStr = event.dateEnd || event.dateStr;
  const range = parseTimeRange(event.jam || '');
  if (!range) {
    const start = formatDateTime(event.dateStr, 0, 0);
    const endAfter = addDaysIso(endStr, 1);
    if (!start || !endAfter) return null;
    const end = formatDateTime(endAfter, 0, 0);
    if (!end) return null;
    return { start, end, allDay: true };
  }
  const start = formatDateTime(event.dateStr, range.startHour, range.startMin);
  if (!start) return null;
  // Event satu hari dengan jam melewati tengah malam → end digulung ke besok.
  const crossesMidnight = !event.dateEnd &&
    (range.endHour < range.startHour || (range.endHour === range.startHour && range.endMin < range.startMin));
  const endDateStr = crossesMidnight ? addDaysIso(event.dateStr, 1) : endStr;
  const end = formatDateTime(endDateStr || event.dateStr, range.endHour, range.endMin);
  if (!end) return null;
  return { start, end, allDay: false };
}

/** URL "Tambah ke Google Calendar" — null bila tanggal event invalid. */
export function buildGoogleCalendarUrl(event: EventItem): string | null {
  const range = resolveRange(event);
  if (!range) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.acara,
    dates: range.allDay
      ? `${range.start.slice(0, 8)}/${range.end.slice(0, 8)}` // Google all-day: YYYYMMDD/YYYYMMDD
      : `${range.start}/${range.end}`,
    ctz: TZ_LABEL,
  });
  if (event.keterangan) params.set('details', event.keterangan);
  if (event.lokasi) params.set('location', event.lokasi);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Blob file .ics (RFC 5545) untuk unduhan Apple Calendar / Outlook / Android.
 * Warna zona: DTSTART/DTEND pakai TZID=Asia/Jakarta (WIB tetap WIB walau jam device beda).
 * Return null bila tanggal event invalid — caller menyembunyikan tombol.
 */
export function buildIcsBlob(event: EventItem): Blob | null {
  const range = resolveRange(event);
  if (!range) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Metmal//Events//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@metmalcommunityspace.web.id`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    range.allDay
      ? `DTSTART;VALUE=DATE:${range.start.slice(0, 8)}`
      : `DTSTART;TZID=${TZ_LABEL}:${range.start}`,
    range.allDay
      ? `DTEND;VALUE=DATE:${range.end.slice(0, 8)}`
      : `DTEND;TZID=${TZ_LABEL}:${range.end}`,
    `SUMMARY:${escapeIcsText(event.acara)}`,
    event.lokasi ? `LOCATION:${escapeIcsText(event.lokasi)}` : '',
    event.keterangan ? `DESCRIPTION:${escapeIcsText(event.keterangan)}` : '',
    event.id ? `URL:${origin}/events/${event.id}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
}

/** Nama file unduhan: slug acara + tanggal. */
export function icsFileName(event: EventItem): string {
  const slug = event.acara
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${slug || 'event'}-${event.dateStr}.ics`;
}