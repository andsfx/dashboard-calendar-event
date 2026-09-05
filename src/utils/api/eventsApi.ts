import { supabase } from '../../lib/supabase';
import {
  SupabaseApiError, adminAction,
  dbEventToEventItem, eventItemToDbRow,
  dbDraftToDraftItem, withDerivedStatusCache,
  type DbEvent, type DbDraft,
} from './_shared';
import type { EventItem, AnnualTheme, HolidayItem, DraftEventItem } from '../../types';

// ─── Public read ─────────────────────────────────────────────────

export async function fetchEvents(): Promise<{ events: EventItem[]; themes: AnnualTheme[]; holidays: HolidayItem[] }> {
  const [eventsRes, themesRes, holidaysRes] = await Promise.all([
    supabase.from('events').select('*').order('date_str', { ascending: true }),
    supabase.from('annual_themes').select('*').order('date_start', { ascending: true }),
    supabase.from('holidays').select('*').order('date_str', { ascending: true }),
  ]);
  if (eventsRes.error) throw new SupabaseApiError(`Fetch events failed: ${eventsRes.error.message}`);
  if (themesRes.error) throw new SupabaseApiError(`Fetch themes failed: ${themesRes.error.message}`);
  if (holidaysRes.error) throw new SupabaseApiError(`Fetch holidays failed: ${holidaysRes.error.message}`);

  const events: EventItem[] = (eventsRes.data || []).map((row, idx) => dbEventToEventItem(row as DbEvent, idx));
  const themes: AnnualTheme[] = (themesRes.data || []).map(row => ({
    id: row.id, name: row.name, dateStart: row.date_start, dateEnd: row.date_end, color: row.color,
  }));
  const holidays: HolidayItem[] = (holidaysRes.data || []).map(row => ({
    id: row.id, tanggal: row.tanggal, dateStr: row.date_str, day: row.day, month: row.month,
    name: row.name, type: row.type, description: row.description || '',
  }));
  return { events, themes, holidays };
}

/** Public read satu event by id — draft di-exclude (T-003: publik tidak lihat internal). */
export async function fetchEventById(id: string): Promise<EventItem | null> {
  const { data, error } = await supabase.from('events')
    .select('*')
    .eq('id', id)
    .neq('status', 'draft')
    .maybeSingle();
  if (error) throw new SupabaseApiError(`Fetch event failed: ${error.message}`);
  return data ? dbEventToEventItem(data as DbEvent, 0) : null;
}

// ─── Admin writes ────────────────────────────────────────────────

export async function createEvent(eventData: Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex'> | Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex' | 'status'>): Promise<{ row: number; id: string }> {
  const payload = withDerivedStatusCache(eventData as Partial<EventItem>);
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createEvent', { data: eventItemToDbRow(payload) });
  if (!result.success) throw new SupabaseApiError(result.error || 'Create event failed');
  return { row: 0, id: result.id || '' };
}

export async function updateEvent(eventData: Partial<EventItem> & { id: string }): Promise<void> {
  const { id, ...rest } = eventData;
  const payload = withDerivedStatusCache(rest);
  const result = await adminAction<{ success: boolean; error?: string }>('updateEvent', { id, data: eventItemToDbRow(payload) });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update event failed');
}

export async function deleteEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEvent', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete event failed');
}

export async function batchCreateEvents(eventsData: Array<Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex'> | Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex' | 'status'>>): Promise<{ results: Array<{ row: number; id: string }>; count: number }> {
  const rows = eventsData.map(ev => eventItemToDbRow(withDerivedStatusCache(ev as Partial<EventItem>)));
  const result = await adminAction<{ success: boolean; error?: string; results?: Array<{ id: string }>; count?: number }>('batchCreateEvents', { data: rows });
  if (!result.success) throw new SupabaseApiError(result.error || 'Batch create failed');
  const results = (result.results || []).map(r => ({ row: 0, id: r.id }));
  return { results, count: result.count || results.length };
}

export async function deleteRecurringSeries(groupId: string): Promise<{ deletedCount: number }> {
  const result = await adminAction<{ success: boolean; error?: string; deletedCount?: number }>('deleteRecurringSeries', { groupId });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete recurring series failed');
  return { deletedCount: result.deletedCount || 0 };
}

// ─── Annual Themes ────────────────────────────────────────────────

export async function createAnnualTheme(themeData: Omit<AnnualTheme, 'id' | 'sheetRow'>): Promise<{ row: number; id: string }> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createTheme', {
    data: { name: themeData.name, date_start: themeData.dateStart, date_end: themeData.dateEnd, color: themeData.color },
  });
  if (!result.success) throw new SupabaseApiError(result.error || 'Create theme failed');
  return { row: 0, id: result.id || '' };
}

export async function updateAnnualTheme(themeData: Partial<AnnualTheme> & { id: string }): Promise<void> {
  const dbData: Record<string, unknown> = {};
  if (themeData.name !== undefined) dbData.name = themeData.name;
  if (themeData.dateStart !== undefined) dbData.date_start = themeData.dateStart;
  if (themeData.dateEnd !== undefined) dbData.date_end = themeData.dateEnd;
  if (themeData.color !== undefined) dbData.color = themeData.color;
  const result = await adminAction<{ success: boolean; error?: string }>('updateTheme', { id: themeData.id, data: dbData });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update theme failed');
}

export async function deleteAnnualTheme(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteTheme', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete theme failed');
}

export async function fetchAnnualThemesPublic(): Promise<AnnualTheme[]> {
  const { data, error } = await supabase.from('annual_themes').select('*').order('date_start', { ascending: false });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id, name: row.name, dateStart: row.date_start, dateEnd: row.date_end, color: row.color,
  }));
}

// ─── Site Settings ───────────────────────────────────────────────

export async function fetchSiteSettings<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', key).single();
  if (error || !data) return null;
  return data.value as T;
}

export async function updateSiteSettings(key: string, value: unknown): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateSiteSettings', { key, value });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update settings failed');
}

// ─── Draft Events (read) ─────────────────────────────────────────

export async function fetchDraftEvents(): Promise<DraftEventItem[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: DbDraft[] }>('readDrafts', {});
  if (!result.success) throw new SupabaseApiError(result.error || 'Fetch drafts failed');
  return (result.data || []).map((row, idx) => dbDraftToDraftItem(row, idx));
}