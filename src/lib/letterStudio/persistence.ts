// TypeScript · versioned localStorage persistence for letter studio.

import type { LetterPair } from './schema';
import { parsePair, parsePairs } from './schema';

export const HISTORY_KEY = 'letter-studio:v1';
export const DRAFT_KEY = 'letter-studio:draft';

export function loadPairs(): LetterPair[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const json = JSON.parse(raw);
    return parsePairs(json);
  } catch {
    return [];
  }
}

export function savePairs(pairs: LetterPair[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(pairs));
  } catch {
    // quota / disabled — ignore
  }
}

export function loadDraft(): LetterPair | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return parsePair(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDraft(pair: LetterPair): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(pair));
  } catch {
    // ignore
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
