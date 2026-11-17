/**
 * Builder feed ICS (RFC 5545) untuk jadwal event publik.
 *
 * Dipakai `GET /api/v1/calendar.ics`: satu URL langganan yang bisa ditambahkan
 * ke Google Calendar ("Kalender lain → Dari URL"), Apple Calendar, atau
 * Outlook. Setiap event ditulis sebagai VEVENT dengan UID stabil
 * (`<id>@metmalcommunityspace.web.id`) supaya perubahan jadwal memperbarui
 * entri yang sama, bukan menduplikasinya.
 *
 * Aturan waktu mengikuti `src/utils/calendarLinks.ts` (sumber kebenaran versi
 * klien): jam WIB ditulis sebagai wall-clock + `TZID=Asia/Jakarta`, bukan UTC.
 * Event tanpa jam jadi all-day, dan `DTEND` all-day bersifat eksklusif
 * (tanggal berakhir + 1 hari).
 */

export const ICS_TIMEZONE = 'Asia/Jakarta';
export const ICS_SITE_ORIGIN = 'https://www.metmalcommunityspace.web.id';

const CALENDAR_NAME = 'Jadwal Event Metropolitan Mall Bekasi';
const CALENDAR_DESCRIPTION =
  'Jadwal event publik Metropolitan Mall Bekasi. Berlangganan agar perubahan jadwal ikut tersinkron.';
