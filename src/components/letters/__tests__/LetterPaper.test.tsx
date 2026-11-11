import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LetterPaper } from '../LetterPaper';
import type { LetterRequestItem } from '../../../types';
import { readFileSync } from 'node:fs';

const LETTER: LetterRequestItem = {
  tanggalSurat: '2026-02-05',
  nomorSurat: '097/MMB/MKT.MC/II/2026',
  namaEO: 'PT Kreasi Panggung Nusantara',
  penanggungJawab: 'Rani Kusumawardhani',
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
};

function renderPaper(overrides: Partial<LetterRequestItem> = {}, props: Partial<Parameters<typeof LetterPaper>[0]> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <LetterPaper
      letter={{ ...LETTER, ...overrides }}
      onChange={props.onChange ?? onChange}
      readOnly={props.readOnly}
      errors={props.errors}
    />,
  );
  return { utils, onChange };
}

describe('LetterPaper — struktur resmi', () => {
  it('kop = logo MetLand saja; tanpa teks kop lama', () => {
    renderPaper();
    expect(screen.getByAltText('MetLand')).toBeInTheDocument();
    expect(screen.queryByText('METROPOLITAN MALL BEKASI')).toBeNull();
    expect(screen.queryByText('Marketing & Tenant Relations Division')).toBeNull();
  });

  it('meta kiri atas: tempat, tanggal, nomor — tanpa label dan tanpa Perihal', () => {
    renderPaper();
    expect(screen.getByDisplayValue('Bekasi')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5 Februari 2026')).toBeInTheDocument();
    expect(screen.getByDisplayValue('097/MMB/MKT.MC/II/2026')).toBeInTheDocument();
    expect(screen.queryByText('Perihal')).toBeNull();
    expect(screen.queryByText('Konfirmasi Pelaksanaan Event')).toBeNull();
  });

  it('tujuan tanpa u.p. dan tanpa nomor telepon', () => {
    renderPaper();
    expect(screen.getByText('Kepada Yth,')).toBeInTheDocument();
    expect(screen.getByLabelText('Nama Event Organizer')).toBeInTheDocument();
    expect(screen.queryByText(/u\.p\./)).toBeNull();
    // Telepon tetap punya input (kontrak WYSIWYG, tersembunyi sr-only) tapi
    // tidak tercetak sebagai baris tujuan — tidak ada teks "Telp".
    expect(screen.queryByText(/^Telp/)).toBeNull();
  });

  it('kalimat pembuka dinamis menyebut nama EO + nama event', () => {
    renderPaper();
    const intro = screen.getByText(/Bersama ini kami sampaikan konfirmasi/);
    expect(intro.textContent).toContain('PT Kreasi Panggung Nusantara');
    expect(intro.textContent).toContain('Lomba Sanggar Tari Kreasi');
    expect(intro.textContent).toContain('Metropolitan Mall Bekasi');
  });

  it('tabel hanya 3 baris: Lokasi, Hari/Tanggal Pelaksanaan, Waktu Pelaksanaan', () => {
    renderPaper();
    expect(screen.getByText('Lokasi')).toBeInTheDocument();
    expect(screen.getByText('Hari / Tanggal Pelaksanaan')).toBeInTheDocument();
    expect(screen.getByText('Waktu Pelaksanaan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Panggung Funworld Lt. 3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10.00 - 19.00 WIB')).toBeInTheDocument();
    // Nama Event bukan baris tabel (A8) — hanya di kalimat pembuka + input tersembunyi.
    expect(screen.queryByText(/^Nama Event$/)).toBeNull();
  });

  it('tidak ada blok JADWAL LOADING meski data warisan terisi', () => {
    renderPaper();
    expect(screen.queryByText('JADWAL LOADING')).toBeNull();
    expect(screen.queryByLabelText('Jadwal loading hari/tanggal')).toBeNull();
    expect(screen.queryByDisplayValue('Jumat, 8 Mei 2026')).toBeNull();
  });

  it('penutup tunggal format resmi', () => {
    renderPaper();
    expect(screen.getByText(/Demikian kami sampaikan, atas perhatian dan kerjasamanya/)).toBeInTheDocument();
    expect(screen.queryByText(/Mohon agar seluruh persiapan/)).toBeNull();
  });

  it('dua kolom tanda tangan: mall kiri (Pimpinan Unit), EO kanan (Menyetujui)', () => {
    renderPaper();
    expect(screen.getByText('Hormat kami,')).toBeInTheDocument();
    expect(screen.getByText('Menyetujui,')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Budi Santoso Wijaya')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pimpinan Unit')).toBeInTheDocument();
    expect(screen.getByLabelText('Nama penyetuju EO')).toHaveValue('Daniel Tito');
    expect(screen.getByLabelText('Nama organisasi EO')).toHaveValue('PT Kreasi Panggung Nusantara');
  });

  it('footer identitas PT: kantor pusat + operasional', () => {
    renderPaper();
    expect(screen.getByText('PT. Metropolitan Land Tbk.')).toBeInTheDocument();
    expect(screen.getByText('Kantor Operasional')).toBeInTheDocument();
  });
});

