/**
 * Dialog "Sinkronkan jadwal ke kalender".
 *
 * Kontrak yang dijaga:
 * - Deep link Google Calendar memakai `cid=webcal://...` ke feed publik.
 * - URL langganan yang ditampilkan bisa disalin, dan status salin diumumkan.
 * - Unduhan .ics hanya muncul saat halaman memberi daftar event.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CalendarSyncDialog } from '../CalendarSyncDialog';
import type { EventItem } from '../../../types';

function makeEvent(): EventItem {
  return {
    id: 'evt_1',
    acara: 'Bazar Komunitas',
    dateStr: '2026-11-20',
    day: 'Jumat',
    jam: '10:00 - 12:00',
    lokasi: 'Atrium',
    eo: 'Komunitas',
    keterangan: '',
    month: 'November',
    status: 'upcoming',
    category: 'Bazar',
    categories: ['Bazar'],
    priority: 'medium',
    eventModel: 'free',
    eventNominal: '',
    eventModelNotes: '',
    pic: '',
    phone: '',
    tanggal: '20 November 2026',
    rowIndex: 0,
  } as EventItem;
}

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('CalendarSyncDialog', () => {
  it('menampilkan judul, deep link Google, dan URL feed', () => {
    render(<CalendarSyncDialog isOpen onClose={() => {}} events={[makeEvent()]} />);

    expect(screen.getByRole('heading', { name: 'Sinkronkan jadwal ke kalender' })).toBeInTheDocument();

    const google = screen.getByRole('link', { name: /Tambah ke Google Calendar/i });
    const href = google.getAttribute('href') ?? '';
    expect(href.startsWith('https://calendar.google.com/calendar/r?cid=')).toBe(true);
    expect(decodeURIComponent(href)).toContain('webcal://');

    const input = screen.getByLabelText('URL langganan') as HTMLInputElement;
    expect(input.value.endsWith('/api/v1/calendar.ics')).toBe(true);
  });

  it('menyalin URL dan mengubah label menjadi Tersalin', async () => {
    render(<CalendarSyncDialog isOpen onClose={() => {}} events={[makeEvent()]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salin URL langganan' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'URL langganan tersalin' })).toHaveTextContent('Tersalin');
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/calendar.ics'),
    );
  });

  it('build produksi tanpa VITE_API_URL menyembunyikan aksi langganan', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_URL', '');
    render(<CalendarSyncDialog isOpen onClose={() => {}} events={[makeEvent()]} />);

    expect(screen.getByText(/VITE_API_URL/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tambah ke Google Calendar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh semua event/i })).toBeInTheDocument();
  });

  it('tanpa daftar event, tombol unduh .ics disembunyikan', () => {
    render(<CalendarSyncDialog isOpen onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /Unduh semua event/i })).not.toBeInTheDocument();
  });
});