// TypeScript · JSON backup export/import.

import type { LetterPair } from './schema';
import { parsePairs } from './schema';
import { downloadBlob } from '../download';

export interface BackupShape {
  version: number;
  exportedAt: string;
  documents: LetterPair[];
}

export function exportBackup(pairs: LetterPair[]): BackupShape {
  const payload: BackupShape = {
    version: 1,
    exportedAt: new Date().toISOString(),
    documents: pairs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'letter-studio-backup.json');
  return payload;
}

function readDocuments(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  if (!('documents' in obj)) return undefined;
  // `in` narrows the property to unknown
  const rec = obj as Record<string, unknown>;
  return rec.documents;
}

export function importBackup(jsonOrObject: unknown, currentPairs: LetterPair[]): { merged: LetterPair[]; added: number; skipped: number } {
  let obj: unknown = jsonOrObject;
  if (typeof jsonOrObject === 'string') {
    try {
      obj = JSON.parse(jsonOrObject);
    } catch {
      return { merged: currentPairs, added: 0, skipped: 1 };
    }
  }
  const docsRaw = readDocuments(obj);
  const incoming = parsePairs(docsRaw);
  const skipped = Array.isArray(docsRaw) ? docsRaw.length - incoming.length : (docsRaw !== undefined ? 1 : 0);
  const byId = new Map(currentPairs.map((p) => [p.id, p]));
  let added = 0;
  for (const p of incoming) {
    if (byId.has(p.id)) continue;
    byId.set(p.id, p);
    added++;
  }
  return { merged: Array.from(byId.values()), added, skipped };
}
