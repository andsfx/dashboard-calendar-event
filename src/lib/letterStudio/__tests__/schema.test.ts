import { describe, expect, it } from 'vitest';
import { parsePair, parsePairs, LetterPairSchema } from '../schema';
import type { LetterPair } from '../schema';

const now = new Date('2026-11-08T00:00:00Z').toISOString();

function pair(overrides: Partial<LetterPair> = {}): LetterPair {
  return {
    id: 'evt_1',
    eventId: 'evt_1',
    title: 'Test',
    ske: { nomorSurat: '041/MMB/VII/2026', namaEvent: 'Lomba' },
    sik: { nomorSurat: '041A/MMB/MKT.SIKI/VII/2026', namaEvent: 'Lomba' },
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    publishedIds: { ske: 'a', sik: 'b' },
    ...overrides,
  };
}

describe('LetterPairSchema Zod round-trip', () => {
  it('accepts a full pair', () => {
    expect(parsePair(pair())).toEqual(pair());
    expect(LetterPairSchema.safeParse(pair()).success).toBe(true);
  });

  it('tolerates missing optional fields', () => {
    const minimal = parsePair({ id: 'x', ske: {}, sik: {} });
    expect(minimal?.id).toBe('x');
    expect(minimal?.status).toBe('draft');
    expect(minimal?.createdAt).toBeTruthy();
  });

  it('rejects corrupt shapes without throwing', () => {
    expect(parsePair(null)).toBeNull();
    expect(parsePair(undefined)).toBeNull();
    expect(parsePair('nope')).toBeNull();
    expect(parsePair({ id: 123, ske: 'not-an-object', sik: {} })).toBeNull();
    expect(parsePair({ id: 'x', ske: true, sik: true, status: 'bogus' as const })).toBeNull();
  });

  it('parses arrays and skips invalid entries', () => {
    const mixed = parsePairs([
      { id: 'a', ske: {}, sik: {} },
      'garbage',
      { id: 'b', ske: {}, sik: {} },
      null,
    ]);
    expect(mixed).toHaveLength(2);
    expect(mixed.map((p) => p.id)).toEqual(['a', 'b']);
  });
});
