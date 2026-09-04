import { describe, expect, it } from 'vitest';
import type { jsPDF } from 'jspdf';
import type { LetterRequestItem } from '../../types';
import { buildLetterPdf } from '../../components/pdf/buildLetterPdf';

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

function decode(doc: jsPDF): string {
  const buf = doc.output('arraybuffer');
  return new TextDecoder('latin1').decode(buf);
}

describe('buildLetterPdf', () => {
  it('PDF valid dengan stream berisi kop surat & data event', () => {
    const doc = buildLetterPdf(LETTER);
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    expect(bytes.length).toBeGreaterThan(1024);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('%PDF');

    const text = decode(doc);
    expect(text).toContain('METROPOLITAN MALL BEKASI');
    expect(text).toContain(LETTER.namaEvent);
    expect(text).toContain(LETTER.namaEO);
    expect(text).toContain('Konfirmasi Pelaksanaan Event');
    expect(text).toContain('JADWAL LOADING');
    expect(text).toContain('Marketing Manager');
  });

  it('tanpa jadwal loading → blok loading tidak digambar', () => {
    const doc = buildLetterPdf({ ...LETTER, hariTanggalLoading: '', waktuLoading: '' });
    expect(decode(doc)).not.toContain('JADWAL LOADING');
  });
});
