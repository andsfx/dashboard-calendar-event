import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { EventItem } from '../../../types';
import TenantSurveyResultsPage from '../TenantSurveyResultsPage';

// Jalur ekspor hasil evaluasi: tombol membuka pemilih bagian, lalu bagian
// terpilih diteruskan ke generator PDF.
const resultMock = vi.hoisted(() => vi.fn(async () => ({
  blob: new Blob(['%PDF-1.4']),
  fileName: 'hasil-evaluasi-tenant-semua-event-2026-09-30.pdf',
})));
vi.mock('../../../utils/tenantSurveyResultsPdf', () => ({
  renderTenantSurveyResultsPdfResult: resultMock,
}));

const SURVEYS = [
  {
    id: 's1', event_id: 'e1', nama_gerai: 'Kopi A', lokasi_zona: 'Lantai 1', kategori: 'F&B',
    kenaikan_traffic: 'Naik', kenaikan_sales: '> 50%', feedback: 'Pelayanan baik',
    status: 'reviewed', created_at: '2026-08-02T00:00:00Z',
  },
] as never[];

const surveyHook = vi.hoisted(() => ({
  surveys: [] as unknown[],
  isLoading: false,
  error: null as string | null,
}));

vi.mock('../../../hooks/useTenantSurveys', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/useTenantSurveys')>('../../../hooks/useTenantSurveys');
  return {
    ...actual,
    useTenantSurveys: () => ({ ...surveyHook, refreshSurveys: () => {} }),
  };
});

vi.mock('../../../utils/domainApi', async () => {
  const actual = await vi.importActual<typeof import('../../../utils/domainApi')>('../../../utils/domainApi');
  return { ...actual, fetchPublicTenantRoster: vi.fn(async () => []) };
});

const EVENTS = [
  { id: 'e1', status: 'past', acara: 'Pameran Foto Kota', dateStr: '2026-08-10', tanggal: '10 Agustus 2026', categories: [], eo: '', pic: '', phone: '', keterangan: '', month: 'Agustus', category: 'Umum', priority: 'medium', rowIndex: 0, day: 'Senin', jam: '', lokasi: '', eventModel: '', eventNominal: '', eventModelNotes: '' },
] as unknown as EventItem[];

describe('TenantSurveyResultsPage — ekspor PDF', () => {
  it('membuka pemilih bagian dengan seluruh bagian hasil evaluasi', async () => {
    surveyHook.surveys = SURVEYS;
    render(<TenantSurveyResultsPage events={EVENTS} canExport />);
    fireEvent.click(screen.getByRole('button', { name: /Export PDF/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Label bagian dicari di dalam dialog — sebagian nama juga muncul sebagai
    // judul seksi di halaman.
    const labels = [...dialog.querySelectorAll('span')].map((el) => el.textContent);
    expect(labels).toContain('Ringkasan KPI');
    expect(labels).toContain('Distribusi Jawaban');
    expect(labels).toContain('Top Gerai');
    expect(labels).toContain('Cross-tab');
    expect(labels).toContain('Cuplikan Feedback');
    expect(resultMock).not.toHaveBeenCalled();
  });

  it('meneruskan bagian terpilih lalu menahan hasilnya di pratinjau', async () => {
    surveyHook.surveys = SURVEYS;
    render(<TenantSurveyResultsPage events={EVENTS} canExport />);
    fireEvent.click(screen.getByRole('button', { name: /Export PDF/i }));
    await screen.findByRole('dialog');

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Kosongkan/ }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /Ringkasan KPI/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Preview PDF/ }));

    await waitFor(() => expect(resultMock).toHaveBeenCalledTimes(1));
    const [, options] = resultMock.mock.calls[0] as unknown as [unknown, { sections: string[] }];
    expect(options).toEqual({ sections: ['kpi'] });

    // Dokumen ditahan sebagai pratinjau; unduhan baru setelah dikonfirmasi.
    expect(await screen.findByTitle('Pratinjau PDF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh PDF/ })).toBeInTheDocument();
  });
});
