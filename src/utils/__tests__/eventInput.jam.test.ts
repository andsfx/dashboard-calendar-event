/**
 * Kontrak `jam` (audit A-10): hanya bentuk yang bisa diparse yang disimpan.
 *
 * - Rentang sah → "HH:MM - HH:MM"
 * - Jam mulai saja ("13.00 WIB", "11.00 WIB - selesai") → "HH:MM"
 * - Placeholder tanpa makna / teks sampah → "" (tidak pernah teks mentah)
 */
import { describe, expect, it } from 'vitest';
import { normalizeEventInput, resolveJam } from '../eventInput';
import { countdownLabel, parseStartTime, parseTimeRange } from '../eventDateTime';

function jam(value: string): string | undefined {
  return normalizeEventInput({ jam: value }).jam;
}

describe('normalizeEventInput — jam', () => {
  it('mempertahankan rentang valid dalam bentuk kanonik', () => {
    expect(jam('10:00 - 12:00')).toBe('10:00 - 12:00');
  });

  it('menormalkan titik menjadi titik dua pada rentang', () => {
    expect(jam('10.00 - 12.00')).toBe('10:00 - 12:00');
    expect(jam('9.05-10.30')).toBe('09:05 - 10:30');
  });

  it('menerima en dash sebagai pemisah rentang', () => {
    expect(jam('10.00–12.00')).toBe('10:00 - 12:00');
  });

  it('menyimpan jam tunggal + WIB sebagai jam mulai', () => {
    expect(jam('13.00 WIB')).toBe('13:00');
    expect(jam('10:00 WIB')).toBe('10:00');
    expect(jam('09.30')).toBe('09:30');
  });

  it('mengambil jam mulai saat bagian akhir tidak terbaca', () => {
    expect(jam('11.00 WIB - selesai')).toBe('11:00');
  });

  it('tidak menyimpan placeholder tanpa makna', () => {
    for (const placeholder of ['–', '-', '—', 'TBA', 'tbd', 'n/a', 'N/A']) {
      const result = jam(placeholder);
      expect(result).toBe('');
      expect(result).not.toBe(placeholder);
    }
  });

  it('mempertahankan teks bermakna yang tidak bisa diparse', () => {
    for (const prose of ['pagi', 'jam 10', '9.5 - 10.30', 'Sepanjang hari', '??']) {
      expect(jam(prose)).toBe(prose);
    }
  });

  it('mengosongkan nilai yang hanya berisi spasi', () => {
    expect(jam('   ')).toBe('');
  });
});

describe('resolveJam — satu aturan untuk baca & tulis', () => {
  it('membuang placeholder tanpa makna', () => {
    for (const placeholder of ['-', '–', '—', 'n/a', 'N/A', 'TBA', 'tbd', '', '   ']) {
      expect(resolveJam(placeholder)).toBe('');
    }
  });

  it('menormalkan nilai yang bisa diparse', () => {
    expect(resolveJam('13.00 WIB')).toBe('13:00');
    expect(resolveJam('10.00 - 12.00')).toBe('10:00 - 12:00');
    expect(resolveJam(' 13:00 ')).toBe('13:00');
  });

  it('mempertahankan teks bermakna yang tidak bisa diparse', () => {
    expect(resolveJam('Setelah Isya')).toBe('Setelah Isya');
    expect(resolveJam('Sepanjang hari')).toBe('Sepanjang hari');
    expect(resolveJam('  Sepanjang   hari ')).toBe('Sepanjang hari');
  });
});

describe('parseTimeRange — kontrak rentang dua sisi', () => {
  it('tetap menerima rentang seperti sebelumnya', () => {
    expect(parseTimeRange('09:15 - 10:45')).toEqual({
      startHour: 9, startMin: 15, endHour: 10, endMin: 45,
    });
    expect(parseTimeRange('10.00 - 12.00')).toEqual({
      startHour: 10, startMin: 0, endHour: 12, endMin: 0,
    });
  });

  it('menolak jam tunggal: durasi tidak boleh dikarang', () => {
    expect(parseTimeRange('10.00')).toBeNull();
    expect(parseTimeRange('13.45 WIB')).toBeNull();
  });

  it('menolak nilai yang bukan jam', () => {
    expect(parseTimeRange('10 - 14')).toBeNull();
    expect(parseTimeRange('abc')).toBeNull();
    expect(parseTimeRange('–')).toBeNull();
    expect(parseTimeRange('24:00')).toBeNull();
  });
});

describe('parseStartTime — titik mulai saja', () => {
  it('menerima jam tunggal dengan titik dua atau titik', () => {
    expect(parseStartTime('10.00')).toEqual({ startHour: 10, startMin: 0 });
    expect(parseStartTime('13:45')).toEqual({ startHour: 13, startMin: 45 });
  });

  it('menerima suffix WIB dan jam mulai di awal teks', () => {
    expect(parseStartTime('13.45 WIB')).toEqual({ startHour: 13, startMin: 45 });
    expect(parseStartTime('11.00 WIB - selesai')).toEqual({ startHour: 11, startMin: 0 });
    expect(parseStartTime('10:00 - 12:00')).toEqual({ startHour: 10, startMin: 0 });
  });

  it('menolak teks tanpa jam sah', () => {
    expect(parseStartTime('bukan jam')).toBeNull();
    expect(parseStartTime('24:00')).toBeNull();
    expect(parseStartTime('')).toBeNull();
  });
});

describe('countdownLabel — jam tunggal', () => {
  it('memakai jam mulai walau tidak ada jam selesai', () => {
    // 17 Nov 2026 09:00 → mulai 13:00 = 4 jam lagi (komponen lokal, bukan UTC).
    expect(countdownLabel('2026-11-17', '13:00', new Date(2026, 10, 17, 9, 0))).toBe('4 jam lagi');
    expect(countdownLabel('2026-11-17', '13.00 WIB', new Date(2026, 10, 17, 9, 0))).toBe('4 jam lagi');
  });
});
