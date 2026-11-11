import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SikPaper } from '../SikPaper';
import type { SikRequestItem } from '../../../types';
import { SIK_SYARAT } from '../letterDocuments';
import { readFileSync } from 'node:fs';

const SIK: SikRequestItem = {
  tanggalSurat: '2026-02-05',
  nomorSurat: '097A/MMB/MKT.SIKI/2026',
  namaEO: 'PT. Kasih Karunia Film',
  penanggungJawab: 'Daniel Tito',
  nomorHp: '08118421227',
  jenisKegiatan: 'Loading & Unloading Meet & Greet',
  tanggalMulai: '8 Februari 2026',
  tanggalSelesai: '8 Februari 2026',
  waktu: '08.00 - 18.00',
  lokasi: 'Area Metropolitan Mall Bekasi',
  namaEvent: 'Meet & Greet Film',
  tempatSurat: 'Bekasi',
  penandatanganNama: 'Supeno Budiyanto',
  penandatanganJabatan: 'Marcomm Manager',
  catatan: '',
};

function renderSik(overrides: Partial<SikRequestItem> = {}, props: Partial<Parameters<typeof SikPaper>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <SikPaper
      letter={{ ...SIK, ...overrides }}
      onChange={props.onChange ?? onChange}
      readOnly={props.readOnly}
      errors={props.errors}
    />,
  );
  return onChange;
}

describe('SikPaper — struktur dokumen resmi', () => {
  it('judul, nomor, dan penerima izin tampil', () => {
    renderSik();
    expect(screen.getByText('SURAT IZIN KERJA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('097A/MMB/MKT.SIKI/2026')).toBeInTheDocument();
    expect(screen.getByText('Diberikan surat izin kepada :')).toBeInTheDocument();
    expect(screen.getByDisplayValue('PT. Kasih Karunia Film')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Daniel Tito')).toBeInTheDocument();
  });

  it('enam syarat tetap tercetak, larangan merokok ditebalkan', () => {
    renderSik();
    expect(screen.getByText('Syarat – syarat yang harus dipatuhi :')).toBeInTheDocument();
    for (const syarat of SIK_SYARAT) {
      expect(screen.getByText(syarat)).toBeInTheDocument();
    }
    expect(screen.getByText('DILARANG MEROKOK selama berada didalam gedung Metropolitan Mall Bekasi.')).toHaveClass('font-bold');
  });

  it('penanda tangan Marcomm Manager dan tempat+tanggal Indonesia', () => {
    renderSik();
    expect(screen.getByDisplayValue('5 Februari 2026')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Supeno Budiyanto')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Marcomm Manager')).toBeInTheDocument();
  });
});

describe('SikPaper — edit inline & galat per field', () => {
  it('input langsung tersedia tanpa klik dan memicu onChange', () => {
    const onChange = renderSik();
    fireEvent.change(screen.getByDisplayValue('097A/MMB/MKT.SIKI/2026'), {
      target: { value: '098A/MMB/MKT.SIKI/2026' },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nomorSurat: '098A/MMB/MKT.SIKI/2026' }));
    expect(screen.getByDisplayValue('097A/MMB/MKT.SIKI/2026')).toBeInTheDocument();
  });

  it('readOnly menampilkan teks polos tanpa input', () => {
    renderSik({}, { readOnly: true });
    expect(screen.queryByDisplayValue('097A/MMB/MKT.SIKI/2026')).toBeNull();
    expect(screen.getByText('097A/MMB/MKT.SIKI/2026')).toBeInTheDocument();
  });

  it('editable class diterapkan', () => {
    renderSik();
    const input = screen.getByDisplayValue('097A/MMB/MKT.SIKI/2026') as HTMLInputElement;
    expect(input).toHaveClass('editable');
  });

  it('pesan galat per field muncul', () => {
    renderSik({}, { errors: { nomorHp: 'No. Hp penanggung jawab wajib diisi' } });
    expect(screen.getByText('No. Hp penanggung jawab wajib diisi')).toBeInTheDocument();
  });

  it('Bekasi, row preserved', () => {
    renderSik();
    // first SikRow label is the static "Bekasi," left of an always-on input
    expect(screen.getByText(/^Bekasi,/)).toBeInTheDocument();
  });
});

describe('SikPaper — print CSS', () => {
  it('letter-editable.css memuat blok @media print', () => {
    const css = readFileSync('src/styles/letter-editable.css', 'utf8');
    expect(css).toContain('@media print');
    expect(css).toContain('.editable');
  });
});
