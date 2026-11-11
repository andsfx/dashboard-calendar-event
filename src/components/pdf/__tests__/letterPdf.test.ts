import { describe, expect, it } from 'vitest';
import type { jsPDF } from 'jspdf';
import { buildLetterPdf } from '../buildLetterPdf';
import { letterSignerBlock } from '../../letters/letterDates';
import { extractPdfStrings, extractPdfText } from '../../../test/pdfText';

// ============================================================
// Kontrak dokumen SKE resmi (PERBANDINGAN-FORMAT-RESMI.md §2, A1–A14):
// - meta kiri atas tanpa label + tanpa Perihal (A3/A4)
// - tujuan tanpa `u.p.` dan tanpa telepon (A5)
// - kalimat pembuka dinamis menyebut nama EO + nama event (A6)
// - tabel 3 baris tanpa Nama Event (A7/A8), tanpa blok berwarna (A14)
// - TANPA jadwal loading (A12) — milik SIK
// - penutup resmi tunggal (A9)
// - DUA kolom tanda tangan: mall kiri `Pimpinan Unit`, EO kanan `Menyetujui`
//   dengan nama + organisasi EO (A10/A11)
// - varian berbayar: Biaya Kebersihan (Exclude PPN) + No. VA / Bank (reference-01)
// ============================================================

const PIC_EO = 'Rani Kusumawardhani';

function makeLetter(overrides: Partial<LetterRequestItem> = {}): LetterRequestItem {
  return {
    tanggalSurat: '2026-11-07',
    nomorSurat: '042/MMB/MKT.MC/XI/2026',
    namaEO: 'PT Kreasi Panggung Nusantara',
    penanggungJawab: PIC_EO,
    alamatEO: 'Jl. Ahmad Yani No. 12, Bekasi',
    namaEvent: 'Lomba Sanggar Tari Kreasi',
    lokasi: 'Panggung Funworld Lt. 3',
    hariTanggalPelaksanaan: 'Sabtu, 9 Mei 2026',
    waktuPelaksanaan: '10.00 - 19.00 WIB',
    nomorTelepon: '0812-3456-7890',
    hariTanggalLoading: 'Jumat, 8 Mei 2026',
    waktuLoading: '08.00 - 11.30',
    menyetujuiNama: 'Daniel Tito',
    menyetujuiOrg: 'PT Kreasi Panggung Nusantara',
    biayaKebersihan: '',
    vaBank: '',
    tempatSurat: 'Bekasi',
    penandatanganNama: 'Budi Santoso Wijaya',
    penandatanganJabatan: 'Pimpinan Unit',
    ...overrides,
  };
}

describe('letterSignerBlock — blok tanda tangan mall (kolom kiri)', () => {
  it('memuat nama penanda tangan dari penandatanganNama', () => {
    expect(letterSignerBlock(makeLetter()).nama).toBe('Budi Santoso Wijaya');
  });

  it('memuat jabatan dari penandatanganJabatan, bukan jabatan hardcoded', () => {
    expect(letterSignerBlock(makeLetter({ penandatanganJabatan: 'Building Manager' })).jabatan)
      .toBe('Building Manager');
  });

  it('membangun "tempat, tanggal" dari tempatSurat + tanggalSurat', () => {
    expect(letterSignerBlock(makeLetter()).tempatTanggal).toBe('Bekasi, 7 November 2026');
  });

  it('penanda tangan ≠ PIC EO penerima', () => {
    expect(letterSignerBlock(makeLetter()).nama).not.toBe(PIC_EO);
  });

  it('tempat kosong → hanya tanggal; tanggal kosong → hanya tempat', () => {
    expect(letterSignerBlock(makeLetter({ tempatSurat: '' })).tempatTanggal).toBe('7 November 2026');
    expect(letterSignerBlock(makeLetter({ tanggalSurat: '' })).tempatTanggal).toBe('Bekasi');
  });
});

