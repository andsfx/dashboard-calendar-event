import { describe, expect, it } from 'vitest';
import { exportBackup, importBackup } from '../backup';
import type { LetterPair } from '../schema';

const now = new Date('2026-11-08T00:00:00Z').toISOString();

function pair(overrides: Partial<LetterPair> = {}): LetterPair {
  return {
    id: 'evt_1',
    title: 'Test',
    ske: { nomorSurat: '041/MMB/VII/2026' },
    sik: { nomorSurat: '041A/MMB/MKT.SIKI/VII/2026' },
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('exportBackup', () => {
  it('wraps pairs in a versioned document container', () => {
    const exported = exportBackup([pair()]);
    expect(exported).toEqual({
      version: 1,
      exportedAt: expect.any(String),
      documents: [pair()],
    });
  });
});

describe('importBackup', () => {
  const current = [pair({ id: 'current' })];

  it('merges incoming pairs by id without duplicates', () => {
    const { merged, added, skipped } = importBackup({ documents: [pair({ id: 'new' })] }, current);
    expect(merged).toHaveLength(2);
    expect(merged.map((p) => p.id)).toEqual(['current', 'new']);
    expect(added).toBe(1);
    expect(skipped).toBe(0);
  });

  it('skips duplicates already present', () => {
    const { merged, added, skipped } = importBackup({ documents: [pair({ id: 'current' })] }, current);
    expect(merged).toHaveLength(1);
    expect(added).toBe(0);
    expect(skipped).toBe(0);
  });

  it('returns skipped count for malformed input', () => {
    const { merged, added, skipped } = importBackup('not-json', current);
    expect(merged).toEqual(current);
    expect(added).toBe(0);
    expect(skipped).toBe(1);
  });

  it('skips entries that fail the Zod schema', () => {
    const { merged, added, skipped } = importBackup({ documents: [{ id: 'garbage', ske: true, sik: true }] }, current);
    expect(merged).toEqual(current);
    expect(added).toBe(0);
    expect(skipped).toBe(1);
  });
});
