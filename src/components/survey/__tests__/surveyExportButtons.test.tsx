import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SurveyDashboard } from '../SurveyDashboard';
import TenantSurveyPage from '../TenantSurveyPage';
import type { EventItem } from '../../../types';

vi.mock('../../../lib/rest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/rest')>();
  return {
    ...actual,
    apiGet: vi.fn(async (path: string) => (
      path.startsWith('/survey/stats')
        ? { total_responses: 0, recent: [] }
        : path.startsWith('/auth/me')
          ? { success: true, user: null }
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
    render(<SurveyDashboard events={EVENTS} readOnly canExport={false} />);
    // Link tetap ada
    expect(await screen.findByText('Link')).toBeInTheDocument();
    expect(screen.queryByText('CSV')).not.toBeInTheDocument();
  });

  it('menampilkan CSV saat canExport=true (viewer/eo/admin)', async () => {
    render(<SurveyDashboard events={EVENTS} canExport />);
    expect(await screen.findByText('CSV')).toBeInTheDocument();
  });
});

describe('TenantSurveyPage — tombol CSV', () => {
  function openManagement() {
    fireEvent.click(screen.getByRole('button', { name: /Kelola Self-Assessment per Event/ }));
  }

  it('menyembunyikan CSV untuk eo/demo (canExportCsv=false)', () => {
    render(<TenantSurveyPage events={TENANT_EVENTS} isAdmin={false} canExportCsv={false} />);
    openManagement();
    expect(screen.getAllByText('Link').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QR').length).toBeGreaterThan(0);
    expect(screen.queryByText('CSV')).not.toBeInTheDocument();
  });

  it('menampilkan CSV untuk admin', () => {
    render(<TenantSurveyPage events={TENANT_EVENTS} isAdmin canExportCsv />);
    openManagement();
    expect(screen.getAllByText('CSV').length).toBeGreaterThan(0);
  });
});
