import { describe, expect, it } from 'vitest';
import { suggestNumber } from '../numbering';

describe('suggestNumber', () => {
  it('skips rows outside the requested year', () => {
    const existing = ['040/MMB/MKT.MC/VII/2026', '080/MMB/VI/2025'];
    expect(suggestNumber('ske', existing, new Date('2026-07-15'))).toBe('041/MMB/MKT.MC/VII/2026');
  });

  it('returns zero-padded max+1 within the same year (SKE memakai MKT.MC)', () => {
    const existing = ['040/MMB/MKT.MC/VII/2026', '042/MMB/MKT.MC/VII/2026'];
    expect(suggestNumber('ske', existing, new Date('2026-07-15'))).toBe('043/MMB/MKT.MC/VII/2026');
    expect(suggestNumber('sik', existing, new Date('2026-07-15'))).toBe('043A/MMB/MKT.SIKI/VII/2026');
  });

  it('handles brand-new series starting at 001', () => {
    const existing: string[] = [];
    expect(suggestNumber('ske', existing, new Date('2026-01-15'))).toBe('001/MMB/MKT.MC/I/2026');
    expect(suggestNumber('sik', existing, new Date('2026-01-15'))).toBe('001A/MMB/MKT.SIKI/I/2026');
  });

  it('preserves the user override when present in existing scan', () => {
    const existing = ['050A/MMB/VII/2026'];
    expect(suggestNumber('sik', existing, new Date('2026-07-15'))).toBe('051A/MMB/MKT.SIKI/VII/2026');
  });

  it('accepts the official SIK tail without a Roman month', () => {
    expect(suggestNumber('sik', ['097A/MMB/MKT.SIKI/2026'], new Date('2026-07-15')))
      .toBe('098A/MMB/MKT.SIKI/VII/2026');
  });

  it('accepts the official SKE sample (MKT.MC + Roman month, format gdocs A13)', () => {
    expect(suggestNumber('ske', ['097/MMB/MKT.MC/II/2026'], new Date('2026-07-15')))
      .toBe('098/MMB/MKT.MC/VII/2026');
  });

  it('accepts legacy SKE tails without MKT.MC (nomor lama tetap dihitung)', () => {
    expect(suggestNumber('ske', ['041/MMB/VII/2026'], new Date('2026-07-15')))
      .toBe('042/MMB/MKT.MC/VII/2026');
  });

  it('ignores an official SIK number from a different year', () => {
    expect(suggestNumber('sik', ['097A/MMB/MKT.SIKI/2025'], new Date('2026-07-15')))
      .toBe('001A/MMB/MKT.SIKI/VII/2026');
  });

  it('continues the series across month boundaries within the same year', () => {
    const existing = ['099A/MMB/VI/2026'];
    expect(suggestNumber('sik', existing, new Date('2026-07-15'))).toBe('100A/MMB/MKT.SIKI/VII/2026');
  });
});
