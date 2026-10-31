import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEvents } from '../useEvents';
import { fetchEvents, fetchAdminEvents, fetchThemesAndHolidays, createEvent, updateEvent, deleteEvent } from '../../utils/domainApi';
import { recalculateStatuses } from '../../utils/eventUtils';
import { ApiError } from '../../lib/rest';
import { EventItem } from '../../types';

// Mock the dependencies
vi.mock('../../utils/domainApi', () => ({
  fetchEvents: vi.fn(),
  fetchAdminEvents: vi.fn(),
  fetchThemesAndHolidays: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  createAnnualTheme: vi.fn(),
  updateAnnualTheme: vi.fn(),
  deleteAnnualTheme: vi.fn(),
  batchCreateEvents: vi.fn(),
  deleteRecurringSeries: vi.fn(),
}));

vi.mock('../../utils/eventUtils', () => ({
  sortEvents: vi.fn((events) => events),
  recalculateStatuses: vi.fn((events) => events || []),
  getStatus: vi.fn(() => 'upcoming'),
}));

describe('useEvents', () => {
  const createMockEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
    id: '1',
    rowIndex: 1,
    tanggal: '12 Juni 2025',
    dateStr: '2025-06-12',
    day: 'Kamis',
    jam: '10:00 - 12:00',
    acara: 'Test Event 1',
    lokasi: 'Test Location',
    eo: 'Test EO',
    pic: 'Test PIC',
    phone: '08123456789',
    keterangan: 'Test Description',
    month: 'Desember',
    status: 'upcoming',
    category: 'Meeting',
    categories: ['Meeting'],
    priority: 'medium',
    eventModel: 'free',
    eventNominal: '',
    eventModelNotes: '',
    sheetRow: 2,
    ...overrides,
  });

  const mockEvents: EventItem[] = [createMockEvent()];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state and fetch data', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({
      events: mockEvents,
      themes: [],
      holidays: [],
    });

    const { result } = renderHook(() => useEvents());

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.events).toEqual([]);

    // Wait for fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.error).toBeNull();
    expect(fetchEvents).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(fetchEvents).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Gagal memuat data event. Periksa koneksi, lalu coba lagi.');
    expect(result.current.events).toEqual([]);
  });

  it('should filter events correctly', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({
      events: mockEvents,
      themes: [],
      holidays: [],
    });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearchQuery('Test Event');
    });

    // Wait for debounce
    await waitFor(() => {
      expect(result.current.filteredEvents.length).toBe(1);
    });
  });

  it('should add event successfully', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({
      events: [],
      themes: [],
      holidays: [],
    });

    vi.mocked(createEvent).mockResolvedValueOnce({ id: '2', row: 3 });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newEvent = createMockEvent({
      id: 'temp-1',
      acara: 'New Event',
    });

    let success = false;
    await act(async () => {
      success = await result.current.addEvent(newEvent);
    });

    expect(success).toBe(true);
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(result.current.events.length).toBe(1);
    expect(result.current.events[0].id).toBe('2'); // ID updated from mock
  });

  it('should handle empty data state', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({
      events: [],
      themes: [],
      holidays: [],
    });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.filteredEvents).toEqual([]);
    expect(result.current.stats.total).toBe(0);
  });

  it('should poll every 30s when realtime enabled (Opsi B)', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(fetchEvents).mockResolvedValue({ events: [], themes: [], holidays: [] });
      const { result } = renderHook(() => useEvents());
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.isLoading).toBe(false);
      expect(fetchEvents).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
      // 400ms debounce → poll memicu fetch kedua.
      await act(async () => { await vi.advanceTimersByTimeAsync(400); });
      expect(fetchEvents).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should not poll when realtime: false', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(fetchEvents).mockResolvedValue({ events: [], themes: [], holidays: [] });
      const { result } = renderHook(() => useEvents({ realtime: false }));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.isLoading).toBe(false);
      expect(fetchEvents).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
      expect(fetchEvents).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
  it('fallback ke kanal publik saat aksi admin listEvents belum ada di server', async () => {
    // SPA (Vercel, auto-deploy) dan API (VPS, deploy manual) berversi
    // independen. API lama membalas error untuk aksi baru → dashboard TIDAK
    // boleh kosong; harus turun ke kanal publik.
    vi.mocked(fetchAdminEvents).mockRejectedValueOnce(new Error('Aksi tidak dikenal'));
    vi.mocked(fetchThemesAndHolidays).mockResolvedValueOnce({ themes: [], holidays: [] });
    vi.mocked(fetchEvents).mockResolvedValueOnce({ events: mockEvents, themes: [], holidays: [] });

    const { result } = renderHook(() => useEvents({ includeHidden: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.error).toBeNull();
    expect(fetchEvents).toHaveBeenCalledTimes(1);
  });

  it('kanal admin dipakai bila tersedia — tanpa menyentuh endpoint publik', async () => {
    vi.mocked(fetchAdminEvents).mockResolvedValueOnce(mockEvents);
    vi.mocked(fetchThemesAndHolidays).mockResolvedValueOnce({ themes: [], holidays: [] });

    const { result } = renderHook(() => useEvents({ includeHidden: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.events).toEqual(mockEvents);
    expect(fetchEvents).not.toHaveBeenCalled();
  });

  it('hide/unhide langsung tercermin di state lokal (tanpa menunggu poll)', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({ events: mockEvents, themes: [], holidays: [] });
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(updateEvent).mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.updateEvent({ ...mockEvents[0]!, status: 'upcoming' }, 'draft');
    });
    expect(result.current.events[0]!.status).toBe('draft');

    vi.mocked(updateEvent).mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.updateEvent({ ...mockEvents[0]!, status: 'draft' }, 'published');
    });
    expect(result.current.events[0]!.status).toBe('upcoming');
  });

  it('mutasi yang ditolak 401 memberi tahu sesi berakhir, bukan "coba lagi"', async () => {
    // Regresi: ApiError dari lib/rest dulu jatuh ke kind 'Unknown', sehingga
    // cabang Unauthorized di hook tidak pernah tercapai dan sesi kedaluwarsa
    // tampil sebagai "Perubahan belum tersimpan. Silakan coba lagi." —
    // pengguna mengulang terus tanpa tahu harus masuk ulang.
    vi.mocked(fetchEvents).mockResolvedValueOnce({ events: mockEvents, themes: [], holidays: [] });
    vi.mocked(updateEvent).mockRejectedValueOnce(
      new ApiError('Tidak terautentikasi — silakan login', '401'),
    );

    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.updateEvent({ ...mockEvents[0]!, acara: 'Revisi' });
    });

    expect(success).toBe(false);
    expect(result.current.lastError?.kind).toBe('Unauthorized');
    expect(result.current.error).toBe('Sesi berakhir. Masuk ulang untuk menyimpan perubahan.');
  });

  it('penolakan 409 tetap diklasifikasikan Conflict (bukan Unknown)', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({ events: mockEvents, themes: [], holidays: [] });
    vi.mocked(updateEvent).mockRejectedValueOnce(new ApiError('Data sudah ada (duplikat).', '409'));

    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateEvent({ ...mockEvents[0]!, acara: 'Revisi' });
    });

    expect(result.current.lastError?.kind).toBe('Conflict');
    expect(result.current.error).toBe('Data berubah di server. Muat ulang lalu coba lagi.');
  });

  it('kegagalan validasi 400 menampilkan pesan server, bukan hanya "belum tersimpan"', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({ events: mockEvents, themes: [], holidays: [] });
    vi.mocked(updateEvent).mockRejectedValueOnce(
      new ApiError('Kategori tidak dikenali', '400'),
    );

    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateEvent({ ...mockEvents[0]!, acara: 'Revisi' });
    });

    expect(result.current.lastError?.message).toBe('Kategori tidak dikenali');
    expect(result.current.error).toBe('Kategori tidak dikenali');
  });

  // ─── Sesi & kanal ──────────────────────────────────────────────
  it('401 pada kanal admin TIDAK fallback ke kanal publik', async () => {
    vi.mocked(fetchAdminEvents).mockRejectedValueOnce(
      new ApiError('Tidak terautentikasi', '401'),
    );
    vi.mocked(fetchThemesAndHolidays).mockResolvedValueOnce({ themes: [], holidays: [] });

    const { result } = renderHook(() => useEvents({ includeHidden: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchEvents).not.toHaveBeenCalled();
    expect(result.current.events).toEqual([]);
    expect(result.current.lastError?.kind).toBe('Unauthorized');
    expect(result.current.error).toBe('Sesi berakhir. Masuk ulang untuk melihat jadwal internal.');
  });

  it('5xx pada kanal admin TIDAK fallback ke kanal publik', async () => {
    vi.mocked(fetchAdminEvents).mockRejectedValueOnce(
      new ApiError('Terjadi kesalahan server. Coba lagi.', '500'),
    );
    vi.mocked(fetchThemesAndHolidays).mockResolvedValueOnce({ themes: [], holidays: [] });

    const { result } = renderHook(() => useEvents({ includeHidden: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchEvents).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Gagal memuat jadwal internal. Coba lagi beberapa saat lagi.');
  });

  // ─── Hapus: mutasi vs refresh ──────────────────────────────────
  it('hapus sukses + refresh gagal TIDAK menghidupkan kembali baris', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({ events: mockEvents, themes: [], holidays: [] });
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(deleteEvent).mockResolvedValueOnce(undefined);
    // Refresh setelah DELETE sukses gagal (server/jaringan).
    vi.mocked(fetchEvents).mockRejectedValueOnce(new Error('refresh down'));

    let success = false;
    await act(async () => { success = await result.current.deleteEvent('1'); });

    expect(success).toBe(true);
    expect(result.current.events).toEqual([]);
    expect(result.current.needsRefresh).toBe(true);
    expect(result.current.lastError).toBeNull();
  });

  it('hapus yang gagal di server mengembalikan baris dan lapor error', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({ events: mockEvents, themes: [], holidays: [] });
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(deleteEvent).mockRejectedValueOnce(new ApiError('Gagal menghapus event', '500'));

    let success = true;
    await act(async () => { success = await result.current.deleteEvent('1'); });

    expect(success).toBe(false);
    expect(result.current.events).toHaveLength(1);
    expect(result.current.lastError?.message).toBe('Gagal menghapus event');
  });

  // ─── Polling & visibility ──────────────────────────────────────
  it('visibilitychange saat tab kembali terlihat memicu refresh silent', async () => {
    vi.mocked(fetchEvents).mockResolvedValue({ events: [], themes: [], holidays: [] });
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchEvents).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalledTimes(2));
    // Silent: skeleton tidak berkedip.
    expect(result.current.isLoading).toBe(false);
  });
});