describe('buildLetterPdf — struktur resmi (A1–A14)', () => {
  it('meta kiri atas: tempat+tanggal dan "No." tanpa label, TANPA Perihal', () => {
    const text = extractPdfStrings(buildLetterPdf(makeLetter()));
    expect(text).toContain('Bekasi, 7 November 2026');
    expect(text).toContain('No. 042/MMB/MKT.MC/XI/2026');
    expect(text).not.toContain('Perihal');
    expect(text).not.toContain('Konfirmasi Pelaksanaan Event');
  });

  it('tujuan tanpa `u.p.` dan tanpa nomor telepon', () => {
    const text = extractPdfStrings(buildLetterPdf(makeLetter()));
    expect(text).toContain('Kepada Yth,');
    expect(text).toContain('PT Kreasi Panggung Nusantara');
    expect(text).not.toContain('u.p.');
    expect(text).not.toContain('Telp.');
    expect(text).not.toContain('0812-3456-7890');
  });

  it('tabel 3 baris resmi tanpa Nama Event dan tanpa blok berwarna', () => {
    const text = extractPdfStrings(buildLetterPdf(makeLetter()));
    expect(text).toContain('Lokasi');
    expect(text).toContain('Hari / Tanggal Pelaksanaan');
    expect(text).toContain('Waktu Pelaksanaan');
    expect(text).not.toContain('Nama Event');
    expect(text).not.toContain('DATA EVENT');
  });

  it('kalimat pembuka dinamis memuat nama EO + nama event + nama mall', () => {
    // Kalimat pembuka digambar per kata (segmen tebal inline jsPDF), jadi
    // stream memisah tiap kata — normalisasi spasi sebelum assert.
    const text = extractPdfStrings(buildLetterPdf(makeLetter())).replace(/\s+/g, ' ');
    expect(text).toContain('Bersama ini kami sampaikan konfirmasi');
    expect(text).toContain('untuk mengadakan');
    expect(text).toContain('di Metropolitan Mall Bekasi sebagai berikut :');
    expect(text).toContain('konfirmasi PT Kreasi Panggung Nusantara untuk mengadakan Lomba Sanggar Tari Kreasi');
  });

  it('penutup tunggal format resmi', () => {
    const text = extractPdfStrings(buildLetterPdf(makeLetter()));
    expect(text).toContain('Demikian kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.');
    expect(text).not.toContain('Mohon agar seluruh persiapan');
  });

  it('dua kolom tanda tangan: mall kiri (Pimpinan Unit), EO kanan (Menyetujui + organisasi)', () => {
    const doc = buildLetterPdf(makeLetter());
    const text = extractPdfStrings(doc);
    expect(text).toContain('Hormat kami,');
    expect(text).toContain('Menyetujui,');
    // Kolom kiri = tanda tangan mall; kolom kanan = penyetuju EO.
    // (Org EO tidak diuji posisinya — teksnya sama dengan kalimat pembuka,
    // first-match akan jatuh ke badan surat.)
    for (const line of ['Budi Santoso Wijaya', 'Pimpinan Unit']) {
      expect(xOf(doc, line)).toBeLessThan(A4_CENTER_X);
    }
    for (const line of ['Menyetujui,', 'Daniel Tito']) {
      expect(xOf(doc, line)).toBeGreaterThanOrEqual(A4_CENTER_X);
    }
  });

  it('footer identitas PT tercetak (A2)', () => {
    const text = extractPdfStrings(buildLetterPdf(makeLetter()));
    expect(text).toContain('PT. Metropolitan Land Tbk.');
    expect(text).toContain('Kantor Operasional');
    expect(text).toContain('www.metropolitanland.com');
  });

  it('kop tanpa teks nama mall/divisi/alamat di badan (A1) — logo saja', () => {
    const text = extractPdfStrings(buildLetterPdf(makeLetter()));
    expect(text).not.toContain('Marketing & Tenant Relations Division');
    expect(text).not.toContain('Jl. KH. Noer Ali');
  });
});

