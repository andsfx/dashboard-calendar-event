import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { SurveyHubPage } from '../SurveyHubPage';
import { fetchEvents } from '../../utils/api/eventsApi';
import { fetchPublicTenantSurveyEvents } from '../../utils/domainApi';
import type { EventItem } from '../../types';

vi.mock('../../utils/api/eventsApi', () => ({ fetchEvents: vi.fn() }));
vi.mock('../../utils/domainApi', () => ({ fetchPublicTenantSurveyEvents: vi.fn() }));

const event = (id: string, acara: string, status: 'past' | 'ongoing' | 'upcoming'): EventItem => ({
  id,
  acara,
  dateStr: '2026-11-20',
  dateEnd: '2026-11-20',
  tanggal: '20 November 2026',
  day: 'Jumat',
  jam: '10:00 - 12:00',
  lokasi: 'Atrium',
  eo: 'EO Metmal',
  pic: '',
  phone: '',
  keterangan: '',
  month: 'November',
  category: 'Festival',
  categories: [],
  priority: 'medium',
  eventModel: '',
  eventNominal: '',
  eventModelNotes: '',
  rowIndex: 0,
  status,
});

function renderHub() {
  return render(
    <MemoryRouter initialEntries={['/survei']}>
      <SurveyHubPage isDark={false} onToggleDark={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('SurveyHubPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('menampilkan jalur tenant hanya untuk event tenant aktif dan jalur EO untuk event yang sedang/selesai', async () => {
    vi.mocked(fetchEvents).mockResolvedValue({
      events: [event('evt-past', 'Festival Selesai', 'past'), event('evt-live', 'Festival Berlangsung', 'ongoing'), event('evt-next', 'Festival Mendatang', 'upcoming')],
      themes: [],
      holidays: [],
    });
    vi.mocked(fetchPublicTenantSurveyEvents).mockResolvedValue([
      { id: 'evt-past', acara: 'Festival Selesai', tanggal: '20 November 2026', lokasi: 'Atrium', eo: 'EO Metmal', status: 'past' },
    ]);

    renderHub();

    expect(await screen.findByRole('link', { name: /Festival Selesai.*Isi evaluasi/i })).toHaveAttribute('href', '/tenant-survey/evt-past');
    expect(screen.getByRole('link', { name: /Festival Selesai.*Isi survei EO/i })).toHaveAttribute('href', '/survey/evt-past?type=organizer');
    expect(screen.getByRole('link', { name: /Festival Berlangsung.*Isi survei EO/i })).toHaveAttribute('href', '/survey/evt-live?type=organizer');
    expect(screen.queryByText('Festival Mendatang')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Festival Berlangsung.*Isi evaluasi/i })).not.toBeInTheDocument();
  });

  it('retry survei tenant tidak memuat ulang daftar event EO', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchEvents).mockRejectedValue(new Error('EO network'));
    vi.mocked(fetchPublicTenantSurveyEvents)
      .mockRejectedValueOnce(new Error('tenant network'))
      .mockResolvedValueOnce([
        { id: 'evt-1', acara: 'Event Tenant', tanggal: '20 November 2026', lokasi: 'Atrium', eo: 'EO', status: 'past' },
      ]);

    renderHub();
    await screen.findByRole('button', { name: 'Coba muat event tenant lagi' });
    expect(fetchEvents).toHaveBeenCalledTimes(1);
    expect(fetchPublicTenantSurveyEvents).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Coba muat event tenant lagi' }));

    expect(await screen.findByRole('link', { name: /Event Tenant.*Isi evaluasi/i })).toHaveAttribute('href', '/tenant-survey/evt-1');
    expect(fetchPublicTenantSurveyEvents).toHaveBeenCalledTimes(2);
    expect(fetchEvents).toHaveBeenCalledTimes(1);
  });

  it('menampilkan retry khusus untuk daftar event yang gagal dimuat', async () => {
    vi.mocked(fetchEvents).mockRejectedValue(new Error('network'));
    vi.mocked(fetchPublicTenantSurveyEvents).mockResolvedValue([]);

    renderHub();

    expect(await screen.findByText('Gagal memuat daftar event.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba muat daftar event lagi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Coba muat event tenant lagi' })).not.toBeInTheDocument();
    await waitFor(() => expect(fetchEvents).toHaveBeenCalledTimes(1));
  });
});
