// TypeScript · window.letterStudio automation API.
// Guarded for SSR/jsdom; never throws across the window boundary.
// PDF wrappers keep jsPDF behind their own dynamic import (lazy chunk guard).

import type { LetterPair } from './schema';
import { loadPairs, savePairs } from './persistence';
import { importBackup } from './backup';
import { renderLetterPdfBase64, downloadLetterPdf } from '../../utils/letterPdfExport';
import { renderSikPdfBase64, downloadSikPdf } from '../../utils/sikPdfExport';
import { EMPTY_SKE, EMPTY_SIK } from '../../components/letters/letterDocuments';
import type { LetterRequestItem, SikRequestItem } from '../../types';

interface AutomationResult { ok: boolean; error?: string; [key: string]: unknown }

export interface LetterStudioApi {
  help(): string;
  createPair(payload?: { ske?: Partial<LetterRequestItem>; sik?: Partial<SikRequestItem>; title?: string }): AutomationResult;
  listPairs(): AutomationResult;
  exportData(): AutomationResult;
  importData(data: unknown): AutomationResult;
  downloadPdf(id: string, docType: 'ske' | 'sik'): Promise<AutomationResult>;
  getPdfBase64(id: string, docType: 'ske' | 'sik'): Promise<AutomationResult>;
}

declare global {
  interface Window { letterStudio?: LetterStudioApi }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function failure(e: unknown): AutomationResult {
  return { ok: false, error: e instanceof Error ? e.message : 'failed' };
}

function findPair(id: string): LetterPair | undefined {
  return loadPairs().find((p) => p.id === id);
}

export function installAutomation(): void {
  if (!isBrowser()) return;
  const api: LetterStudioApi = {
    help: () => 'window.letterStudio: createPair, listPairs, exportData, importData, downloadPdf, getPdfBase64',
    createPair: (payload) => {
      try {
        const pair: LetterPair = {
          id: crypto.randomUUID(),
          title: payload?.title ?? '',
          ske: { ...EMPTY_SKE, ...(payload?.ske ?? {}) },
          sik: { ...EMPTY_SIK, ...(payload?.sik ?? {}) },
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        savePairs([pair, ...loadPairs()]);
        return { ok: true, pair };
      } catch (e) { return failure(e); }
    },
    listPairs: () => {
      try { return { ok: true, pairs: loadPairs() }; }
      catch (e) { return { ...failure(e), pairs: [] }; }
    },
    exportData: () => {
      try {
        return { ok: true, data: { version: 1, exportedAt: new Date().toISOString(), documents: loadPairs() } };
      } catch (e) { return failure(e); }
    },
    importData: (data) => {
      try {
        const { merged, added, skipped } = importBackup(data, loadPairs());
        savePairs(merged);
        return { ok: true, added, skipped };
      } catch (e) { return failure(e); }
    },
    downloadPdf: async (id, docType) => {
      try {
        const pair = findPair(id);
        if (!pair) return { ok: false, error: 'not found' };
        if (docType === 'ske') await downloadLetterPdf(pair.ske as unknown as LetterRequestItem);
        else await downloadSikPdf(pair.sik as unknown as SikRequestItem);
        return { ok: true };
      } catch (e) { return failure(e); }
    },
    getPdfBase64: async (id, docType) => {
      try {
        const pair = findPair(id);
        if (!pair) return { ok: false, error: 'not found' };
        const base64 = docType === 'ske'
          ? await renderLetterPdfBase64(pair.ske as unknown as LetterRequestItem)
          : await renderSikPdfBase64(pair.sik as unknown as SikRequestItem);
        return { ok: true, base64 };
      } catch (e) { return failure(e); }
    },
  };
  window.letterStudio = api;
}