describe('LetterPaper — varian berbayar (Biaya Kebersihan + VA/Bank)', () => {
  it('kosong → baris tidak tercetak', () => {
    renderPaper();
    expect(screen.queryByText('Biaya Kebersihan')).toBeNull();
    expect(screen.queryByText('No. VA / Bank')).toBeNull();
  });

  it('terisi → kedua baris muncul setelah tabel', () => {
    renderPaper({ biayaKebersihan: '900.901', vaBank: '8808 1234 5678' });
    expect(screen.getAllByText('Biaya Kebersihan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No. VA / Bank').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Biaya Kebersihan')).toHaveValue('900.901');
    expect(screen.getByLabelText('No. VA / Bank')).toHaveValue('8808 1234 5678');
  });
});

describe('LetterPaper — edit inline (always-on)', () => {
  it('input langsung tersedia tanpa klik dan memicu onChange', () => {
    const { onChange } = renderPaper();
    const input = screen.getByDisplayValue('097/MMB/MKT.MC/II/2026');
    fireEvent.change(input, { target: { value: '098/MMB/MKT.MC/II/2026' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nomorSurat: '098/MMB/MKT.MC/II/2026' }));
    expect(screen.getByDisplayValue('097/MMB/MKT.MC/II/2026')).toBeInTheDocument();
  });

  it('menyetujuiNama/menyetujuiOrg editable dan mengalir ke onChange', () => {
    const { onChange } = renderPaper();
    fireEvent.change(screen.getByLabelText('Nama penyetuju EO'), { target: { value: 'Sofan Kuldori' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ menyetujuiNama: 'Sofan Kuldori' }));
    fireEvent.change(screen.getByLabelText('Nama organisasi EO'), { target: { value: 'Sempoa Kreatif' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ menyetujuiOrg: 'Sempoa Kreatif' }));
  });

  it('biayaKebersihan/vaBank editable lewat input tersembunyi walau baris cetak kosong', () => {
    const { onChange } = renderPaper();
    fireEvent.change(screen.getByPlaceholderText('900.901'), { target: { value: '500.000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ biayaKebersihan: '500.000' }));
    fireEvent.change(screen.getByPlaceholderText('8808 1234 5678'), { target: { value: '8802 9999 0000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ vaBank: '8802 9999 0000' }));
  });

  it('readOnly menampilkan teks polos tanpa input', () => {
    renderPaper({}, { readOnly: true });
    expect(screen.queryByDisplayValue('097/MMB/MKT.MC/II/2026')).toBeNull();
    expect(screen.getByText('097/MMB/MKT.MC/II/2026')).toBeInTheDocument();
  });

  it('editable class diterapkan pada field', () => {
    renderPaper();
    const input = screen.getByDisplayValue('097/MMB/MKT.MC/II/2026') as HTMLInputElement;
    expect(input).toHaveClass('editable');
  });

  it('alamatEO multiline: textarea menampilkan nilai multi-baris dan change menulis string dengan \\n', () => {
    const multiline = 'Jl. Ahmad Yani No. 12\nBekasi Selatan\nIndonesia';
    const { onChange } = renderPaper({ alamatEO: multiline });
    const textarea = screen.getByLabelText('Alamat') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.value).toBe(multiline);
    const next = 'Jl. Baru No. 1\nKota Lain\nIndo';
    fireEvent.change(textarea, { target: { value: next } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ alamatEO: next }));
  });
});

describe('LetterPaper — galat per field', () => {
  it('menampilkan pesan galat nomor surat', () => {
    renderPaper({ nomorSurat: '' }, { errors: { nomorSurat: 'Nomor surat wajib diisi' } });
    expect(screen.getByText('Nomor surat wajib diisi')).toBeInTheDocument();
  });

  it('menampilkan pesan galat menyetujuiNama', () => {
    renderPaper({ menyetujuiNama: '' }, { errors: { menyetujuiNama: 'Nama penyetuju (EO) wajib diisi' } });
    expect(screen.getByText('Nama penyetuju (EO) wajib diisi')).toBeInTheDocument();
  });

  it('tidak menampilkan galat bila field valid', () => {
    renderPaper();
    expect(screen.queryByText('Nomor surat wajib diisi')).toBeNull();
  });
});

describe('LetterPaper — print CSS', () => {
  it('letter-editable.css memuat blok @media print', () => {
    const css = readFileSync('src/styles/letter-editable.css', 'utf8');
    expect(css).toContain('@media print');
    expect(css).toContain('.editable');
  });
});
