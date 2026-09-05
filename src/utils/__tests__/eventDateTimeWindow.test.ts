/**
 * Tes filter window — preset "Hari Ini" / "Akhir Pekan Ini" di /events:
 * - eventOverlapsWindow: rentang event overlap window (multi-day, single-day, null end).
 * - getWeekendWindow: Sabtu–Minggu; jika hari ini sudah weekend, pakai yang berjalan.
 */
import { describe, it, expect } from 'vitest';
import { eventOverlapsWindow, getWeekendWindow } from '../eventDateTime';

describe('eventOverlapsWindow', () => {
  it('event satu hari di dalam window → true', () => {
    expect(eventOverlapsWindow('2026-09-05', undefined, '2026-09-05', '2026-09-05')).toBe(true);
  });

  it('event multi-day memotong window → true', () => {
    expect(eventOverlapsWindow('2026-09-03', '2026-09-07', '2026-09-05', '2026-09-06')).toBe(true);
  });

  it('event sebelum window → false', () => {
    expect(eventOverlapsWindow('2026-09-01', '2026-09-03', '2026-09-05', '2026-09-06')).toBe(false);
  });

  it('event setelah window → false', () => {
    expect(eventOverlapsWindow('2026-09-10', undefined, '2026-09-05', '2026-09-06')).toBe(false);
  });

  it('dateEnd null berarti single-day (bukan terbuka)', () => {
    expect(eventOverlapsWindow('2026-09-05', undefined, '2026-09-01', '2026-09-02')).toBe(false);
    expect(eventOverlapsWindow('2026-09-05', undefined, '2026-09-01', '2026-09-05')).toBe(true);
  });
});

describe('getWeekendWindow', () => {
  it('Rabu (2026-09-02) → weekend mendatang Sabtu 5–Minggu 6 Sep', () => {
    const win = getWeekendWindow(new Date(2026, 8, 2));
    expect(win.start).toBe('2026-09-05');
    expect(win.end).toBe('2026-09-06');
  });

  it('Sabtu (2026-09-05) → weekend berjalan hari itu juga', () => {
    const win = getWeekendWindow(new Date(2026, 8, 5));
    expect(win.start).toBe('2026-09-05');
    expect(win.end).toBe('2026-09-06');
  });

  it('Minggu (2026-09-06) → masih weekend berjalan (Sabtu–Minggu sama)', () => {
    const win = getWeekendWindow(new Date(2026, 8, 6));
    expect(win.start).toBe('2026-09-05');
    expect(win.end).toBe('2026-09-06');
  });
});