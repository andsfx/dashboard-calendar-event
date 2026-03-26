import { describe, expect, it } from 'vitest';
import { normalizeEventInput } from './eventInput';

describe('normalizeEventInput', () => {
  it('trims and collapses text fields', () => {
    const data = normalizeEventInput({
      acara: '  Lomba   Mewarnai  ',
      lokasi: '  Panggung   Lt. 3 ',
      eo: '  Happy   Play  ',
      keterangan: '  untuk   anak   ',
    });

    expect(data.acara).toBe('Lomba Mewarnai');
    expect(data.lokasi).toBe('Panggung Lt. 3');
    expect(data.eo).toBe('Happy Play');
    expect(data.keterangan).toBe('untuk anak');
  });

  it('normalizes jam into HH:MM - HH:MM when parseable', () => {
    const data = normalizeEventInput({ jam: '9.5 - 10.30' });
    // Non-parseable minute style should stay normalized text only.
    expect(data.jam).toBe('9.5 - 10.30');

    const data2 = normalizeEventInput({ jam: '9:05 - 10:30' });
    expect(data2.jam).toBe('09:05 - 10:30');
  });

  it('derives day/month/tanggal from valid dateStr', () => {
    const data = normalizeEventInput({ dateStr: '2026-03-24' });
    expect(data.day).toBe('Selasa');
    expect(data.month).toBe('Maret');
    expect(data.tanggal).toBe('24 Maret 2026');
  });
});
