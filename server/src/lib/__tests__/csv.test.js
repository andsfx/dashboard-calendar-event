/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { csvEscape } from '../csv.js';

describe('csvEscape', () => {
  it('mengembalikan string kosong untuk null/undefined', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('membiarkan teks biasa apa adanya', () => {
    expect(csvEscape('Budi Santoso')).toBe('Budi Santoso');
    expect(csvEscape(42)).toBe('42');
  });

  it('membungkus nilai berkoma dengan kutip', () => {
    expect(csvEscape('Jakarta, Indonesia')).toBe('"Jakarta, Indonesia"');
  });

  it('menggandakan kutip ganda', () => {
    expect(csvEscape('Kata "kunci"')).toBe('"Kata ""kunci"""');
  });

  it('membungkus nilai dengan newline maupun CR', () => {
    expect(csvEscape('baris1\nbaris2')).toBe('"baris1\nbaris2"');
    expect(csvEscape('baris1\rbaris2')).toBe('"baris1\rbaris2"');
  });

  it('menetralkan formula CSV injection', () => {
    expect(csvEscape('=1+1')).toBe("'=1+1");
    expect(csvEscape('+62 812')).toBe("'+62 812");
    expect(csvEscape('-5')).toBe("'-5");
    expect(csvEscape('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvEscape('\tx')).toBe("'\tx");
  });

  it('menetralkan formula sekaligus mengutip bila perlu', () => {
    expect(csvEscape('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`);
  });
});
