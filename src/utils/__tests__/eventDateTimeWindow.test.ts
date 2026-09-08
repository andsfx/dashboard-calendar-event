/**
 * Tes filter window + label relatif — preset "Hari Ini" / "Besok" / "Akhir Pekan Ini" di /events:
 * - eventOverlapsWindow: rentang event overlap window (multi-day, single-day, null end).
 * - getWeekendWindow: Sabtu–Minggu; jika hari ini sudah weekend, pakai yang berjalan.
 * - getTomorrowIsoLocal / relativeDayLabel: ISO lokal besok; label 'Hari ini' / 'Besok' / null.
 */
import { describe, it, expect } from 'vitest';
import { countdownLabel, eventOverlapsWindow, getTomorrowIsoLocal, getWeekendWindow, relativeDayLabel } from '../eventDateTime';
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

describe('getTomorrowIsoLocal', () => {
  it('Rabu 2026-09-02 → besok Kamis 2026-09-03', () => {
    expect(getTomorrowIsoLocal(new Date(2026, 8, 2))).toBe('2026-09-03');
  });

  it('ganti bulan: 30 Sep → 1 Okt', () => {
    expect(getTomorrowIsoLocal(new Date(2026, 8, 30))).toBe('2026-10-01');
  });

  it('ganti tahun: 31 Des → 1 Jan tahun berikut', () => {
    expect(getTomorrowIsoLocal(new Date(2026, 11, 31))).toBe('2027-01-01');
  });
});

describe('relativeDayLabel', () => {
  it('event hari ini → "Hari ini"', () => {
    expect(relativeDayLabel('2026-09-02', new Date(2026, 8, 2))).toBe('Hari ini');
  });

  it('event besok → "Besok"', () => {
    expect(relativeDayLabel('2026-09-03', new Date(2026, 8, 2))).toBe('Besok');
  });

  it('event lusa → null (tanggal absolut dipakai)', () => {
    expect(relativeDayLabel('2026-09-04', new Date(2026, 8, 2))).toBeNull();
  });

  it('event kemarin (tapi status upcoming) → null', () => {
    expect(relativeDayLabel('2026-09-01', new Date(2026, 8, 2))).toBeNull();
  });
});

describe('countdownLabel', () => {
  it('5 hari lagi (jam terparse) → "H-5"', () => {
    expect(countdownLabel('2026-09-07', '10:00 - 12:00', new Date(2026, 8, 2, 9, 0))).toBe('H-5');
  });

  it('hari-H 3 jam sebelum mulai → "3 jam lagi"', () => {
    expect(countdownLabel('2026-09-02', '12:00 - 14:00', new Date(2026, 8, 2, 9, 0))).toBe('3 jam lagi');
  });

  it('sudah mulai → null', () => {
    expect(countdownLabel('2026-09-02', '08:00 - 10:00', new Date(2026, 8, 2, 9, 0))).toBeNull();
  });

  it('event kemarin → null', () => {
    expect(countdownLabel('2026-09-01', '10:00 - 12:00', new Date(2026, 8, 2, 9, 0))).toBeNull();
  });

  it('jam tak-terparse, 5 hari lagi → "H-5" (fallback kalender, bukan jam palsu)', () => {
    expect(countdownLabel('2026-09-07', 'Pagi hari', new Date(2026, 8, 2, 9, 0))).toBe('H-5');
  });

  it('jam kosong hari ini → null (bukan "H-0")', () => {
    expect(countdownLabel('2026-09-02', '', new Date(2026, 8, 2, 9, 0))).toBeNull();
  });

  it('tanggal invalid → null', () => {
    expect(countdownLabel('bukan-tanggal', '10:00 - 12:00', new Date(2026, 8, 2, 9, 0))).toBeNull();
  });
});