const UID_DOMAIN = 'metmalcommunityspace.web.id';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RANGE_RE = /^([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)$/;

function pad(value) {
  return String(value).padStart(2, '0');
}

/** Tanggal kalender yang benar-benar ada (2026-02-31 ditolak, bukan digeser). */
function parseIsoDate(value) {
  const match = ISO_DATE_RE.exec(String(value || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function addDaysIso(value, days) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function formatLocalDateTime(value, hour, minute) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${parsed.year}${pad(parsed.month)}${pad(parsed.day)}T${pad(hour)}${pad(minute)}00`;
}

/** UTC stamp untuk DTSTAMP (RFC mewajibkan bentuk UTC berakhiran Z). */
function utcStamp(now) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Rentang jam dua sisi "10:00 - 12:00"; titik (10.00) dinormalkan seperti klien. */
export function parseTimeRange(value) {
  const normalized = String(value || '').trim().replace(/\./g, ':');
  const match = TIME_RANGE_RE.exec(normalized);
  if (!match) return null;
  return {
    startHour: Number(match[1]),
    startMin: Number(match[2]),
    endHour: Number(match[3]),
    endMin: Number(match[4]),
  };
}

/** Escape teks properti sesuai RFC 5545 §3.3.11. */
export function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/**
 * Lipat baris pada 75 oktet (RFC 5545 §3.1). Dihitung per byte UTF-8, bukan
 * per karakter: nama acara berhuruf non-ASCII bisa melewati batas jauh lebih
 * cepat daripada hitungan `length`.
 */
export function foldIcsLine(line) {
  const chunks = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8');
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

function joinIcs(lines) {
  return `${lines.filter(Boolean).map(foldIcsLine).join('\r\n')}\r\n`;
}

/**
 * Resolve rentang satu baris jadwal (satu event, atau satu slot harian).
 * Mengembalikan null bila tanggal tidak valid supaya baris rusak dilewati,
 * bukan membuat seluruh feed gagal.
 */
export function resolveEventRange(event) {
  const startDate = event.date_str || event.dateStr || '';
  const endDate = event.date_end || event.dateEnd || startDate;
  const range = parseTimeRange(event.jam);

  if (!range) {
    const start = formatLocalDateTime(startDate, 0, 0);
    const exclusiveEndDate = addDaysIso(endDate, 1);
    const end = exclusiveEndDate ? formatLocalDateTime(exclusiveEndDate, 0, 0) : null;
    if (!start || !end) return null;
    return { start, end, allDay: true };
  }

  const start = formatLocalDateTime(startDate, range.startHour, range.startMin);
  if (!start) return null;

  const crossesMidnight =
    !event.date_end &&
    !event.dateEnd &&
    (range.endHour < range.startHour ||
      (range.endHour === range.startHour && range.endMin < range.startMin));
  const endDateValue = crossesMidnight ? addDaysIso(startDate, 1) : endDate;
  const end = endDateValue
    ? formatLocalDateTime(endDateValue, range.endHour, range.endMin)
    : null;
  if (!end) return null;
  return { start, end, allDay: false };
}

function readSlots(event) {
  let slots = event.day_time_slots;
  if (typeof slots === 'string') {
    try {
      slots = JSON.parse(slots);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(slots)) return [];
  const seen = new Set();
  return slots.filter((slot) => {
    if (!slot || typeof slot !== 'object' || !parseIsoDate(slot.date)) return false;
    const key = `${slot.date}|${slot.jam || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildVevent(event, { uid, stamp, origin }) {
  const range = resolveEventRange(event);
  if (!range) return [];

  const pageUrl = event.id ? `${origin}/events/${event.id}` : '';
  const jamLabel = String(event.jam || '').trim();
  const description = [
    String(event.keterangan || '').trim(),
    // "13.00 WIB" dan "11.00 WIB - selesai" tidak punya jam selesai yang bisa
    // dipercaya; event tetap all-day, jam aslinya dibawa di deskripsi.
    range.allDay && /\d/.test(jamLabel) ? `Jam: ${jamLabel}` : '',
    pageUrl ? `Detail: ${pageUrl}` : '',
  ].filter(Boolean).join('\n');

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    range.allDay
      ? `DTSTART;VALUE=DATE:${range.start.slice(0, 8)}`
      : `DTSTART;TZID=${ICS_TIMEZONE}:${range.start}`,
    range.allDay
      ? `DTEND;VALUE=DATE:${range.end.slice(0, 8)}`
      : `DTEND;TZID=${ICS_TIMEZONE}:${range.end}`,
    `SUMMARY:${escapeIcsText(event.acara || 'Event Metropolitan Mall Bekasi')}`,
    `LOCATION:${escapeIcsText(event.lokasi || 'Metropolitan Mall Bekasi')}`,
    description ? `DESCRIPTION:${escapeIcsText(description)}` : '',
    pageUrl ? `URL:${pageUrl}` : '',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ].filter(Boolean);
}

/**
 * Zona waktu WIB tanpa DST. Sebagian klien (Outlook) menolak `TZID` yang tidak
 * didefinisikan, jadi definisi ini ikut dikirim meski Google Calendar bisa
 * menyelesaikan `Asia/Jakarta` sendiri.
 */
function vtimezoneLines() {
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${ICS_TIMEZONE}`,
    `X-LIC-LOCATION:${ICS_TIMEZONE}`,
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
 * Bangun feed lengkap dari baris `events` (snake_case, hasil query publik).
 *
 * Event multi-hari yang punya `day_time_slots` ditulis satu VEVENT per slot:
 * jadwal harian bisa berbeda jam, dan satu VEVENT raksasa akan menampilkan
 * event sepanjang hari di setiap tanggal.
 */
export function buildCalendarFeed(events, { now = new Date(), origin = ICS_SITE_ORIGIN } = {}) {
  const stamp = utcStamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Metropolitan Mall Bekasi//Jadwal Event//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(CALENDAR_NAME)}`,
    `X-WR-CALDESC:${escapeIcsText(CALENDAR_DESCRIPTION)}`,
    `X-WR-TIMEZONE:${ICS_TIMEZONE}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...vtimezoneLines(),
  ];

  events.forEach((event, index) => {
    const baseUid = `${event.id || `event-${index + 1}`}@${UID_DOMAIN}`;
    const slots = readSlots(event);
    if (slots.length === 0) {
      lines.push(...buildVevent(event, { uid: baseUid, stamp, origin }));
      return;
    }
    slots.forEach((slot, slotIndex) => {
      lines.push(
        ...buildVevent(
          {
            ...event,
            date_str: slot.date,
            date_end: null,
            dateEnd: null,
            jam: typeof slot.jam === 'string' ? slot.jam : '',
          },
          {
            uid: `${event.id || `event-${index + 1}`}-${slot.date}-${slotIndex}@${UID_DOMAIN}`,
            stamp,
            origin,
          },
        ),
      );
    });
  });

  lines.push('END:VCALENDAR');
  return joinIcs(lines);
}