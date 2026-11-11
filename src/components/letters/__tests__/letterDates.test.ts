import { describe, expect, it } from 'vitest';
import { bangunHariTanggal, formatTanggalSurat } from '../letterDates';

// ============================================================
// Kontrak tanggal surat — dipakai bersama kertas HTML dan PDF.
// Kalau salah di sini, dua renderer sekaligus salah.
// ============================================================

describe('formatTanggalSurat', () => {
  it('mengubah ISO ke tanggal Indonesia panjang', () => {
    expect(formatTanggalSurat('2026-11-07')).toBe('7 November 2026');
  });

  it('tidak memakai nol di depan untuk tanggal satu digit', () => {
    expect(formatTanggalSurat('2026-01-05')).toBe('5 Januari 2026');
  });

  it('mengembalikan input non-ISO apa adanya', () => {
    expect(formatTanggalSurat('7 November 2026')).toBe('7 November 2026');
    expect(formatTanggalSurat('2026-11')).toBe('2026-11');
  });

  it('mengembalikan string kosong apa adanya', () => {
    expect(formatTanggalSurat('')).toBe('');
  });

  it('menolak bulan atau hari di luar jangkauan tanpa melempar', () => {
    expect(formatTanggalSurat('2026-13-01')).toBe('2026-13-01');
    expect(formatTanggalSurat('2026-00-10')).toBe('2026-00-10');
    expect(formatTanggalSurat('2026-05-00')).toBe('2026-05-00');
  });
});

describe('bangunHariTanggal', () => {
  it('merapikan spasi ekor pada day (data produksi menyimpan "Sabtu  ")', () => {
    expect(bangunHariTanggal('Sabtu  ', '9 Mei 2026')).toBe('Sabtu, 9 Mei 2026');
  });

  it('merapikan spasi pada sisi tanggal juga', () => {
    expect(bangunHariTanggal(' Minggu ', ' 9 November 2025 ')).toBe('Minggu, 9 November 2025');
  });

  it('tetap menghasilkan koma walau salah satu sisi kosong', () => {
    expect(bangunHariTanggal('', '9 Mei 2026')).toBe(', 9 Mei 2026');
  });
});
