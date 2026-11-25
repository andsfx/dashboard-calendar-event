import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SurveyDashboard } from '../SurveyDashboard';
import TenantSurveyPage from '../TenantSurveyPage';
import type { EventItem } from '../../../types';

function renderDashboard(props: Parameters<typeof SurveyDashboard>[0]) {
  return render(
    <MemoryRouter>
      <SurveyDashboard {...props} />
    </MemoryRouter>,
  );
}

vi.mock('../../../lib/rest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/rest')>();
  return {
    ...actual,
    apiGet: vi.fn(async (path: string) => (
      path.startsWith('/survey/stats')
        ? { total_responses: 0, recent: [] }
        : path.startsWith('/auth/me')
          ? { success: true, user: null }
          : path.startsWith('/survey/config')
            ? { is_active: false, has_config: true }
            : { is_active: false }
    )),
    apiPost: vi.fn(async () => ({ success: true })),
  };
});

vi.mock('../../../hooks/useTenantSurveys', () => ({
  useTenantSurveys: () => ({
    surveys: [],
    isLoading: false,
    error: null,
    refreshSurveys: vi.fn(),
    createSurvey: vi.fn(),
    editSurvey: vi.fn(),
    submit: vi.fn(),
    review: vi.fn(),
    remove: vi.fn(),
  }),
  useTenantSurveyAnalytics: () => ({
    analytics: [],
    isLoading: false,
    error: null,
    refreshAnalytics: vi.fn(),
  }),
  useTenantSurveyDuplicate: () => ({
    duplicate: { alreadySubmitted: false },
    isLoading: false,
    recheckDuplicate: vi.fn(),
  }),
}));

const EVENTS = [
  { id: 'e1', acara: 'Pameran Foto Kota', status: 'past' },
];

const TENANT_EVENTS = [
  {
    id: 'e1', acara: 'Pameran Foto Kota', status: 'past',
    tanggal: '10 Agustus 2026', dateStr: '2026-08-10', lokasi: 'Atrium', eo: 'EO',
  },
] as unknown as Array<Pick<EventItem, 'id' | 'acara' | 'tanggal' | 'dateStr' | 'lokasi' | 'eo' | 'status'>>;

describe('SurveyDashboard — tombol CSV', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: { is_active: false } }) })));
  });

  it('menyembunyikan CSV saat canExport=false (demo)', async () => {
    renderDashboard({ events: EVENTS, readOnly: true, canExport: false });
    // Link tetap ada
    expect(await screen.findByText('Tautan')).toBeInTheDocument();
    expect(screen.queryByText('CSV')).not.toBeInTheDocument();
  });

  it('menampilkan alur kerja dan tautan buka form per event', async () => {
    renderDashboard({ events: EVENTS });

    expect(await screen.findByText('Aktifkan survei per event')).toBeInTheDocument();
    const openLink = screen.getByRole('link', { name: 'Buka form survei Pameran Foto Kota' });
    expect(openLink).toHaveAttribute('href', '/survey/e1');
    expect(screen.getByText('Nonaktif · ajakan disembunyikan')).toBeInTheDocument();
  });

  it('mencari, memfilter status, dan memaginasi event tanpa bergantung pada statistik per-event', async () => {
    const events = Array.from({ length: 10 }, (_, index) => ({
      id: `event-${index + 1}`,
      acara: index === 9 ? 'Festival Penutup' : `Pameran ${index + 1}`,
      status: 'past',
    }));
    renderDashboard({ events });

    expect(await screen.findByText('1–8 dari 10 event')).toBeInTheDocument();
    expect(screen.getAllByText('Tautan')).toHaveLength(8);
    expect(screen.getAllByRole('link', { name: /^Buka form survei/ })).toHaveLength(8);

    fireEvent.click(screen.getByRole('button', { name: 'Halaman berikutnya' }));
    expect(screen.getByText('9–10 dari 10 event')).toBeInTheDocument();
    expect(screen.getAllByText('Tautan')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /^Buka form survei/ })).toHaveLength(2);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Cari event' }), { target: { value: 'Festival' } });
    expect(screen.getByText('1–1 dari 1 event')).toBeInTheDocument();
    expect(screen.getByText('Festival Penutup')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter status survei' }), { target: { value: 'active' } });
    expect(screen.getByText('Tidak ada event yang cocok dengan pencarian atau filter.')).toBeInTheDocument();
    expect(screen.queryByText('Tautan')).not.toBeInTheDocument();
  });

  it('menampilkan CSV saat canExport=true (viewer/eo/admin)', async () => {
    renderDashboard({ events: EVENTS, canExport: true });
    expect(await screen.findByText('CSV')).toBeInTheDocument();
  });
});

describe('TenantSurveyPage — tombol CSV', () => {
  function openManagement() {
    const trigger = screen.getByRole('button', { name: /Kelola penilaian mandiri per event/ });
    if (trigger.getAttribute('aria-expanded') !== 'true') fireEvent.click(trigger);
  }

  it('menyembunyikan CSV untuk eo/demo (canExportCsv=false)', () => {
    render(<TenantSurveyPage events={TENANT_EVENTS} isAdmin={false} canExportCsv={false} />);
    openManagement();
    expect(screen.getAllByText('Tautan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QR').length).toBeGreaterThan(0);
    expect(screen.queryByText('CSV')).not.toBeInTheDocument();
  });

  it('menampilkan CSV untuk admin', () => {
    render(<TenantSurveyPage events={TENANT_EVENTS} isAdmin canExportCsv />);
    openManagement();
    expect(screen.getAllByText('CSV').length).toBeGreaterThan(0);
  });
});
