import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import type * as RouterDom from 'react-router-dom';

// ============================================================
// Viewer publik /letter/:id — judul & unduh mengikuti `docType`.
// Snapshot `pdf_base64` dipakai untuk iframe DAN unduh (T13); fallback render
// ulang harus memakai builder yang sesuai (SKE vs SIK), bukan selalu SKE.
// ============================================================

const get = vi.fn();
vi.mock('../../lib/rest', () => ({ apiGet: (...args: unknown[]) => get(...args) }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterDom>();
  return { ...actual, useParams: () => ({ id: 'ltr_1' }), useNavigate: () => vi.fn() };
});

vi.mock('../../components/nav/PublicSiteHeader', () => ({
  PublicSiteHeader: ({ actions }: { actions?: ReactNode }) => <header>{actions}</header>,
}));

const downloadLetterPdf = vi.fn();
const downloadSikPdf = vi.fn();
vi.mock('../../utils/letterPdfExport', () => ({ downloadLetterPdf: (...a: unknown[]) => downloadLetterPdf(...a) }));
vi.mock('../../utils/sikPdfExport', () => ({ downloadSikPdf: (...a: unknown[]) => downloadSikPdf(...a) }));

const downloadBlob = vi.fn();
vi.mock('../../lib/download', () => ({
  downloadBlob: (...a: unknown[]) => downloadBlob(...a),
  safeFileName: (s: string) => s || 'surat',
}));

import { PublicLetterViewer } from '../PublicLetterViewer';
import type { LetterRequestItem, SikRequestItem } from '../../types';

const SKE: LetterRequestItem = {
  tanggalSurat: '2026-02-05', nomorSurat: '097/MMB/MKT.MC/II/2026',
  namaEO: 'PT. Kasih Karunia Film', penanggungJawab: 'Daniel Tito',
  alamatEO: 'Jl. Pelita no.18', namaEvent: 'Meet & Greet Film',
  lokasi: 'Area Metropolitan Mall Bekasi', hariTanggalPelaksanaan: '8 Februari 2026',
  waktuPelaksanaan: '10.00 - 17.00 WIB', nomorTelepon: '08118421227',
  hariTanggalLoading: '', waktuLoading: '', tempatSurat: 'Bekasi',
  penandatanganNama: 'Rachael Ernest', penandatanganJabatan: 'Pimpinan Unit',
};

const SIK: SikRequestItem = {
  tanggalSurat: '2026-01-30', nomorSurat: '097A/MMB/MKT.SIKI/2026',
  namaEO: 'PT. Kasih Karunia Film', penanggungJawab: 'Daniel Tito',
  nomorHp: '08118421227', jenisKegiatan: 'Loading & Unloading Meet & Greet Film',
  tanggalMulai: '8 Februari 2026', tanggalSelesai: '8 Februari 2026',
  waktu: '08.00 - 18.00', lokasi: 'Area Metropolitan Mall Bekasi',
  namaEvent: 'Meet & Greet Film', tempatSurat: 'Bekasi',
  penandatanganNama: 'Supeno Budiyanto', penandatanganJabatan: 'Marcomm Manager',
  catatan: '',
};

function respondWith(letterData: unknown, extra: Record<string, unknown> = {}) {
  get.mockResolvedValueOnce({
    id: 'ltr_1', letter_data: letterData,
    pdf_url: null, pdf_base64: null,
    created_at: '2026-02-05T00:00:00Z', status: 'active',
    ...extra,
  });
}

function renderViewer() {
  return render(<PublicLetterViewer isDark={false} onToggleDark={() => undefined} />);
}

describe('PublicLetterViewer — dokumen SKE vs SIK', () => {
  beforeEach(() => {
    get.mockReset();
    downloadLetterPdf.mockReset();
    downloadSikPdf.mockReset();
    downloadBlob.mockReset();
  });

  it('baris lama tanpa docType tampil sebagai Surat Konfirmasi Event', async () => {
    respondWith(SKE);
    renderViewer();
    expect(await screen.findByText('Surat Konfirmasi Event')).toBeInTheDocument();
  });

  it('docType sik mengganti judul jadi Surat Izin Kerja', async () => {
    respondWith({ ...SIK, docType: 'sik' });
    renderViewer();
    expect(await screen.findByText('Surat Izin Kerja')).toBeInTheDocument();
    expect(screen.queryByText('Surat Konfirmasi Event')).toBeNull();
  });

  it('unduh memakai snapshot pdf_base64 bila tersedia', async () => {
    respondWith({ ...SIK, docType: 'sik' }, { pdf_base64: 'JVBERi0xLjQK' });
    renderViewer();
    const btn = await screen.findByRole('button', { name: /Unduh PDF/ });
    btn.click();
    expect(downloadBlob).toHaveBeenCalled();
    expect(downloadSikPdf).not.toHaveBeenCalled();
    expect(downloadLetterPdf).not.toHaveBeenCalled();
  });

  it('fallback tanpa snapshot memakai builder SIK, bukan SKE', async () => {
    respondWith({ ...SIK, docType: 'sik' });
    renderViewer();
    const btn = await screen.findByRole('button', { name: /Buat & Unduh PDF/ });
    btn.click();
    await vi.waitFor(() => expect(downloadSikPdf).toHaveBeenCalled());
    expect(downloadLetterPdf).not.toHaveBeenCalled();
  });

  it('fallback SKE memakai builder SKE', async () => {
    respondWith({ ...SKE, docType: 'ske' });
    renderViewer();
    const btn = await screen.findByRole('button', { name: /Buat & Unduh PDF/ });
    btn.click();
    await vi.waitFor(() => expect(downloadLetterPdf).toHaveBeenCalled());
    expect(downloadSikPdf).not.toHaveBeenCalled();
  });
});
