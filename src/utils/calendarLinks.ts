// ─── Calendar Links — ICS + Google Calendar (client-side, tanpa serverless) ───
// Fitur "Tambah ke Kalender" per event, plus feed langganan seluruh jadwal
// (`GET /api/v1/calendar.ics`) yang bisa ditambahkan ke Google Calendar,
// Apple Calendar, atau Outlook.
//
// Reuse parser tanggal/jam dari eventDateTime.ts (sumber kebenaran format
// "YYYY-MM-DD" + "HH:MM - HH:MM"). Aturan waktu di sini harus tetap sejalan
// dengan `server/src/lib/ics.js`: jam WIB ditulis wall-clock + TZID, all-day
// memakai DTEND eksklusif.
import type { EventItem } from '../types';
import { parseIsoDateLocal, parseTimeRange } from './eventDateTime';
import { apiUrl } from '../lib/rest';

const TZ_LABEL = 'Asia/Jakarta'; // Zona waktu resmi event mall (ADR 002 / SPEC §3.3)
const SITE_ORIGIN = 'https://www.metmalcommunityspace.web.id';
const UID_DOMAIN = 'metmalcommunityspace.web.id';
const DEFAULT_CALENDAR_NAME = 'Jadwal Event Metropolitan Mall Bekasi';

/** Nama berkas unduhan feed lengkap. */
export const CALENDAR_ICS_FILE_NAME = 'jadwal-event-mmb.ics';

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
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** Panjang UTF-8 satu code point tanpa mengalokasikan buffer. */
function utf8Length(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code <= 0x7f) return 1;
  if (code <= 0x7ff) return 2;
  if (code <= 0xffff) return 3;
  return 4;
}

/** Lipat baris pada 75 oktet (RFC 5545 §3.1); hitung byte UTF-8, bukan karakter. */
function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = utf8Length(char);
    if (current !== '' && bytes + size > 75) {
      chunks.push(current);
      current = ` ${char}`;
      bytes = 1 + size;
    } else {
      current += char;
      bytes += size;
    }
  }
  chunks.push(current);
  return chunks.join('\r\n');
}

