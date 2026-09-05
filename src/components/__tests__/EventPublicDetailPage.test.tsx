/**
 * Test EventPublicDetailPage — permalink publik /events/:id.
 *
 * Kontrak yang dijaga:
 * - Event publik → render judul, tanggal, lokasi, EO, tombol share WA + salin link.
 * - Event tidak ketemu (null — termasuk draft yang di-filter di API) → state "Event tidak ditemukan".
 * - Fetch gagal → state error + tombol coba lagi.
 * - PIC/phone/nominal TIDAK dirender (internal-only — public page isAdmin=false).
 * - document.title di-set per event dan di-restore saat unmount.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EventPublicDetailPage } from '../EventPublicDetailPage';
import type { EventItem } from '../../types';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
    }),
  },
}));

const fetchEventByIdMock = vi.hoisted(() => vi.fn());
vi.mock('../../utils/supabaseApi', () => ({
  fetchEventById: fetchEventByIdMock,
}));

function makeEvent(partial: Partial<EventItem> = {}): EventItem {
  return {
    id: 'evt_1',
    rowIndex: 0,
    tanggal: '10 September 2026',
    dateStr: '2026-09-10',
    day: 'Kamis',
    jam: '10:00 - 21:00',
    acara: 'Festival Minang 2026',
    lokasi: 'Atrium Utama',
    eo: 'Komunitas Minang',
    pic: 'PIC Rahasia',
    phone: '081234567890',
    keterangan: 'Deskripsi event',
    month: 'September',
    status: 'upcoming',
    category: 'Festival',
    categories: ['Festival'],
    priority: 'medium',
    eventModel: 'free',
    eventNominal: 'Rp 5.000.000',
    eventModelNotes: 'notes internal',
    sourceDraftId: '',
    isMultiDay: false,
    eventType: 'single',
    recurrenceGroupId: '',
    posterUrl: '',
    organizationId: '',
    ...partial,
  } as EventItem;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/events/:id" element={<EventPublicDetailPage isDark={false} onToggleDark={() => undefined} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EventPublicDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = 'Komunitas - Metropolitan Mall Bekasi';
  });

  afterEach(() => {
    document.title = 'Komunitas - Metropolitan Mall Bekasi';
  });

  it('render detail event publik: judul, lokasi, EO, tombol share', async () => {
    fetchEventByIdMock.mockResolvedValueOnce(makeEvent());
    renderAt('/events/evt_1');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Festival Minang 2026' })).toBeInTheDocument());
    expect(screen.getAllByText('Atrium Utama').length).toBeGreaterThan(0);
    expect(screen.getByText('Komunitas Minang')).toBeInTheDocument();
    expect(screen.getByText('Kamis, 10 September 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bagikan via WhatsApp/i })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text='),
    );
    expect(screen.getByRole('button', { name: /Salin link/i })).toBeInTheDocument();
  });

  it('PIC, phone, nominal, dan model kerja sama TIDAK tampil di halaman publik', async () => {
    fetchEventByIdMock.mockResolvedValueOnce(makeEvent());
    renderAt('/events/evt_1');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Festival Minang 2026' })).toBeInTheDocument());
    expect(screen.queryByText('PIC Rahasia')).not.toBeInTheDocument();
    expect(screen.queryByText('081234567890')).not.toBeInTheDocument();
    expect(screen.queryByText('Rp 5.000.000')).not.toBeInTheDocument();
  });

  it('event tidak ketemu (draft/terhapus) → "Event tidak ditemukan"', async () => {
    fetchEventByIdMock.mockResolvedValueOnce(null);
    renderAt('/events/evt_missing');
    await waitFor(() => expect(screen.getByText('Event tidak ditemukan')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Lihat semua event/i })).toBeInTheDocument();
  });

  it('fetch gagal → state error + coba lagi mem-fetch ulang', async () => {
    fetchEventByIdMock.mockRejectedValueOnce(new Error('network'));
    renderAt('/events/evt_1');
    await waitFor(() => expect(screen.getByText('Gagal memuat event')).toBeInTheDocument());

    fetchEventByIdMock.mockResolvedValueOnce(makeEvent());
    await userEvent.click(screen.getByRole('button', { name: /Coba lagi/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Festival Minang 2026' })).toBeInTheDocument());
  });

  it('document.title di-set per event', async () => {
    fetchEventByIdMock.mockResolvedValueOnce(makeEvent());
    renderAt('/events/evt_1');
    await waitFor(() => expect(document.title).toBe('Festival Minang 2026 — Jadwal Event Metropolitan Mall Bekasi'));
  });

  it('salin link → clipboard berisi permalink', async () => {
    fetchEventByIdMock.mockResolvedValueOnce(makeEvent());
    const writeText = vi.fn().mockResolvedValueOnce(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderAt('/events/evt_1');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Festival Minang 2026' })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Salin link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('http://localhost:3000/events/evt_1'));
    expect(screen.getByText('Link tersalin')).toBeInTheDocument();
  });
});
