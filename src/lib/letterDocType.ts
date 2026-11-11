// TypeScript · src/lib/letterDocType.ts · murni, tanpa React / tanpa I/O.
// `docType` disimpan di dalam `generated_letters.letter_data` (JSONB) supaya
// penambahan dokumen SIK tidak butuh DDL. Baris lama tanpa `docType` = SKE.

import type { LetterDocType, LetterDocument, SikRequestItem } from '../types';

export function readDocType(value: unknown): LetterDocType {
  const raw = (value as { docType?: unknown } | null)?.docType;
  return raw === 'sik' ? 'sik' : 'ske';
}

/** Narrowing aman: SIK dibedakan oleh `docType === 'sik'`. */
export function isSikDocument(value: LetterDocument): value is { docType: 'sik' } & SikRequestItem {
  return value.docType === 'sik';
}

/**
 * Normalisasi payload JSONB → `LetterDocument`.
 * Menambahkan `docType` pada baris lama dan mempertahankan field apa adanya
 * (tidak menghapus field warisan seperti `hariTanggalLoading`).
 */
export function normalizeLetterData(value: unknown): LetterDocument {
  const docType = readDocType(value);
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return { ...raw, docType } as LetterDocument;
}
