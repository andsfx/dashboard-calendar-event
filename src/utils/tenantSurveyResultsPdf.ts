// Dynamic import (pengecualian ts-no-dynamic-import): boundary code-splitting
// sengaja dijaga — engine PDF (jspdf) hanya dimuat saat hasil diekspor.
import type { TenantSurveyResultsPdfPayload } from '../components/pdf/buildSurveyResultsPdf';

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }, 100);
}

function safeFileName(raw: string): string {
  return raw.replace(/[^\w.-]+/g, '_').slice(0, 80);
}

export async function downloadTenantSurveyResultsPdf(
  payload: TenantSurveyResultsPdfPayload,
): Promise<void> {
  const { buildSurveyResultsPdf } = await import('../components/pdf/buildSurveyResultsPdf');

  const blob = buildSurveyResultsPdf(payload).output('blob');
  const suffix =
    payload.filter.eventId === 'all'
      ? 'semua-event'
      : safeFileName(payload.eventLabel || payload.filter.eventId);
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `hasil-evaluasi-tenant-${suffix}-${date}.pdf`);
}