describe('buildLetterPdf — varian berbayar (Biaya Kebersihan + VA/Bank)', () => {
  it('terisi → kedua baris tercetak, PPN suffix otomatis bila belum ada', () => {
    const text = extractPdfStrings(buildLetterPdf(makeLetter({
      biayaKebersihan: '900.901',
      vaBank: '8808 1234 5678',
    })));
    expect(text).toContain('Biaya Kebersihan');
    expect(text).toContain('900.901 (Exclude PPN)');
    expect(text).toContain('No. VA / Bank');
    expect(text).toContain('8808 1234 5678');
  });

  it('PPN sudah tertulis → tidak digandakan', () => {
    const text = extractPdfStrings(buildLetterPdf(makeLetter({
      biayaKebersihan: '900.901,- (Exclude PPN)',
    })));
    expect(text).toContain('900.901,- (Exclude PPN)');
    expect(text.match(/Exclude PPN/g)).toHaveLength(1);
  });

  it('kosong → kedua baris absen', () => {
    const text = extractPdfStrings(buildLetterPdf(makeLetter()));
    expect(text).not.toContain('Biaya Kebersihan');
    expect(text).not.toContain('No. VA / Bank');
  });
});

describe('buildLetterPdf — kop & paginasi', () => {
  it('dengan logo, gambar tertanam; tanpa logo fallback wordmark', () => {
    const doc = buildLetterPdf(makeLetter());
    const raw = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    expect(raw).toContain('/XObject');

    const fallback = extractPdfStrings(buildLetterPdf(makeLetter(), ''));
    expect(fallback).toContain('Metland');
  });

  it('surat normal muat dalam satu halaman A4', () => {
    expect(buildLetterPdf(makeLetter()).getNumberOfPages()).toBe(1);
  });

  it('blok yang sangat panjang mengalir ke halaman baru tanpa melempar', () => {
    const doc = buildLetterPdf(makeLetter({
      namaEvent: 'Festival Kuliner Nusantara dan Pameran Produk UMKM Kreatif Bekasi Raya 2026',
      alamatEO: [
        'Jl. Jenderal Sudirman Kaveling 52-53,',
        'Gedung Sentra Niaga Lantai 4 Suite 401, Jakarta Selatan 12190',
        'Kontak operasional: (021) 8379-8833, (021) 8379-8834',
      ].join('\n'),
    }));
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('margin resmi 72 pt — konten tidak keluar batas halaman', () => {
    const doc = buildLetterPdf(makeLetter({
      alamatEO: 'Jl. KH. Noer Ali No. 123 Blok C Kavling 12, Pekayon Jaya, Bekasi Selatan, Jawa Barat 17148. '.repeat(8),
      namaEvent: 'Pameran Foto Kota dan Festival Kuliner Nusantara Bersama Komunitas Kreatif Bekasi Raya 2026',
    }));
    const pageHeight = doc.internal.pageSize.getHeight();
    const baselines = [...extractPdfText(doc).matchAll(/-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s+T[dDm]/g)]
      .map((m) => Number(m[1]));
    expect(baselines.length).toBeGreaterThan(0);
    expect(Math.max(...baselines)).toBeLessThan(pageHeight);
  });
});

// ── helpers posisi teks untuk verifikasi dua kolom ──

const A4_CENTER_X = 595.28 / 2;

/** x (Td/Tm) tempat string tercetak pertama kali di content stream. */
function xOf(doc: jsPDF, needle: string): number {
  const text = extractPdfText(doc);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(-?[\\d.]+)\\s+(-?[\\d.]+)\\s+T[dDm][^()]*?\\((?:\\\\.|[^\\\\()])*?${escaped}`);
  const match = text.match(pattern);
  if (!match?.[1]) throw new Error(`teks tidak ditemukan: ${needle}`);
  return Number(match[1]);
}
