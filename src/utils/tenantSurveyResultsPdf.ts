// Dynamic import (pengecualian ts-no-dynamic-import): boundary code-splitting
// sengaja dijaga — engine PDF (jspdf) hanya dimuat saat hasil diekspor.
import type { TenantSurveyResultsPdfPayload, SurveyPdfSection } from '../components/pdf/buildSurveyResultsPdf';
import { downloadBlob, safeFileName } from '../lib/download';

export interface SurveyPdfOptions {
  sections?: SurveyPdfSection[];
}

export async function downloadTenantSurveyResultsPdf(
  payload: TenantSurveyResultsPdfPayload,
  options: SurveyPdfOptions = {},
): Promise<void> {
  const { buildSurveyResultsPdf } = await import('../components/pdf/buildSurveyResultsPdf');

  const blob = buildSurveyResultsPdf({ ...payload, sections: options.sections }).output('blob');
  const suffix =
    payload.filter.eventId === 'all'
      ? 'semua-event'
      : safeFileName(payload.eventLabel || payload.filter.eventId);
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `hasil-evaluasi-tenant-${suffix}-${date}.pdf`);
}
