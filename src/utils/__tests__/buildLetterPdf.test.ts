import { describe, expect, it } from 'vitest';
import type { jsPDF } from 'jspdf';
import type { LetterRequestItem } from '../../types';
import { buildLetterPdf } from '../../components/pdf/buildLetterPdf';
import { extractPdfStrings, extractPdfText } from '../../test/pdfText';

const LETTER: LetterRequestItem = {
  tanggalSurat: '2026-09-03',
  nomorSurat: '001/MMB/IX/2026',
  namaEO: 'Komunitas Fotografi Bekasi',
  penanggungJawab: 'Budi Santoso',
  alamatEO: 'Jl. Test No. 1, Bekasi',
  namaEvent: 'Pameran Foto Kota',
  lokasi: 'Atrium Utama',
  hariTanggalPelaksanaan: 'Sabtu, 5 September 2026',
  waktuPelaksanaan: '10.00 - 21.00 WIB',
  nomorTelepon: '081234567890',
  hariTanggalLoading: 'Jumat, 4 September 2026',
  waktuLoading: '22.00 - 23.00 WIB',
};

/** Rentang vertikal teks yang tercetak, dari matriks posisi operator Td/Tm. */
function textBaselines(doc: jsPDF): number[] {
  const text = extractPdfText(doc);
  const baselines: number[] = [];
  for (const match of text.matchAll(/-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s+T[dDm]/g)) {
    baselines.push(Number(match[1]));
  }
  return baselines;
}

describe('buildLetterPdf', () => {
  it('memuat data event, tujuan surat, dan jadwal loading', () => {
    const text = extractPdfStrings(buildLetterPdf(LETTER));
    expect(text).toContain(LETTER.namaEvent);
    expect(text).toContain(LETTER.namaEO);
    expect(text).toContain('Konfirmasi Pelaksanaan Event');
    expect(text).toContain('JADWAL LOADING');
    expect(text).toContain('Marketing Manager');
  });

  it('tanpa logo, kop tetap menuliskan nama mall', () => {
    const text = extractPdfStrings(buildLetterPdf(LETTER, ''));
    expect(text).toContain('METROPOLITAN MALL BEKASI');
  });

  it('dengan logo, gambar tertanam dan bukan wordmark teks', () => {
    const doc = buildLetterPdf(LETTER);
    const raw = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    expect(raw).toContain('/XObject');
    expect(extractPdfStrings(doc)).not.toContain('METROPOLITAN MALL BEKASI');
  });

  it('tanpa jadwal loading → blok loading tidak digambar', () => {
    const text = extractPdfStrings(buildLetterPdf({ ...LETTER, hariTanggalLoading: '', waktuLoading: '' }));
    expect(text).not.toContain('JADWAL LOADING');
  });

  it('PDF valid dan stream-nya berkompresi', () => {
    const doc = buildLetterPdf(LETTER);
    // PENTING: `output()` jsPDF hanya mengompres pada panggilan pertama;
    // panggilan berikutnya membangun ulang dokumen tanpa deflate. Simpan
    // hasilnya sekali lalu periksa dari buffer yang sama.
    const bytes = Buffer.from(doc.output('arraybuffer'));
    expect(bytes.length).toBeGreaterThan(1024);
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(bytes.toString('latin1')).toContain('/FlateDecode');
  });

  it('surat normal muat dalam satu halaman', () => {
    expect(buildLetterPdf(LETTER).getNumberOfPages()).toBe(1);
  });

  it('alamat panjang → konten tetap di dalam batas halaman', () => {
    // Regresi: dulu tidak pernah `addPage`, sehingga blok tanda tangan
    // tergambar di luar halaman (terukur y=843 dari tinggi 841.89).
    const doc = buildLetterPdf({
      ...LETTER,
      alamatEO: 'Jl. KH. Noer Ali No. 123 Blok C Kavling 12, Pekayon Jaya, Bekasi Selatan, Jawa Barat 17148. '.repeat(12),
    });
    const pageHeight = doc.internal.pageSize.getHeight();
    const baselines = textBaselines(doc);
    expect(baselines.length).toBeGreaterThan(0);
    expect(Math.max(...baselines)).toBeLessThan(pageHeight);
  });

  it('nama event panjang dibungkus, tidak melewati margin kanan', () => {
    const doc = buildLetterPdf({
      ...LETTER,
      namaEvent: 'Pameran Foto Kota dan Festival Kuliner Nusantara Bersama Komunitas Kreatif Bekasi Raya 2026',
      penanggungJawab: 'Budi Santoso Wijaya Kusuma',
    });
    // Semua baris teks dibungkus ke dalam lebar konten, bukan meluber
    // keluar halaman seperti sebelumnya (terukur x1=596 > 595.28).
    const text = extractPdfText(doc);
    const xPositions = [...text.matchAll(/(-?\d+(?:\.\d+)?)\s+-?\d+(?:\.\d+)?\s+T[dDm]/g)].map((m) => Number(m[1]));
    expect(Math.max(...xPositions)).toBeLessThanOrEqual(595.28);
  });
});