function joinIcs(lines: string[]): string {
  return `${lines.filter(Boolean).map(foldIcsLine).join('\r\n')}\r\n`;
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Zona WIB tanpa DST; Outlook menolak TZID yang tidak didefinisikan. */
function vtimezoneLines(): string[] {
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${TZ_LABEL}`,
    `X-LIC-LOCATION:${TZ_LABEL}`,
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0700',
    'TZOFFSETTO:+0700',
    'TZNAME:WIB',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
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

interface VeventOptions {
  uid: string;
  stamp: string;
  origin: string;
}

function eventVeventLines(event: EventItem, { uid, stamp, origin }: VeventOptions): string[] {
  const range = resolveRange(event);
  if (!range) return [];
  const pageUrl = event.id ? `${origin}/events/${event.id}` : '';
  const jamLabel = (event.jam || '').trim();
  const description = [
    (event.keterangan || '').trim(),
    // Jam tunggal seperti "13.00 WIB" atau "11.00 WIB - selesai" tidak bisa
    // dijadikan DTSTART tanpa mengarang durasi. Event tetap all-day, tetapi
    // jam aslinya dibawa di deskripsi agar subscriber melihatnya.
    range.allDay && /\d/.test(jamLabel) ? `Jam: ${jamLabel}` : '',
    pageUrl ? `Detail: ${pageUrl}` : '',
  ].filter(Boolean).join('\n');

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    range.allDay
      ? `DTSTART;VALUE=DATE:${range.start.slice(0, 8)}`
      : `DTSTART;TZID=${TZ_LABEL}:${range.start}`,
    range.allDay
      ? `DTEND;VALUE=DATE:${range.end.slice(0, 8)}`
      : `DTEND;TZID=${TZ_LABEL}:${range.end}`,
    `SUMMARY:${escapeIcsText(event.acara || 'Event Metropolitan Mall Bekasi')}`,
    event.lokasi ? `LOCATION:${escapeIcsText(event.lokasi)}` : '',
    description ? `DESCRIPTION:${escapeIcsText(description)}` : '',
    pageUrl ? `URL:${pageUrl}` : '',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ].filter(Boolean);
}

/**
 * Satu event → satu atau beberapa VEVENT. Multi-hari ber-`dayTimeSlots`
 * dipecah per slot supaya unduhan `.ics` dan feed langganan server punya
 * bentuk yang sama (bukan satu rentang raksasa).
 */
function buildEventLines(
  event: EventItem,
  { uidBase, stamp, origin }: { uidBase: string; stamp: string; origin: string },
): string[] {
  const slots = Array.isArray(event.dayTimeSlots)
    ? event.dayTimeSlots.filter((slot) => parseIsoDateLocal(slot.date))
    : [];

  if (slots.length === 0) {
    return eventVeventLines(event, { uid: `${uidBase}@${UID_DOMAIN}`, stamp, origin });
  }

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const slot of slots) {
    const key = `${slot.date}|${slot.jam || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(
      ...eventVeventLines(
        { ...event, dateStr: slot.date, dateEnd: undefined, jam: slot.jam || '' },
        {
          uid: `${uidBase}-${slot.date}-${seen.size - 1}@${UID_DOMAIN}`,
          stamp,
          origin,
        },
      ),
    );
  }
  return lines;
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
  const jamLabel = (event.jam || '').trim();
  const details = [
    event.keterangan,
    range.allDay && /\d/.test(jamLabel) ? `Jam: ${jamLabel}` : '',
  ].filter(Boolean).join('\n');
  if (details) params.set('details', details);
  if (event.lokasi) params.set('location', event.lokasi);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Blob file .ics (RFC 5545) untuk unduhan Apple Calendar / Outlook / Android.
 * Warna zona: DTSTART/DTEND pakai TZID=Asia/Jakarta (WIB tetap WIB walau jam device beda).
 * Return null bila tanggal event invalid — caller menyembunyikan tombol.
 */
export function buildIcsBlob(event: EventItem): Blob | null {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_ORIGIN;
  const eventLines = buildEventLines(event, {
    uidBase: event.id || 'event',
    stamp: utcStamp(new Date()),
    origin,
  });
  if (eventLines.length === 0) return null;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Metmal//Events//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vtimezoneLines(),
    ...eventLines,
    'END:VCALENDAR',
  ];
  return new Blob([joinIcs(lines)], { type: 'text/calendar;charset=utf-8' });
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

/**
 * URL feed langganan absolut. `apiUrl` mengembalikan path relatif saat
 * `VITE_API_URL` kosong (dev memakai proxy Vite), jadi path itu diabsolutkan
 * ke origin halaman supaya tombol salin menghasilkan URL yang bisa ditempel.
 */
export function calendarFeedUrl(): string {
  const raw = apiUrl('/calendar.ics');
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
  if (typeof window === 'undefined') return raw;
  try {
    return new URL(raw, window.location.origin).toString();
  } catch {
    return raw;
  }
}

/**
 * Deep link langganan Google Calendar. Google meminta URL `webcal://`;
 * `render?cid=` dengan URL https juga berfungsi di sebagian akun, tetapi
 * bentuk webcal adalah yang paling konsisten.
 */
export function googleCalendarSubscribeUrl(feedUrl: string): string {
  const webcal = feedUrl.replace(/^https?:\/\//i, 'webcal://');
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
}

/**
 * Blob feed lengkap untuk unduhan .ics sekali klik (fallback bila langganan
 * gagal). Event multi-hari ber-`dayTimeSlots` dipecah per slot, sama seperti
 * feed server, supaya jam tiap hari tidak tampil sebagai satu rentang raksasa.
 */
export function buildEventsIcsBlob(
  events: EventItem[],
  options: { name?: string; now?: Date } = {},
): Blob {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_ORIGIN;
  const stamp = utcStamp(options.now ?? new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Metropolitan Mall Bekasi//Jadwal Event//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.name ?? DEFAULT_CALENDAR_NAME)}`,
    `X-WR-TIMEZONE:${TZ_LABEL}`,
    'X-PUBLISHED-TTL:PT6H',
    ...vtimezoneLines(),
  ];

  events.forEach((event, index) => {
    lines.push(
      ...buildEventLines(event, {
        uidBase: event.id || `event-${index + 1}`,
        stamp,
        origin,
      }),
    );
  });

  lines.push('END:VCALENDAR');
  return new Blob([joinIcs(lines)], { type: 'text/calendar;charset=utf-8' });
}