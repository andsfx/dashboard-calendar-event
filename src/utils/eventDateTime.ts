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
/** ISO besok (lokal, bukan UTC) — untuk preset filter "Besok" di /events. */
export function getTomorrowIsoLocal(now = new Date()): string {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Parse rentang jam dua sisi ("10:00 - 12:00"; titik dinormalkan jadi titik dua).
 * Kontrak ini SENGAJA hanya menerima rentang: pemakai seperti `calendarLinks`
 * memutuskan all-day vs berdurasi berdasarkan hasilnya, jadi jam tunggal tidak
 * boleh menghasilkan rentang palsu. Untuk jam mulai saja, pakai `parseStartTime`.
 */
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

export interface StartTime {
  startHour: number;
  startMin: number;
}

const START_TIME_RE = /^([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)/;

/**
 * Ambil jam mulai dari nilai yang mungkin hanya berisi satu jam ("13:00",
 * "13.00 WIB") atau jam mulai di awal teks ("11.00 WIB - selesai").
 * Hanya untuk titik mulai — durasi tetap milik `parseTimeRange`.
 */
export function parseStartTime(jam: string): StartTime | null {
  const match = START_TIME_RE.exec(jam.trim());
  if (!match) return null;
  return { startHour: Number(match[1]), startMin: Number(match[2]) };
}

/** Thin wrapper — canonical logic lives in eventUtils.getStatus (SPEC §3.3). */
export function getStatus(dateStr: string, jam: string, now = new Date()): EventStatus {
  return getStatusCanonical(dateStr, jam, undefined, undefined, now);
}

/**
 * Cek apakah rentang event [dateStr, dateEnd ?? dateStr] overlap window [winStart, winEnd]
 * (keduanya ISO "YYYY-MM-DD", inklusif). Dipakai filter preset "Hari Ini" / "Akhir Pekan Ini".
 */
export function eventOverlapsWindow(
  dateStr: string,
  dateEnd: string | undefined,
  winStartIso: string,
  winEndIso: string,
): boolean {
  const end = dateEnd || dateStr;
  return dateStr <= winEndIso && end >= winStartIso;
}

/** Rentang ISO weekend berjalan/mendatang: Sabtu–Minggu (kalau hari ini Sabtu/Minggu, pakai weekend yang sama). */
export function getWeekendWindow(now = new Date()): { start: string; end: string } {
  const day = now.getDay(); // 0 = Minggu, 6 = Sabtu
  const offsetToSaturday = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetToSaturday);
  const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { start: fmt(saturday), end: fmt(sunday) };
}
/**
 * Label relatif hari untuk card event (pattern Eventbrite "Tomorrow"):
 * 'Hari ini' / 'Besok' bila dateStr cocok dengan hari ini/besok, selain itu null
 * (tanggal absolut tetap ditampilkan).
 */
export function relativeDayLabel(dateStr: string, now = new Date()): string | null {
  if (dateStr === getTodayIsoLocal(now)) return 'Hari ini';
  if (dateStr === getTomorrowIsoLocal(now)) return 'Besok';
  return null;
}

/**
 * Hitung mundur ke awal event (pattern Eventbrite urgency):
 * "H-x" bila mulai >24 jam lagi, "x jam lagi" di hari-H sebelum mulai,
 * null bila sudah mulai/lewat atau tanggal invalid.
 * Dipakai sebagai chip urgency di EventRailCard + EventPublicDetailPage.
 */
export function countdownLabel(dateStr: string, jam: string, now = new Date()): string | null {
  const start = parseIsoDateLocal(dateStr);
  if (!start) return null;
  // Rentang dua sisi → jam mulai persis; jam tunggal ("13:00", "13.00 WIB")
  // tetap memberi countdown berbasis jam, bukan selisih hari kalender.
  const range = parseTimeRange(jam) ?? parseStartTime(jam);
  if (!range) {
    // Jam tak-terparse: hitung selisih hari kalender saja (hindari "x jam lagi" palsu).
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const days = Math.round((start.getTime() - todayMid) / 86_400_000);
    return days >= 1 ? `H-${days}` : null;
  }
  const target = new Date(
    start.getFullYear(), start.getMonth(), start.getDate(),
    range.startHour, range.startMin,
  );
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return null;
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `${Math.max(1, hours)} jam lagi`;
  return `H-${Math.floor(diffMs / 86_400_000)}`;
}
