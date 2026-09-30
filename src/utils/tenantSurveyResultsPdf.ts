// Dynamic import (pengecualian ts-no-dynamic-import): boundary code-splitting
// sengaja dijaga — engine PDF (jspdf) hanya dimuat saat hasil diekspor.
import type { TenantSurveyResultsPdfPayload, SurveyPdfSection } from '../components/pdf/buildSurveyResultsPdf';
import { safeFileName } from '../lib/download';

export interface SurveyPdfOptions {
  sections?: SurveyPdfSection[];
}

/** Blob + nama berkas unduhan — dipakai tahap pratinjau sebelum mengunduh. */
export interface SurveyPdfResult {
  blob: Blob;
  fileName: string;
}

export async function renderTenantSurveyResultsPdfResult(
  payload: TenantSurveyResultsPdfPayload,
  options: SurveyPdfOptions = {},
): Promise<SurveyPdfResult> {
  const { buildSurveyResultsPdf } = await import('../components/pdf/buildSurveyResultsPdf');

  const blob = buildSurveyResultsPdf({ ...payload, sections: options.sections }).output('blob');
  const suffix =
    payload.filter.eventId === 'all'
      ? 'semua-event'
      : safeFileName(payload.eventLabel || payload.filter.eventId);
  const date = new Date().toISOString().slice(0, 10);
  return { blob, fileName: `hasil-evaluasi-tenant-${suffix}-${date}.pdf` };
}
