import { describe, expect, it } from 'vitest';
import { loadPairs, savePairs, loadDraft, saveDraft, clearDraft } from '../persistence';
import type { LetterPair } from '../schema';

function pair(): LetterPair {
  return {
    id: 'evt_1',
    title: 'Test',
    ske: { nomorSurat: '041/MMB/VII/2026' },
    sik: { nomorSurat: '041A/MMB/MKT.SIKI/VII/2026' },
    status: 'draft',
    createdAt: '2026-11-08T00:00:00Z',
    updatedAt: '2026-11-08T00:00:00Z',
  };
}

describe('persistence fallback', () => {
  it('absent key yields empty workspace and empty draft', () => {
    expect(loadPairs()).toEqual([]);
    expect(loadDraft()).toBeNull();
  });

  it('round-trips pairs and draft', () => {
    savePairs([pair()]);
    saveDraft(pair());
    expect(loadPairs()).toEqual([pair()]);
    expect(loadDraft()).toEqual(pair());
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('tolerates corrupt values without throwing', () => {
    localStorage.setItem('letter-studio:v1', 'not-json');
    expect(loadPairs()).toEqual([]);
    localStorage.setItem('letter-studio:draft', '{broken');
    expect(loadDraft()).toBeNull();
  });
});
