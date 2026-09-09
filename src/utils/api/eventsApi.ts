import {
  adminAction,
  dbEventToEventItem, eventItemToDbRow,
  dbDraftToDraftItem, withDerivedStatusCache,
  type DbEvent, type DbDraft,
} from './_shared';
import { apiGet, ApiError } from '../../lib/rest';
import type { EventItem, AnnualTheme, HolidayItem, DraftEventItem, HolidayType } from '../../types';

// Row mentah snake_case dari backend REST (public.js whitelist kolom, bukan mapping —
// satu-satunya pemilik snake→camel adalah mapper client di _shared.ts).
interface DbThemeRow {
  id: string; name: string; date_start: string; date_end: string; color: string;
}
interface DbHolidayRow {
  id: string; tanggal: string; date_str: string; day: string; month: string;
  name: string; type: HolidayType; description: string;
}

// ─── Public read ─────────────────────────────────────────────────

export async function fetchEvents(): Promise<{ events: EventItem[]; themes: AnnualTheme[]; holidays: HolidayItem[] }> {
  const [events, themeRows, holidayRows] = await Promise.all([
    apiGet<DbEvent[]>('/events'),
    apiGet<DbThemeRow[]>('/themes'),
    apiGet<DbHolidayRow[]>('/holidays'),
  ]);

  const eventItems: EventItem[] = (events || []).map((row, idx) => dbEventToEventItem(row, idx));
  const themes: AnnualTheme[] = (themeRows || []).map(row => ({
    id: row.id, name: row.name, dateStart: row.date_start, dateEnd: row.date_end, color: row.color,
  }));
  const holidays: HolidayItem[] = (holidayRows || []).map(row => ({
    id: row.id, tanggal: row.tanggal, dateStr: row.date_str, day: row.day, month: row.month,
    name: row.name, type: row.type, description: row.description || '',
  }));
  return { events: eventItems, themes, holidays };
}

/** Public read satu event by id — draft di-exclude (T-003: publik tidak lihat internal). */
export async function fetchEventById(id: string): Promise<EventItem | null> {
  try {
    const row = await apiGet<DbEvent>(`/events/${encodeURIComponent(id)}`);
    return dbEventToEventItem(row, 0);
  } catch (err) {
    // Server 404 saat event draft/tidak ada (mirror maybeSingle: null, bukan error).
    if (err instanceof ApiError && err.code === '404') return null;
    throw err;
  }
}

// ─── Admin writes ────────────────────────────────────────────────

export async function createEvent(eventData: Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex'> | Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex' | 'status'>): Promise<{ row: number; id: string }> {
  const payload = withDerivedStatusCache(eventData as Partial<EventItem>);
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createEvent', { data: eventItemToDbRow(payload) });
  if (!result.success) throw new ApiError(result.error || 'Create event failed');
  return { row: 0, id: result.id || '' };
}

export async function updateEvent(eventData: Partial<EventItem> & { id: string }): Promise<void> {
  const { id, ...rest } = eventData;
  const payload = withDerivedStatusCache(rest);
  const result = await adminAction<{ success: boolean; error?: string }>('updateEvent', { id, data: eventItemToDbRow(payload) });
  if (!result.success) throw new ApiError(result.error || 'Update event failed');
}

export async function deleteEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEvent', { id });
  if (!result.success) throw new ApiError(result.error || 'Delete event failed');
}

export async function batchCreateEvents(eventsData: Array<Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex'> | Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex' | 'status'>>): Promise<{ results: Array<{ row: number; id: string }>; count: number }> {
  const rows = eventsData.map(ev => eventItemToDbRow(withDerivedStatusCache(ev as Partial<EventItem>)));
  const result = await adminAction<{ success: boolean; error?: string; results?: Array<{ id: string }>; count?: number }>('batchCreateEvents', { data: rows });
  if (!result.success) throw new ApiError(result.error || 'Batch create failed');
  const results = (result.results || []).map(r => ({ row: 0, id: r.id }));
  return { results, count: result.count || results.length };
}

export async function deleteRecurringSeries(groupId: string): Promise<{ deletedCount: number }> {
  const result = await adminAction<{ success: boolean; error?: string; deletedCount?: number }>('deleteRecurringSeries', { groupId });
  if (!result.success) throw new ApiError(result.error || 'Delete recurring series failed');
  return { deletedCount: result.deletedCount || 0 };
}

// ─── Annual Themes ────────────────────────────────────────────────

export async function createAnnualTheme(themeData: Omit<AnnualTheme, 'id' | 'sheetRow'>): Promise<{ row: number; id: string }> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createTheme', {
    data: { name: themeData.name, date_start: themeData.dateStart, date_end: themeData.dateEnd, color: themeData.color },
  });
  if (!result.success) throw new ApiError(result.error || 'Create theme failed');
  return { row: 0, id: result.id || '' };
}

export async function updateAnnualTheme(themeData: Partial<AnnualTheme> & { id: string }): Promise<void> {
  const dbData: Record<string, unknown> = {};
  if (themeData.name !== undefined) dbData.name = themeData.name;
  if (themeData.dateStart !== undefined) dbData.date_start = themeData.dateStart;
  if (themeData.dateEnd !== undefined) dbData.date_end = themeData.dateEnd;
  if (themeData.color !== undefined) dbData.color = themeData.color;
  const result = await adminAction<{ success: boolean; error?: string }>('updateTheme', { id: themeData.id, data: dbData });
  if (!result.success) throw new ApiError(result.error || 'Update theme failed');
}

export async function deleteAnnualTheme(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteTheme', { id });
  if (!result.success) throw new ApiError(result.error || 'Delete theme failed');
}

export async function fetchAnnualThemesPublic(): Promise<AnnualTheme[]> {
  try {
    const rows = await apiGet<DbThemeRow[]>('/themes');
    // /themes urut date_start ASC; tampilan publik ingin terbaru di atas.
    return (rows || [])
      .slice()
      .sort((a, b) => String(b.date_start).localeCompare(String(a.date_start)))
      .map(row => ({
        id: row.id, name: row.name, dateStart: row.date_start, dateEnd: row.date_end, color: row.color,
      }));
  } catch (err) {
    // Legacy: error fetch → [] (bukan throw), halaman galeri menangani kosong.
    if (err instanceof ApiError) return [];
    throw err;
  }
}

// ─── Site Settings ───────────────────────────────────────────────

export async function fetchSiteSettings<T = unknown>(key: string): Promise<T | null> {
  try {
    return await apiGet<T>(`/settings/${encodeURIComponent(key)}`);
  } catch (err) {
    // Legacy: key tak ada / error → null (bukan throw).
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export async function updateSiteSettings(key: string, value: unknown): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateSiteSettings', { key, value });
  if (!result.success) throw new ApiError(result.error || 'Update settings failed');
}

// ─── Draft Events (read) ─────────────────────────────────────────

export async function fetchDraftEvents(): Promise<DraftEventItem[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: DbDraft[] }>('readDrafts', {});
  if (!result.success) throw new ApiError(result.error || 'Fetch drafts failed');
  return (result.data || []).map((row, idx) => dbDraftToDraftItem(row, idx));
}