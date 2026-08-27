import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEvents } from '../useEvents';
import { fetchEvents, createEvent } from '../../utils/supabaseApi';
import { recalculateStatuses } from '../../utils/eventUtils';
import { supabase } from '../../lib/supabase';
import { EventItem } from '../../types';

// Mock the dependencies
vi.mock('../../utils/supabaseApi', () => ({
  fetchEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  createAnnualTheme: vi.fn(),
  updateAnnualTheme: vi.fn(),
  deleteAnnualTheme: vi.fn(),
  batchCreateEvents: vi.fn(),
  deleteRecurringSeries: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../../utils/eventUtils', () => ({
  sortEvents: vi.fn((events) => events),
  recalculateStatuses: vi.fn((events) => events || []),
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

    expect(result.current.error).toBe('Gagal memuat data event. Periksa koneksi atau konfigurasi proxy publik.');
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

  it('should subscribe to realtime by default', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({ events: [], themes: [], holidays: [] });
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(supabase.channel).toHaveBeenCalledWith('events-realtime');
    expect(supabase.removeChannel).not.toHaveBeenCalled();
  });

  it('should skip realtime subscription when realtime: false', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({ events: [], themes: [], holidays: [] });
    const { result } = renderHook(() => useEvents({ realtime: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(supabase.channel).not.toHaveBeenCalled();
  });
});
