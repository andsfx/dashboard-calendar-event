import { describe, expect, it } from 'vitest';
import {
  availablePeriods,
  describeRange,
  filterByExportRange,
  formatIsoId,
  monthRange,
  periodRange,
  weekRange,
  yearRange,
} from '../exportDateRange';

// Rabu, 16 September 2026 — titik acuan yang tidak ambigu (bukan batas pekan/bulan).
const WED = new Date(2026, 8, 16);

describe('exportDateRange — rentang preset', () => {
  it('hari ini = satu hari', () => {
    expect(periodRange('today', { now: WED })).toEqual({ start: '2026-09-16', end: '2026-09-16' });
  });

  it('minggu ini = Senin sampai Minggu', () => {
    expect(weekRange(WED)).toEqual({ start: '2026-09-14', end: '2026-09-20' });
  });

  it('minggu ini pada hari Minggu tetap milik pekan yang sedang berjalan', () => {
    // Regresi: offset lama bisa melempar Minggu ke pekan berikutnya.
    const sunday = new Date(2026, 8, 20);
    expect(weekRange(sunday)).toEqual({ start: '2026-09-14', end: '2026-09-20' });
  });

  it('bulan = hari pertama sampai hari terakhir', () => {
    expect(monthRange(2026, 8)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });

  it('bulan Februari tahun kabisat berakhir 29', () => {
    expect(monthRange(2028, 1)).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    expect(monthRange(2027, 1)).toEqual({ start: '2027-02-01', end: '2027-02-28' });
  });

  it('tahun = 1 Januari sampai 31 Desember', () => {
    expect(yearRange(2026)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });

  it('bulan dan tahun memakai nilai yang diminta, bukan "sekarang"', () => {
    expect(periodRange('month', { year: 2025, month: 0, now: WED })).toEqual({ start: '2025-01-01', end: '2025-01-31' });
    expect(periodRange('year', { year: 2025, now: WED })).toEqual({ start: '2025-01-01', end: '2025-12-31' });
  });

  it('semua dan rentang khusus tanpa batas', () => {
    expect(periodRange('all', { now: WED })).toEqual({ start: '', end: '' });
    expect(periodRange('custom', { now: WED })).toEqual({ start: '', end: '' });
  });
});

describe('exportDateRange — filter', () => {
  const items = [
    { id: 'a', start: '2026-08-31', end: '2026-09-02' },
    { id: 'b', start: '2026-09-10' },
    { id: 'c', start: '2026-10-01' },
    { id: 'd', start: '2025-12-31' },
  ];
  const rangeOf = (item: (typeof items)[number]) => ({ start: item.start, end: item.end });

  it('rentang kosong berarti semua item', () => {
    expect(filterByExportRange(items, { start: '', end: '' }, rangeOf).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('menyaring bulan dan mengecualikan bulan lain', () => {
    expect(filterByExportRange(items, monthRange(2026, 8), rangeOf).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('event multi-hari lolos kalau hanya beririsan, bukan hanya kalau mulai di dalam rentang', () => {
    // 'a' mulai 31 Agustus tapi masih berjalan sampai 2 September.
    expect(filterByExportRange(items, monthRange(2026, 8), rangeOf).map((i) => i.id)).toContain('a');
  });

  it('hanya batas awal atau hanya batas akhir', () => {
    expect(filterByExportRange(items, { start: '2026-09-10', end: '' }, rangeOf).map((i) => i.id)).toEqual(['b', 'c']);
    expect(filterByExportRange(items, { start: '', end: '2026-09-10' }, rangeOf).map((i) => i.id)).toEqual(['a', 'b', 'd']);
  });

  it('membuang item tanpa tanggal saat rentang aktif', () => {
    const withBlank = [...items, { id: 'e', start: '' }];
    expect(filterByExportRange(withBlank, monthRange(2026, 8), rangeOf).map((i) => i.id)).not.toContain('e');
    expect(filterByExportRange(withBlank, { start: '', end: '' }, rangeOf).map((i) => i.id)).toContain('e');
  });
});

describe('exportDateRange — periode yang tersedia', () => {
  it('hanya memuat bulan/tahun yang ada datanya, terbaru dulu', () => {
    const { months, years } = availablePeriods(['2026-08-10', '2026-09-01', '2025-12-31', '2026-09-20', undefined]);
    expect(months.map((m) => m.value)).toEqual(['2026-09', '2026-08', '2025-12']);
    expect(months[0]?.label).toBe('September 2026');
    expect(years.map((y) => y.value)).toEqual(['2026', '2025']);
  });

  it('daftar kosong bila tidak ada tanggal valid', () => {
    expect(availablePeriods(['', undefined]).months).toEqual([]);
    expect(availablePeriods(['', undefined]).years).toEqual([]);
  });
});

describe('exportDateRange — label', () => {
  it('meringkas rentang di dalam satu bulan', () => {
    expect(describeRange({ start: '2026-08-01', end: '2026-08-31' })).toBe('1 – 31 Agustus 2026');
  });

  it('menulis lengkap saat lintas bulan', () => {
    expect(describeRange({ start: '2026-08-30', end: '2026-09-02' })).toBe('30 Agustus 2026 – 2 September 2026');
  });

  it('rentang tanpa batas dan setengah terisi', () => {
    expect(describeRange({ start: '', end: '' })).toBe('Semua tanggal');
    expect(describeRange({ start: '2026-08-10', end: '' })).toBe('Sejak 10 Agustus 2026');
    expect(describeRange({ start: '', end: '2026-08-10' })).toBe('Sampai 10 Agustus 2026');
  });

  it('satu hari cukup ditulis sekali', () => {
    expect(describeRange({ start: '2026-08-10', end: '2026-08-10' })).toBe('10 Agustus 2026');
  });

  it('format tanggal Indonesia', () => {
    expect(formatIsoId('2026-01-05')).toBe('5 Januari 2026');
    expect(formatIsoId('bukan-tanggal')).toBe('bukan-tanggal');
  });
});
