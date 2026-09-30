// ============================================================
// Unduhan berkas di browser.
//
// Sebelumnya pola `createObjectURL` → anchor → `revokeObjectURL` disalin
// di delapan tempat dengan dua varian: sebagian melepas object URL
// segera setelah `click()` (balapan — unduhan besar bisa batal di
// Safari/Firefox), sebagian menundanya 100 ms. Satu implementasi di sini.
// ============================================================

/**
 * Picu unduhan dari sebuah Blob.
 *
 * Object URL dilepas setelah tick berikutnya, bukan langsung: melepasnya
 * sinkron tepat setelah `click()` bisa membatalkan unduhan yang belum
 * sempat dimulai.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 100);
}

/**
 * Nama berkas aman: buang karakter di luar `[a-zA-Z0-9._-]`, rapikan
 * pemisah, potong agar tidak melewati batas panjang nama berkas.
 */
export function safeFileName(raw: string, fallback = 'dokumen'): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 80);
  return cleaned || fallback;
}
