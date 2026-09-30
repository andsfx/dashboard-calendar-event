import { inflateSync } from 'node:zlib';
import type { jsPDF } from 'jspdf';

// ============================================================
// Utilitas tes PDF.
//
// Dokumen jsPDF menyimpan teks di dalam content stream. Sejak
// `compress: true` dipakai (berkas 9× lebih kecil), stream itu
// terdeflate sehingga tidak bisa lagi dicari dengan memindai byte
// mentah. Helper ini meng-inflate stream lebih dulu supaya tes dapat
// memeriksa teks yang benar-benar tercetak, bukan byte insidental.
// ============================================================

/** Semua teks yang tercetak di dokumen, digabung dengan newline. */
export function extractPdfText(doc: jsPDF): string {
  const raw = Buffer.from(doc.output('arraybuffer'));
  const parts: string[] = [];

  // Stream objek: "stream\n<bytes>\nendstream" — dipisah agar isi biner
  // yang mengandung kata "endstream" tidak memotong parsing.
  const marker = Buffer.from('stream');
  const endMarker = Buffer.from('endstream');
  let cursor = 0;

  while (cursor < raw.length) {
    const start = raw.indexOf(marker, cursor);
    if (start === -1) break;
    // Lewati EOL setelah kata "stream".
    let dataStart = start + marker.length;
    if (raw[dataStart] === 0x0d) dataStart += 1;
    if (raw[dataStart] === 0x0a) dataStart += 1;

    const end = raw.indexOf(endMarker, dataStart);
    if (end === -1) break;

    const chunk = raw.subarray(dataStart, end);
    try {
      parts.push(inflateSync(chunk).toString('latin1'));
    } catch {
      // Stream tanpa FlateDecode (mis. metadata) — dipakai apa adanya.
      parts.push(chunk.toString('latin1'));
    }
    cursor = end + endMarker.length;
  }

  return parts.join('\n');
}

/** Teks dalam tanda kurung `(…)` pada operator Tj — konten yang terlihat. */
export function extractPdfStrings(doc: jsPDF): string {
  const text = extractPdfText(doc);
  const out: string[] = [];
  const pattern = /\((?:\\.|[^\\()])*\)/g;
  for (const match of text.matchAll(pattern)) {
    out.push(match[0].slice(1, -1).replace(/\\([()\\])/g, '$1'));
  }
  return out.join('\n');
}

export interface ImagePlacement {
  width: number;
  height: number;
  x: number;
  y: number;
  /** Lebar / tinggi seperti yang benar-benar digambar. */
  aspect: number;
}

/**
 * Ukuran gambar seperti yang benar-benar ditempatkan di halaman.
 *
 * jsPDF menggambar gambar lewat matriks `q w 0 0 h x y cm /I… Do Q`,
 * jadi rasio asli yang dipertahankan bisa diperiksa langsung dari
 * content stream — bukan dari properti gambar sumbernya.
 */
export function extractImagePlacements(doc: jsPDF): ImagePlacement[] {
  const text = extractPdfText(doc);
  const placements: ImagePlacement[] = [];
  const pattern = /q\s+(-?[\d.]+)\s+0\s+0\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm\s+\/(\w+)\s+Do/g;
  for (const match of text.matchAll(pattern)) {
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width <= 0 || height <= 0) continue;
    placements.push({
      width,
      height,
      x: Number(match[3]),
      y: Number(match[4]),
      aspect: width / height,
    });
  }
  return placements;
}

