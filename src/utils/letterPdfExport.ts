import type { LetterRequestItem } from '../types';
import { downloadBlob, safeFileName } from '../lib/download';

// ============================================================
// Letter PDF Generation & Download
// Dynamic import (pengecualian ts-no-dynamic-import): boundary code-splitting
// sengaja dijaga — engine PDF (jspdf ~400 kB) hanya dimuat saat surat dibuat.
// ============================================================

function letterFileName(letter: LetterRequestItem): string {
  const nomor = safeFileName(letter.nomorSurat, 'surat');
  const event = letter.namaEvent ? `-${safeFileName(letter.namaEvent.slice(0, 30), 'event')}` : '';
  return `${nomor}${event}.pdf`;
}

/** Render the letter to a PDF Blob (engine loaded lazily). */
export async function renderLetterPdfBlob(letter: LetterRequestItem): Promise<Blob> {
  const { buildLetterPdf } = await import('../components/pdf/buildLetterPdf');
  return buildLetterPdf(letter).output('blob');
}

/** Render the letter to a base64 string (no data: prefix). */
export async function renderLetterPdfBase64(letter: LetterRequestItem): Promise<string> {
  const blob = await renderLetterPdfBlob(letter);
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Build the letter PDF in the browser and trigger a download.
 * Heavy PDF engine and helpers are imported dynamically to keep
 * the initial app bundle small.
 */
export async function downloadLetterPdf(letter: LetterRequestItem): Promise<void> {
  const blob = await renderLetterPdfBlob(letter);
  downloadBlob(blob, letterFileName(letter));
}

/**
 * Open the generated PDF in a new browser tab for preview.
 * Returns the blob URL so caller can revoke it when done.
 */
export async function openLetterPdfPreview(letter: LetterRequestItem): Promise<string> {
  const blob = await renderLetterPdfBlob(letter);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  return url;
}
