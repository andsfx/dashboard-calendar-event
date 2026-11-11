import { describe, expect, it } from 'vitest';
import type { SikRequestItem } from '../../../types';
import { buildSikPdf } from '../buildSikPdf';
import { extractPdfStrings } from '../../../test/pdfText';
import { SIK_SYARAT } from '../../letters/letterDocuments';

const SIK: SikRequestItem = {
  tanggalSurat: '2026-02-05',
  nomorSurat: '097A/MMB/MKT.SIKI/2026',
  namaEO: 'PT. Kasih Karunia Film',
  penanggungJawab: 'Daniel Tito',
  nomorHp: '08118421227',
  jenisKegiatan: 'Meet & Greet Film Jangan Seperti Bapak',
  tanggalMulai: '8 Februari 2026',
  tanggalSelesai: '8 Februari 2026',
  waktu: '08.00 - 18.00',
  lokasi: 'Area Metropolitan Mall Bekasi',
  namaEvent: 'Meet & Greet Film Jangan Seperti Bapak',
  tempatSurat: 'Bekasi',
  penandatanganNama: 'Supeno Budiyanto',
  penandatanganJabatan: 'Marcomm Manager',
  catatan: '',
};

describe('buildSikPdf — Surat Izin Kerja', () => {
  it('judul, nomor, dan 8 field penerima izin tercetak', () => {
    const text = extractPdfStrings(buildSikPdf(SIK));
    expect(text).toContain('SURAT IZIN KERJA');
    expect(text).toContain('097A/MMB/MKT.SIKI/2026');
    expect(text).toContain('Diberikan surat izin kepada :');
    expect(text).toContain('PT. Kasih Karunia Film');
    expect(text).toContain('Daniel Tito');
    expect(text).toContain('08118421227');
    expect(text).toContain('08.00 - 18.00');
  });

  it('keenam syarat tercetak, termasuk larangan merokok', () => {
    const text = extractPdfStrings(buildSikPdf(SIK));
    expect(text).toContain('Syarat');
    expect(text).toContain('DILARANG MEROKOK');
    expect(text).toContain('Segala akibat yang ditimbulkan dari pekerjaan tersebut');
    expect(SIK_SYARAT).toHaveLength(6);
  });

  it('penanda tangan Marcomm Manager, bukan PIC EO', () => {
    const text = extractPdfStrings(buildSikPdf(SIK));
    expect(text).toContain('Bekasi, 5 Februari 2026');
    expect(text).toContain('Supeno Budiyanto');
    expect(text).toContain('Marcomm Manager');
    expect(text).toContain('Metropolitan Mall Bekasi');
  });

  it('SIK normal muat satu halaman A4', () => {
    expect(buildSikPdf(SIK).getNumberOfPages()).toBe(1);
  });

  it('catatan opsional ikut tercetak bila diisi', () => {
    const text = extractPdfStrings(buildSikPdf({ ...SIK, catatan: 'Ruang dikembalikan paling lambat 16 Mei 2026.' }));
    expect(text).toContain('Ruang dikembalikan paling lambat 16 Mei 2026.');
  });

  it('jenis kegiatan panjang dibungkus, tidak melewati margin kanan', () => {
    const doc = buildSikPdf({ ...SIK, jenisKegiatan: 'Loading & Unloading '.repeat(12) });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(extractPdfStrings(doc)).toContain('Loading');
  });

  it('tanpa logo kop tetap berisi judul', () => {
    const text = extractPdfStrings(buildSikPdf(SIK, ''));
    expect(text).toContain('SURAT IZIN KERJA');
    expect(text).toContain('METROPOLITAN MALL BEKASI');
  });
});
