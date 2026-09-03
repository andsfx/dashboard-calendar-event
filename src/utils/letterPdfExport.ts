import type { LetterRequestItem } from '../types';

// ============================================================
// Letter PDF Generation & Download
// Dynamic import (pengecualian ts-no-dynamic-import): boundary code-splitting
// sengaja dijaga — engine PDF (jspdf ~400 kB) hanya dimuat saat surat dibuat.
// ============================================================

function letterFileName(letter: LetterRequestItem): string {
  const nomor = (letter.nomorSurat || 'surat').replace(/[^\w.-]+/g, '_');
  const event = letter.namaEvent
    ? `_${letter.namaEvent.slice(0, 30).replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_')}`
    : '';
  return `${nomor}${event}.pdf`;
}

/** Trigger a browser file download from a Blob without needing file-saver. */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  // Cleanup after a tick to ensure download starts
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }, 100);
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
