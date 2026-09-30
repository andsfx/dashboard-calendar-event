import { eventOverlapsWindow, getTodayIsoLocal } from './eventDateTime';

// ============================================================
// Rentang tanggal untuk pemilih cakupan ekspor PDF.
//
// Murni matematika tanggal + label Bahasa Indonesia — tidak ada state
// React, tidak ada akses DOM, sehingga bisa diuji langsung. Semua batas
// inklusif dan memakai ISO lokal "YYYY-MM-DD" yang sama dengan filter
// "Hari Ini"/"Akhir Pekan" di /events.
// ============================================================

export type ExportPeriod = 'all' | 'today' | 'week' | 'month' | 'year' | 'theme' | 'custom';

export const EXPORT_PERIODS: Array<{ id: ExportPeriod; label: string }> = [
  { id: 'all', label: 'Semua' },
  { id: 'today', label: 'Hari ini' },
  { id: 'week', label: 'Minggu ini' },
  { id: 'month', label: 'Bulan' },
  { id: 'year', label: 'Tahun' },
  { id: 'theme', label: 'Tema' },
  { id: 'custom', label: 'Rentang khusus' },
];

export const MONTH_LONG_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export interface ExportDateRange {
  start: string;
  end: string;
}

/** Rentang kosong = tanpa batas (semua tanggal). */
export const UNBOUNDED_RANGE: ExportDateRange = { start: '', end: '' };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Bulan ISO "YYYY-MM" → rentang hari pertama s.d. hari terakhir. */
export function monthRange(year: number, monthIndex: number): ExportDateRange {
  // Hari ke-0 bulan berikutnya = hari terakhir bulan ini.
  const last = new Date(year, monthIndex + 1, 0);
  return {
    start: `${year}-${pad(monthIndex + 1)}-01`,
    end: `${year}-${pad(monthIndex + 1)}-${pad(last.getDate())}`,
  };
}

export function yearRange(year: number): ExportDateRange {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/**
 * Rentang tanggal sebuah tema tahunan, atau `null` bila tidak bisa dipakai.
 *
 * Tabel `events` tidak punya kolom tema, jadi tema tidak bisa dijadikan
 * filter langsung pada event. Yang tersedia hanya `date_start`/`date_end`
 * milik tema — dan itu memang cara `/gallery` memasangkan album ke tema
 * (lihat `GalleryIndexPage`: cocokkan `themeId`, kalau tidak ada jatuh ke
 * rentang tanggal). Dipakai sama di sini supaya dua permukaan tidak
 * memberi arti berbeda untuk "tema" yang sama.
 */
export function themeRangeFor(theme: { dateStart: string; dateEnd: string } | undefined): ExportDateRange | null {
  if (!theme) return null;
  const { dateStart, dateEnd } = theme;
  if (!dateStart || !dateEnd) return null;
  return { start: dateStart, end: dateEnd };
}

/** Senin–Minggu pekan yang memuat `now` (minggu kerja, bukan weekend). */
export function weekRange(now = new Date()): ExportDateRange {
  const day = now.getDay(); // 0 = Minggu
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { start: toIso(monday), end: toIso(sunday) };
}

/** Rentang untuk preset non-kustom. `month`/`year` memakai bulan/tahun `now`. */
export function periodRange(
  period: ExportPeriod,
  options: { month?: number; year?: number; now?: Date } = {},
): ExportDateRange {
  const now = options.now ?? new Date();
  const month = options.month ?? now.getMonth();
  const year = options.year ?? now.getFullYear();
  switch (period) {
    case 'today': {
      const today = getTodayIsoLocal(now);
      return { start: today, end: today };
    }
    case 'week':
      return weekRange(now);
    case 'month':
      return monthRange(year, month);
    case 'year':
      return yearRange(year);
    case 'all':
    // 'theme' tidak dihitung di sini: rentangnya datang dari data tema
    // (`themeRangeFor`) dan di-resolve oleh pemanggil `useExportScope`.
    case 'theme':
    case 'custom':
    default:
      return UNBOUNDED_RANGE;
  }
}

/**
 * Filter generik berdasarkan rentang.
 *
 * `getRange` mengembalikan [mulai, selesai] per item; item multi-hari lolos
 * bila rentangnya bersinggungan dengan jendela ekspor (bukan hanya tanggal
 * mulainya) — event 3 hari yang dimulai di akhir bulan tetap ikut ekspor
 * bulan berikutnya kalau memang masih berjalan.
 */
export function filterByExportRange<T>(
  items: T[],
  range: ExportDateRange,
  getRange: (item: T) => { start: string; end?: string },
): T[] {
  if (!range.start && !range.end) return items;
  const winStart = range.start || '0000-01-01';
  const winEnd = range.end || '9999-12-31';
  return items.filter((item) => {
    const { start, end } = getRange(item);
    if (!start) return false;
    return eventOverlapsWindow(start, end, winStart, winEnd);
  });
}

/**
 * Daftar bulan/tahun yang benar-benar ada isinya, untuk mengisi pilihan
 * "Bulan"/"Tahun" supaya pengguna tidak disuguhi periode kosong.
 */
export function availablePeriods(
  isoDates: Array<string | undefined>,
): { months: Array<{ value: string; label: string }>; years: Array<{ value: string; label: string }> } {
  const monthKeys = new Set<string>();
  const yearKeys = new Set<string>();
  for (const iso of isoDates) {
    const match = iso?.match(/^(\d{4})-(\d{2})/);
    if (!match) continue;
    monthKeys.add(`${match[1]}-${match[2]}`);
    yearKeys.add(match[1]!);
  }
  const months = [...monthKeys]
    .sort()
    .reverse()
    .map((key) => {
      const [year, month] = key.split('-');
      const label = `${MONTH_LONG_ID[Number(month) - 1] ?? month} ${year}`;
      return { value: key, label };
    });
  const years = [...yearKeys].sort().reverse().map((value) => ({ value, label: value }));
  return { months, years };
}

/** Label ringkas untuk tombol/keterangan: "Agustus 2026", "1 – 31 Agustus 2026". */
export function describeRange(range: ExportDateRange): string {
  const { start, end } = range;
  if (!start && !end) return 'Semua tanggal';
  if (start && !end) return `Sejak ${formatIsoId(start)}`;
  if (!start && end) return `Sampai ${formatIsoId(end)}`;
  if (start === end) return formatIsoId(start);

  const startMonth = start.slice(0, 7);
  const endMonth = end.slice(0, 7);
  if (startMonth === endMonth) {
    const [year, month] = startMonth.split('-');
    const monthLabel = MONTH_LONG_ID[Number(month) - 1] ?? month;
    return `${Number(start.slice(8, 10))} – ${Number(end.slice(8, 10))} ${monthLabel} ${year}`;
  }
  return `${formatIsoId(start)} – ${formatIsoId(end)}`;
}

/** `2026-08-10` → `10 Agustus 2026`. */
export function formatIsoId(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const monthLabel = MONTH_LONG_ID[Number(match[2]) - 1] ?? match[2];
  return `${Number(match[3])} ${monthLabel} ${match[1]}`;
}
