import { describe, expect, it, vi, beforeEach } from 'vitest';
import { dbEventAreaToEventArea, fetchEventAreas, updateAreaPhotoOrder } from '../api/albumsApi';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function chainableFrom(data: any, error: any = null) {
  const order = vi.fn().mockResolvedValue({ data, error });
  const select = vi.fn().mockReturnValue({ order });
  return { select };
}

describe('Foto Area Event — albumsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------
  // dbEventAreaToEventArea — snake_case → camelCase boundary
  // -------------------------------------------------------
  describe('dbEventAreaToEventArea', () => {
    it('maps all fields with defaults', () => {
      const area = dbEventAreaToEventArea({
        id: 'era_1',
        name: 'Panggung Lt. 3',
        description: 'Panggung utama',
        cover_photo_url: 'https://cdn.example.com/areas/a.jpg',
        sort_order: 2,
        is_active: false,
      }, 7);
      expect(area).toEqual({
        id: 'era_1',
        name: 'Panggung Lt. 3',
        description: 'Panggung utama',
        coverPhotoUrl: 'https://cdn.example.com/areas/a.jpg',
        sortOrder: 2,
        isActive: false,
        photoCount: 7,
      });
    });

    it('defaults empty description/cover and photoCount 0', () => {
      const area = dbEventAreaToEventArea({
        id: 'era_2',
        name: 'Atrium 2',
        description: '',
        cover_photo_url: '',
        sort_order: 0,
        is_active: true,
      });
      expect(area.description).toBe('');
      expect(area.coverPhotoUrl).toBe('');
      expect(area.sortOrder).toBe(0);
      expect(area.isActive).toBe(true);
      expect(area.photoCount).toBe(0);
    });
  });

  // -------------------------------------------------------
  // fetchEventAreas — reads event_areas + counts area_photos
  // -------------------------------------------------------
  describe('fetchEventAreas', () => {
    it('maps rows and counts photos per area', async () => {
      const areasData = [
        { id: 'era_1', name: 'A', description: '', cover_photo_url: '', sort_order: 0, is_active: true },
        { id: 'era_2', name: 'B', description: '', cover_photo_url: '', sort_order: 1, is_active: true },
      ];
      const photosData = [
        { area_id: 'era_1' },
        { area_id: 'era_1' },
        { area_id: 'era_2' },
      ];
      (supabase.from as any)
        .mockReturnValueOnce(chainableFrom(areasData))
        .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ data: photosData, error: null }) });

      const areas = await fetchEventAreas();

      expect(supabase.from).toHaveBeenNthCalledWith(1, 'event_areas');
      expect(supabase.from).toHaveBeenNthCalledWith(2, 'area_photos');
      expect(areas).toHaveLength(2);
      expect(areas[0]?.photoCount).toBe(2);
      expect(areas[1]?.photoCount).toBe(1);
    });

    it('handles empty tables', async () => {
      (supabase.from as any)
        .mockReturnValueOnce(chainableFrom([]))
        .mockReturnValueOnce(chainableFrom([]));
      expect(await fetchEventAreas()).toEqual([]);
    });

    it('throws on query error', async () => {
      (supabase.from as any)
        .mockReturnValueOnce(chainableFrom(null, { message: 'RLS' }))
        .mockReturnValueOnce(chainableFrom([]));
      await expect(fetchEventAreas()).rejects.toThrow(/Fetch event areas failed: RLS/);
    });
  });

  // -------------------------------------------------------
  // updateAreaPhotoOrder — reorder via adminAction
  // -------------------------------------------------------
  describe('updateAreaPhotoOrder', () => {
    it('posts ordered photos and resolves', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await updateAreaPhotoOrder([
        { id: 'aph_2', sortOrder: 0 },
        { id: 'aph_1', sortOrder: 1 },
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init.body));
      expect(body.action).toBe('updateAreaPhotoOrder');
      expect(body.data).toEqual([
        { id: 'aph_2', sortOrder: 0 },
        { id: 'aph_1', sortOrder: 1 },
      ]);
      vi.unstubAllGlobals();
    });
  });
});