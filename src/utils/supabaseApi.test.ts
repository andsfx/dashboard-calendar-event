import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as supabaseApi from './supabaseApi';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function chainableFrom(data: any, error: any = null) {
  const order = vi.fn().mockResolvedValue({ data, error });
  const select = vi.fn().mockReturnValue({ order });
  return { select };
}

describe('supabaseApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------
  // fetchEvents — reads 3 tables, detectCategory fallback
  // -------------------------------------------------------
  describe('fetchEvents', () => {
    function makeEvent(overrides: Record<string, any> = {}) {
      return {
        id: 'ev-1', date_str: '2025-06-10', date_end: null,
        day: 'Tuesday', tanggal: '10 Juni 2025',
        jam: '10:00', acara: 'Bazaar Ramadhan', lokasi: 'Hall A',
        eo: 'Panitia', pic: 'Ali', phone: '08123', keterangan: '',
        month: '2025-06', status: 'upcoming', category: '',
        categories: null, priority: 'medium',
        event_model: '', event_nominal: '', event_model_notes: '',
        source_draft_id: '', is_multi_day: false,
        day_time_slots: null, event_type: 'single',
        recurrence_group_id: '', is_recurring: false, poster_url: null,
        ...overrides,
      };
    }

    it('fetches 3 tables and maps events', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'events') return chainableFrom([makeEvent()]);
        return chainableFrom([]);
      });
      const result = await supabaseApi.fetchEvents();
      expect(supabase.from).toHaveBeenCalledWith('events');
      expect(supabase.from).toHaveBeenCalledWith('annual_themes');
      expect(supabase.from).toHaveBeenCalledWith('holidays');
      expect(result.events).toHaveLength(1);
      expect(result.events[0].category).toBe('Bazaar');
    });

    it('throws when events query errors', async () => {
      (supabase.from as any).mockImplementation((table: string) =>
        table === 'events' ? chainableFrom(null, { message: 'DB down' }) : chainableFrom([])
      );
      await expect(supabaseApi.fetchEvents()).rejects.toThrow(/Fetch events failed: DB down/);
    });

    it('handles empty results', async () => {
      (supabase.from as any).mockReturnValue(chainableFrom([]));
      const result = await supabaseApi.fetchEvents();
      expect(result.events).toEqual([]);
      expect(result.themes).toEqual([]);
      expect(result.holidays).toEqual([]);
    });

    it('detectCategory fallback when categories empty', async () => {
      const events = [
        makeEvent({ id: 'e1', acara: 'Workshop React', categories: null }),
        makeEvent({ id: 'e2', acara: 'Jualan Pulsa', categories: ['Bazaar'] }),
        makeEvent({ id: 'e3', acara: 'Fun Run 5K', categories: null }),
      ];
      (supabase.from as any).mockImplementation((table: string) =>
        table === 'events' ? chainableFrom(events) : chainableFrom([])
      );
      const result = await supabaseApi.fetchEvents();
      expect(result.events[0].category).toBe('Workshop');
      expect(result.events[1].category).toBe('Bazaar');
      expect(result.events[2].category).toBe('Olahraga');
    });

    it('maps themes and holidays', async () => {
      const themes = [{ id: 't1', name: 'Ramadhan', date_start: '2025-03-01', date_end: '2025-03-31', color: '#00ff00', sheetRow: 0 }];
      const holidays = [{ id: 'h1', date_str: '2025-08-17', name: 'Merdeka' }];
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'events') return chainableFrom([makeEvent()]);
        if (table === 'annual_themes') return chainableFrom(themes);
        if (table === 'holidays') return chainableFrom(holidays);
        return chainableFrom([]);
      });
      const result = await supabaseApi.fetchEvents();
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].name).toBe('Ramadhan');
      expect(result.holidays).toHaveLength(1);
      expect(result.holidays[0].name).toBe('Merdeka');
    });
  });

  // -------------------------------------------------------
  // createDraftEvent — public submission via supabase.insert
  // -------------------------------------------------------
  describe('createDraftEvent (public)', () => {
    const draftData = { acara: 'Pameran Seni', tanggal: '15 Agustus 2025', dateStr: '2025-08-15' };
    const mockSingle = vi.fn();
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    beforeEach(() => {
      (supabase.from as any).mockReturnValue({ insert: mockInsert });
    });

    it('inserts draft and returns id', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'draft-42' }, error: null });
      const result = await supabaseApi.createDraftEvent(draftData as any, 'public');
      expect(supabase.from).toHaveBeenCalledWith('draft_events');
      expect(result.id).toBe('draft-42');
      expect(mockInsert.mock.calls[0][0].acara).toBe('Pameran Seni');
    });

    it('throws on insert error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'RLS violation' } });
      await expect(supabaseApi.createDraftEvent(draftData as any, 'public'))
        .rejects.toThrow(/Public draft creation failed: RLS violation/);
    });
  });

  // -------------------------------------------------------
  // fetchSiteSettings — simple supabase read
  // -------------------------------------------------------
  describe('fetchSiteSettings', () => {
    const mockSingle = vi.fn();
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    beforeEach(() => {
      (supabase.from as any).mockReturnValue({ select: mockSelect });
    });

    it('returns value when key exists', async () => {
      mockSingle.mockResolvedValue({ data: { value: { theme: 'dark' } }, error: null });
      expect(await supabaseApi.fetchSiteSettings('app_config')).toEqual({ theme: 'dark' });
    });

    it('returns null when key not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      expect(await supabaseApi.fetchSiteSettings('nope')).toBeNull();
    });

    it('returns null on query error (catch-all)', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'timeout' } });
      expect(await supabaseApi.fetchSiteSettings('x')).toBeNull();
    });
  });

  // -------------------------------------------------------
  // deleteDraftEvent — uses adminAction (fetch mock)
  // -------------------------------------------------------
  describe('deleteDraftEvent', () => {
    it('resolves when admin returns success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(supabaseApi.deleteDraftEvent('draft-1')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith('/api/supabase-admin', expect.objectContaining({
        body: expect.stringContaining('"action":"deleteDraft"'),
      }));

      vi.stubGlobal('fetch', undefined);
    });
  });
});
