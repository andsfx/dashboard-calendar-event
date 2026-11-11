// TypeScript · src/utils/sikPdfExport.ts · Vite/React 19
// Ekspor SIK — engine jsPDF dimuat lazily (boundary code-splitting dijaga:
// jspdf ~400 kB tidak boleh ikut entry boot, lihat vite.config.ts).
// Pengecualian ts-no-dynamic-import: path modul memang diketahui, tetapi impor
// statis akan menarik jsPDF (~400 kB) ke entry boot dan memicu penjaga
// `assertLazyEntryChunks` di vite.config.ts. Pola ini identik dengan
// letterPdfExport.ts — engine PDF hanya boleh dimuat saat surat dibuat.
import type { SikRequestItem } from '../types';
import { downloadBlob, safeFileName } from '../lib/download';

/** Render SIK ke base64 (tanpa prefix `data:`) untuk snapshot `pdf_base64`. */
export async function renderSikPdfBase64(letter: SikRequestItem): Promise<string> {
  const { buildSikPdf } = await import('../components/pdf/buildSikPdf');
  const buf = new Uint8Array(buildSikPdf(letter).output('arraybuffer'));
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function downloadSikPdf(letter: SikRequestItem): Promise<void> {
  const { buildSikPdf } = await import('../components/pdf/buildSikPdf');
  const blob = buildSikPdf(letter).output('blob');
  const nomor = safeFileName(letter.nomorSurat, 'sik');
  const kegiatan = letter.namaEvent ? `-${safeFileName(letter.namaEvent.slice(0, 30), 'event')}` : '';
  downloadBlob(blob, `${nomor}${kegiatan}.pdf`);
}
