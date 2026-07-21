import { supabase } from '../lib/supabase';
import { EventItem, AnnualTheme, DraftEventItem, HolidayItem, LetterRequestItem, EventPhoto, CommunityRegistration, PhotoAlbum, GeneratedLetter, TenantEventSurvey, TenantSurveyFormData, TenantSurveyAnalytics, TenantSurveyEventSummary, TenantSurveyEventAnalytics, TenantSurveyMonthlyTrend } from '../types';

// ============================================================
// Supabase API — Replaces sheetsApi.ts
// ============================================================

const ADMIN_PROXY_URL = '/api/supabase-admin';

// Legacy: letter request still uses Google Apps Script
const LEGACY_ADMIN_PROXY_URL = '/api/apps-script-admin';

class SupabaseApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseApiError';
  }
}

// ---- Helpers ----

/** Auto-detect category from event name using keyword matching */
function detectCategory(acara: string): string {
  const name = acara.toLowerCase();
  if (/bazaar|bazar|pasar|market|jualan|booth/.test(name))           return 'Bazaar';
  if (/festival|fest|fair/.test(name))                               return 'Festival';
  if (/workshop|pelatihan|training|kelas|belajar/.test(name))        return 'Workshop';
  if (/lomba|kompetisi|competition|contest|turnamen/.test(name))     return 'Kompetisi';
  if (/fashion|style|mode|catwalk|runway/.test(name))                return 'Fashion';
  if (/seminar|talkshow|talk\s?show|diskusi|symposium|kajian/.test(name)) return 'Seminar';
  if (/pameran|expo|exhibition|display/.test(name))                  return 'Pameran';
  if (/konser|concert|musik|music|band|penyanyi/.test(name))         return 'Konser';
  if (/sosial|bakti|donor|charity|peduli|amal/.test(name))           return 'Sosial';
  if (/seni|art|crafts|kerajinan|lukis|drawing/.test(name))          return 'Seni';
  if (/sport|olahraga|fitness|yoga|senam|futsal|run|fun run/.test(name)) return 'Olahraga';
  if (/hiburan|entertainment|carnival|party/.test(name))             return 'Hiburan';
  if (/karir|career|job|rekrut|hiring|beasiswa/.test(name))          return 'Karir';
  if (/produk|product|launch|launching|promo|brand/.test(name))      return 'Produk';
  if (/kids|anak|children|baby|balita|pinguin/.test(name))           return 'Anak';
  if (/food|kuliner|culinary|makanan|minuman|cafe|resto/.test(name)) return 'Kuliner';
  if (/game|gaming|esport|tekno|tech/.test(name))                    return 'Teknologi';
  if (/health|kesehatan|medis|dokter|farmasi/.test(name))            return 'Kesehatan';
  return 'Umum';
}

function normalizeCategories(value?: string[] | string | null, fallbackCategory?: string): string[] {
  const fromValue = Array.isArray(value)
    ? value.filter(Boolean)
    : typeof value === 'string'
      ? value.split(/[|,]/).map(s => s.trim()).filter(Boolean)
      : [];
  const fallback = fallbackCategory ? [fallbackCategory] : [];
  const normalized = fromValue.length > 0 ? fromValue : fallback;
  return Array.from(new Set(normalized.filter(Boolean)));
}

// ---- Admin proxy helper ----

async function adminAction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(ADMIN_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, ...payload }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new SupabaseApiError(`Admin action '${action}' failed: ${text}`);
  }
  return response.json() as Promise<T>;
}

// ---- DB row → App type mappers ----

interface DbEvent {
  id: string;
  date_str: string;
  date_end: string | null;
  day: string;
  tanggal: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  pic: string;
  phone: string;
  keterangan: string;
  month: string;
  status: string;
  category: string;
  categories: string[];
  priority: string;
  event_model: string;
  event_nominal: string;
  event_model_notes: string;
  source_draft_id: string;
  is_multi_day: boolean;
  day_time_slots: unknown;
  event_type: string;
  recurrence_group_id: string;
  is_recurring: boolean;
  poster_url: string | null;
}

function dbEventToEventItem(row: DbEvent, index: number): EventItem {
  const categories = normalizeCategories(row.categories, row.category || detectCategory(row.acara));
  return {
    id: row.id,
    rowIndex: index,
    tanggal: row.tanggal,
    dateStr: row.date_str,
    dateEnd: row.date_end || undefined,
    day: row.day,
    jam: row.jam || '',
    acara: row.acara,
    lokasi: row.lokasi || '',
    eo: row.eo || '',
    pic: row.pic || '',
    phone: row.phone || '',
    keterangan: row.keterangan || '',
    month: row.month,
    status: (row.status as EventItem['status']) || 'upcoming',
    category: categories[0] || detectCategory(row.acara),
    categories,
    priority: (row.priority as EventItem['priority']) || 'medium',
    eventModel: (row.event_model as EventItem['eventModel']) || '',
    eventNominal: row.event_nominal || '',
    eventModelNotes: row.event_model_notes || '',
    sourceDraftId: row.source_draft_id || '',
    isMultiDay: row.is_multi_day || false,
    dayTimeSlots: Array.isArray(row.day_time_slots) ? row.day_time_slots as EventItem['dayTimeSlots'] : undefined,
    eventType: (row.event_type as EventItem['eventType']) || 'single',
    recurrenceGroupId: row.recurrence_group_id || '',
    isRecurring: row.is_recurring || false,
    posterUrl: row.poster_url || '',
  };
}

function eventItemToDbRow(ev: Partial<EventItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (ev.dateStr !== undefined) row.date_str = ev.dateStr;
  if (ev.dateEnd !== undefined) row.date_end = ev.dateEnd || null;
  if (ev.day !== undefined) row.day = ev.day;
  if (ev.tanggal !== undefined) row.tanggal = ev.tanggal;
  if (ev.jam !== undefined) row.jam = ev.jam;
  if (ev.acara !== undefined) row.acara = ev.acara;
  if (ev.lokasi !== undefined) row.lokasi = ev.lokasi;
  if (ev.eo !== undefined) row.eo = ev.eo;
  if (ev.pic !== undefined) row.pic = ev.pic;
  if (ev.phone !== undefined) row.phone = ev.phone;
  if (ev.keterangan !== undefined) row.keterangan = ev.keterangan;
  if (ev.month !== undefined) row.month = ev.month;
  if (ev.status !== undefined) row.status = ev.status;
  if (ev.category !== undefined) row.category = ev.category;
  if (ev.categories !== undefined) row.categories = ev.categories;
  if (ev.priority !== undefined) row.priority = ev.priority;
  if (ev.eventModel !== undefined) row.event_model = ev.eventModel;
  if (ev.eventNominal !== undefined) row.event_nominal = ev.eventNominal;
  if (ev.eventModelNotes !== undefined) row.event_model_notes = ev.eventModelNotes;
  if (ev.sourceDraftId !== undefined) row.source_draft_id = ev.sourceDraftId;
  if (ev.isMultiDay !== undefined) row.is_multi_day = ev.isMultiDay;
  if (ev.dayTimeSlots !== undefined) row.day_time_slots = ev.dayTimeSlots;
  if (ev.eventType !== undefined) row.event_type = ev.eventType;
  if (ev.recurrenceGroupId !== undefined) row.recurrence_group_id = ev.recurrenceGroupId;
  if (ev.isRecurring !== undefined) row.is_recurring = ev.isRecurring;
  if (ev.posterUrl !== undefined) row.poster_url = ev.posterUrl || null;
  return row;
}

interface DbDraft {
  id: string;
  date_str: string;
  date_end: string | null;
  day: string;
  tanggal: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  pic: string;
  phone: string;
  keterangan: string;
  internal_note: string;
  month: string;
  category: string;
  categories: string[];
  priority: string;
  event_model: string;
  event_nominal: string;
  event_model_notes: string;
  progress: string;
  published: boolean;
  published_at: string | null;
  deleted: boolean;
  deleted_at: string | null;
  is_multi_day: boolean;
  day_time_slots: unknown;
  event_type: string;
  recurrence_group_id: string;
  is_recurring: boolean;
}

function dbDraftToDraftItem(row: DbDraft, index: number): DraftEventItem {
  const categories = normalizeCategories(row.categories, row.category || detectCategory(row.acara));
  return {
    id: row.id,
    rowIndex: index,
    tanggal: row.tanggal,
    dateStr: row.date_str,
    dateEnd: row.date_end || undefined,
    day: row.day,
    jam: row.jam || '',
    acara: row.acara,
    lokasi: row.lokasi || '',
    eo: row.eo || '',
    pic: row.pic || '',
    phone: row.phone || '',
    keterangan: row.keterangan || '',
    internalNote: row.internal_note || '',
    month: row.month,
    category: categories[0] || detectCategory(row.acara),
    categories,
    priority: (row.priority as DraftEventItem['priority']) || 'medium',
    eventModel: (row.event_model as DraftEventItem['eventModel']) || '',
    eventNominal: row.event_nominal || '',
    eventModelNotes: row.event_model_notes || '',
    progress: (row.progress as DraftEventItem['progress']) || 'draft',
    published: row.published || false,
    publishedAt: row.published_at || '',
    deleted: row.deleted || false,
    deletedAt: row.deleted_at || '',
    isMultiDay: row.is_multi_day || false,
    dayTimeSlots: Array.isArray(row.day_time_slots) ? row.day_time_slots as DraftEventItem['dayTimeSlots'] : undefined,
    eventType: (row.event_type as DraftEventItem['eventType']) || 'single',
    recurrenceGroupId: row.recurrence_group_id || '',
    isRecurring: row.is_recurring || false,
  };
}

function draftItemToDbRow(draft: Partial<DraftEventItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (draft.dateStr !== undefined) row.date_str = draft.dateStr;
  if (draft.dateEnd !== undefined) row.date_end = draft.dateEnd || null;
  if (draft.day !== undefined) row.day = draft.day;
  if (draft.tanggal !== undefined) row.tanggal = draft.tanggal;
  if (draft.jam !== undefined) row.jam = draft.jam;
  if (draft.acara !== undefined) row.acara = draft.acara;
  if (draft.lokasi !== undefined) row.lokasi = draft.lokasi;
  if (draft.eo !== undefined) row.eo = draft.eo;
  if (draft.pic !== undefined) row.pic = draft.pic;
  if (draft.phone !== undefined) row.phone = draft.phone;
  if (draft.keterangan !== undefined) row.keterangan = draft.keterangan;
  if (draft.internalNote !== undefined) row.internal_note = draft.internalNote;
  if (draft.month !== undefined) row.month = draft.month;
  if (draft.category !== undefined) row.category = draft.category;
  if (draft.categories !== undefined) row.categories = draft.categories;
  if (draft.priority !== undefined) row.priority = draft.priority;
  if (draft.eventModel !== undefined) row.event_model = draft.eventModel;
  if (draft.eventNominal !== undefined) row.event_nominal = draft.eventNominal;
  if (draft.eventModelNotes !== undefined) row.event_model_notes = draft.eventModelNotes;
  if (draft.progress !== undefined) row.progress = draft.progress;
  if (draft.published !== undefined) row.published = draft.published;
  if (draft.publishedAt !== undefined) row.published_at = draft.publishedAt || null;
  if (draft.deleted !== undefined) row.deleted = draft.deleted;
  if (draft.deletedAt !== undefined) row.deleted_at = draft.deletedAt || null;
  if (draft.isMultiDay !== undefined) row.is_multi_day = draft.isMultiDay;
  if (draft.dayTimeSlots !== undefined) row.day_time_slots = draft.dayTimeSlots;
  if (draft.eventType !== undefined) row.event_type = draft.eventType;
  if (draft.recurrenceGroupId !== undefined) row.recurrence_group_id = draft.recurrenceGroupId;
  if (draft.isRecurring !== undefined) row.is_recurring = draft.isRecurring;
  return row;
}

// ============================================================
// PUBLIC READ OPERATIONS (via anon key / client-side)
// ============================================================

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
    id: row.id,
    name: row.name,
    dateStart: row.date_start,
    dateEnd: row.date_end,
    color: row.color,
  }));

  const holidays: HolidayItem[] = (holidaysRes.data || []).map(row => ({
    id: row.id,
    tanggal: row.tanggal,
    dateStr: row.date_str,
    day: row.day,
    month: row.month,
    name: row.name,
    type: row.type,
    description: row.description || '',
  }));

  return { events, themes, holidays };
}

// ============================================================
// ADMIN WRITE OPERATIONS (via server-side proxy with service_role)
// ============================================================

export async function createEvent(eventData: Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex' | 'status'>): Promise<{ row: number; id: string }> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createEvent', { data: eventItemToDbRow(eventData) });
  if (!result.success) throw new SupabaseApiError(result.error || 'Create event failed');
  return { row: 0, id: result.id || '' };
}

export async function updateEvent(eventData: Partial<EventItem> & { id: string }): Promise<void> {
  const { id, ...rest } = eventData;
  const result = await adminAction<{ success: boolean; error?: string }>('updateEvent', { id, data: eventItemToDbRow(rest) });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update event failed');
}

export async function deleteEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEvent', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete event failed');
}

export async function batchCreateEvents(eventsData: Array<Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex' | 'status'>>): Promise<{ results: Array<{ row: number; id: string }>; count: number }> {
  const rows = eventsData.map(ev => eventItemToDbRow(ev));
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

// ---- Annual Themes ----

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

// ---- Draft Events ----

export async function fetchDraftEvents(): Promise<DraftEventItem[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: DbDraft[] }>('readDrafts', {});
  if (!result.success) throw new SupabaseApiError(result.error || 'Fetch drafts failed');
  return (result.data || []).map((row, idx) => dbDraftToDraftItem(row, idx));
}

export async function createDraftEvent(
  draftData: Omit<DraftEventItem, 'id' | 'sheetRow' | 'rowIndex' | 'published' | 'publishedAt' | 'deleted' | 'deletedAt'>,
  proxyKind: 'admin' | 'public' = 'admin'
): Promise<{ row: number; id: string }> {
  if (proxyKind === 'public') {
    // Public submission: insert directly via anon key (RLS allows INSERT on draft_events)
    const dbRow = draftItemToDbRow(draftData);
    const { data, error } = await supabase.from('draft_events').insert(dbRow).select('id').single();
    if (error) throw new SupabaseApiError(`Public draft creation failed: ${error.message}`);
    return { row: 0, id: data?.id || '' };
  }
  // Admin submission
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createDraft', { data: draftItemToDbRow(draftData) });
  if (!result.success) throw new SupabaseApiError(result.error || 'Create draft failed');
  return { row: 0, id: result.id || '' };
}

export async function updateDraftEvent(draftData: Partial<DraftEventItem> & { id: string }): Promise<void> {
  const { id, ...rest } = draftData;
  const result = await adminAction<{ success: boolean; error?: string }>('updateDraft', { id, data: draftItemToDbRow(rest) });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update draft failed');
}

export async function deleteDraftEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteDraft', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete draft failed');
}

export async function publishDraftEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('publishDraft', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Publish draft failed');
}

export async function restoreDraftEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('restoreDraft', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Restore draft failed');
}

// ---- Site Settings ----

export async function fetchSiteSettings<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error || !data) return null;
  return data.value as T;
}

export async function updateSiteSettings(key: string, value: unknown): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>(
    'updateSiteSettings', { key, value }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Update settings failed');
}

// ---- Event Photos ----

export async function fetchEventPhotos(): Promise<EventPhoto[]> {
  const { data, error } = await supabase
    .from('event_photos')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new SupabaseApiError(`Fetch event photos failed: ${error.message}`);
  return (data || []).map(row => ({
    id: row.id,
    url: row.url,
    caption: row.caption,
    eventDate: row.event_date || '',
    sortOrder: row.sort_order || 0,
  }));
}

export async function uploadEventPhoto(file: File, caption: string, eventDate: string): Promise<EventPhoto> {
  // 1. Upload file to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('event-photos')
    .upload(fileName, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new SupabaseApiError(`Upload failed: ${uploadError.message}`);

  // 2. Get public URL
  const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(fileName);
  const url = urlData.publicUrl;

  // 3. Insert metadata via admin proxy
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createEventPhoto',
    { data: { url, caption, event_date: eventDate } }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Create photo record failed');

  return { id: result.id || '', url, caption, eventDate, sortOrder: result.sortOrder || 0 };
}

export async function deleteEventPhoto(id: string, url: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEventPhoto', { id, url });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete photo failed');
}

export async function createEventPhotoRecord(data: {
  url: string;
  caption?: string;
  event_id?: string;
  event_date?: string;
  sort_order?: number;
}): Promise<{ id: string; sortOrder: number }> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createEventPhoto',
    { data }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Create photo record failed');
  return { id: result.id || '', sortOrder: result.sortOrder || 0 };
}

export async function linkAlbumToEvent(albumId: string, eventId: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('linkAlbumToEvent', {
    id: albumId,
    eventId,
  });
  if (!result.success) throw new SupabaseApiError(result.error || 'Link album failed');
}

export async function updateEventPhotoOrder(photos: Array<{ id: string; sortOrder: number }>): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateEventPhotoOrder', { data: photos });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update photo order failed');
}

// ---- Annual Themes (public read) ----

export async function fetchAnnualThemesPublic(): Promise<AnnualTheme[]> {
  const { data, error } = await supabase.from('annual_themes').select('*').order('date_start', { ascending: false });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    dateStart: row.date_start,
    dateEnd: row.date_end,
    color: row.color,
  }));
}

// ---- Photo Albums (Cloudflare R2 + Supabase metadata) ----

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export async function fetchAlbums(): Promise<PhotoAlbum[]> {
  const { data: albums, error } = await supabase.from('photo_albums').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw new SupabaseApiError(`Fetch albums failed: ${error.message}`);

  // Get photo counts per album
  const { data: photos } = await supabase.from('event_photos').select('album_id');
  const countMap: Record<string, number> = {};
  for (const p of (photos || [])) {
    if (p.album_id) countMap[p.album_id] = (countMap[p.album_id] || 0) + 1;
  }

  return (albums || []).map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    eventDate: row.event_date || '',
    coverPhotoUrl: row.cover_photo_url || '',
    sortOrder: row.sort_order || 0,
    photoCount: countMap[row.id] || 0,
    eventId: row.event_id || '',
    lokasi: row.lokasi || '',
    themeId: row.theme_id || '',
  }));
}

export async function fetchAlbumBySlug(slug: string): Promise<{ album: PhotoAlbum; photos: EventPhoto[] } | null> {
  const { data: album, error } = await supabase.from('photo_albums').select('*').eq('slug', slug).single();
  if (error || !album) return null;

  const { data: photos } = await supabase.from('event_photos').select('*').eq('album_id', album.id).order('sort_order', { ascending: true });

  return {
    album: {
      id: album.id,
      name: album.name,
      slug: album.slug,
      description: album.description || '',
      eventDate: album.event_date || '',
      coverPhotoUrl: album.cover_photo_url || '',
      sortOrder: album.sort_order || 0,
      photoCount: (photos || []).length,
      eventId: album.event_id || '',
      lokasi: album.lokasi || '',
      themeId: album.theme_id || '',
    },
    photos: (photos || []).map(p => ({
      id: p.id,
      url: p.url,
      caption: p.caption || '',
      eventDate: p.event_date || '',
      sortOrder: p.sort_order || 0,
      albumId: p.album_id || '',
    })),
  };
}

export async function createAlbum(name: string, description: string, eventDate: string, eventId?: string, lokasi?: string, themeId?: string): Promise<PhotoAlbum> {
  const slug = slugify(name) || `album-${Date.now()}`;
  const data: Record<string, unknown> = { name, slug, description, event_date: eventDate };
  if (eventId) data.event_id = eventId;
  if (lokasi) data.lokasi = lokasi;
  if (themeId) data.theme_id = themeId;
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createAlbum', { data });
  if (!result.success) throw new SupabaseApiError(result.error || 'Create album failed');
  return { id: result.id || '', name, slug, description, eventDate, coverPhotoUrl: '', sortOrder: 0, photoCount: 0, eventId, lokasi, themeId };
}

export async function deleteAlbum(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteAlbum', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete album failed');
}

export async function setAlbumCover(albumId: string, coverPhotoUrl: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('setAlbumCover', { id: albumId, coverPhotoUrl });
  if (!result.success) throw new SupabaseApiError(result.error || 'Set cover failed');
}

export async function uploadToR2(file: File, folder = 'gallery/'): Promise<string> {
  // Step 1: Get presigned upload URL from server (server builds safe key)
  const presignRes = await fetch('/api/r2-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      folder,
      originalName: file.name,
      contentType: file.type,
    }),
  });

  const presignResult = await presignRes.json();
  if (!presignResult.success) throw new SupabaseApiError(presignResult.error || 'R2 presign failed');

  // Step 2: Upload file directly to R2 via presigned URL (no size limit)
  const uploadRes = await fetch(presignResult.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadRes.ok) throw new SupabaseApiError(`R2 upload failed: ${uploadRes.status}`);

  return presignResult.publicUrl;
}

export async function deleteFromR2(url: string): Promise<void> {
  const publicUrlBase = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');
  let fileName = url;
  if (publicUrlBase && url.startsWith(publicUrlBase)) {
    fileName = url.slice(publicUrlBase.length + 1);
  }

  const res = await fetch('/api/r2-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fileName }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new SupabaseApiError(body.error || `R2 delete failed (${res.status})`);
  }
}

export async function uploadAlbumPhoto(albumId: string, file: File, caption?: string): Promise<EventPhoto> {
  const finalCaption = caption?.trim() || file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  const url = await uploadToR2(file);
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createAlbumPhoto', { data: { url, caption: finalCaption, album_id: albumId } }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Create photo record failed');
  return { id: result.id || '', url, caption: finalCaption, eventDate: '', sortOrder: result.sortOrder || 0, albumId };
}

export async function deleteAlbumPhoto(id: string, url: string): Promise<void> {
  await deleteFromR2(url);
  const result = await adminAction<{ success: boolean; error?: string }>('deleteAlbumPhoto', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete photo failed');
}

// ---- Community Registrations ----

export async function fetchCommunityRegistrations(): Promise<CommunityRegistration[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: any[] }>('readRegistrations', {});
  if (!result.success) throw new SupabaseApiError(result.error || 'Fetch registrations failed');
  return (result.data || []).map(row => ({
    id: row.id,
    communityName: row.community_name || '',
    communityType: row.community_type || '',
    pic: row.pic || '',
    phone: row.phone || '',
    email: row.email || '',
    instagram: row.instagram || '',
    description: row.description || '',
    preferredDate: row.preferred_date || '',
    status: row.status || 'pending',
    adminNote: row.admin_note || '',
    createdAt: row.created_at || '',
    organizationType: row.organization_type || 'komunitas',
    organizationName: row.organization_name || row.community_name || '',
    typeSpecificData: row.type_specific_data || {},
  }));
}

export async function updateRegistrationStatus(id: string, status: string, adminNote: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateRegistrationStatus', { id, status, adminNote });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update registration failed');
}

// ---- Community Registration (public, via anon key) ----

// Map frontend organization types to backend types
function mapOrganizationType(frontendType?: string): string {
  const typeMap: Record<string, string> = {
    'community': 'komunitas',
    'school': 'organisasi',
    'company': 'umkm',
    'eo': 'organisasi',
    'campus': 'organisasi',
    'government': 'organisasi',
    'ngo': 'organisasi',
    'other': 'lainnya',
  };
  return typeMap[frontendType || ''] || 'komunitas';
}

export async function submitCommunityRegistration(data: {
  communityName: string;
  communityType: string;
  pic: string;
  phone: string;
  email?: string;
  instagram?: string;
  description?: string;
  preferredDate?: string;
  organizationType?: string;
  organizationName?: string;
  typeSpecificData?: Record<string, string | number>;
}): Promise<{ id: string }> {
  // Use API endpoint to bypass RLS with service role key
  const response = await fetch('/api/community-registration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organization_type: mapOrganizationType(data.organizationType),
      organization_name: data.organizationName || data.communityName,
      pic: data.pic,
      phone: data.phone,
      email: data.email || '',
      instagram: data.instagram || '',
      description: data.description || '',
      preferred_date: data.preferredDate || '',
      community_name: data.communityName,
      community_type: data.communityType,
      type_specific_data: data.typeSpecificData || {},
    }),
  });
  
  if (!response.ok) {
    let errorMsg = 'Registration failed';
    try {
      const errBody = await response.json();
      errorMsg = errBody.error || errorMsg;
    } catch {
      errorMsg = `Server error (${response.status})`;
    }
    throw new SupabaseApiError(errorMsg);
  }

  const result = await response.json();
  if (!result.success) {
    throw new SupabaseApiError(result.error || 'Registration failed');
  }
  
  return { id: result.id || '' };
}

// ---- Letter Request (legacy - still uses Google Apps Script) ----

export async function createLetterRequest(data: LetterRequestItem): Promise<{ row: number }> {
  const response = await fetch(LEGACY_ADMIN_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'createLetterRequest', data }),
  });
  const result = await response.json();
  if (!result.success) throw new SupabaseApiError(result.error || 'Create letter request failed');
  return { row: result.row || 0 };
}

// ---- Generated Letters (new - stored in Supabase) ----

interface DbGeneratedLetter {
  id: string;
  event_id?: string;
  draft_event_id?: string;
  letter_data: LetterRequestItem;
  pdf_url?: string;
  pdf_base64?: string;
  created_at: string;
  created_by?: string;
  status: 'active' | 'archived' | 'deleted';
}

function dbGeneratedLetterToGeneratedLetter(row: DbGeneratedLetter): GeneratedLetter {
  return {
    id: row.id,
    eventId: row.event_id || undefined,
    draftEventId: row.draft_event_id || undefined,
    letterData: row.letter_data,
    pdfUrl: row.pdf_url || undefined,
    pdfBase64: row.pdf_base64 || undefined,
    createdAt: row.created_at,
    createdBy: row.created_by || undefined,
    status: row.status,
  };
}

export async function fetchGeneratedLetters(eventId?: string, draftEventId?: string): Promise<GeneratedLetter[]> {
  let query = supabase
    .from('generated_letters')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }
  if (draftEventId) {
    query = query.eq('draft_event_id', draftEventId);
  }

  const { data, error } = await query;
  if (error) throw new SupabaseApiError(error.message);
  return (data || []).map(dbGeneratedLetterToGeneratedLetter);
}

export async function createGeneratedLetter(params: {
  eventId?: string;
  draftEventId?: string;
  letterData: LetterRequestItem;
  pdfBase64?: string;
  pdfUrl?: string;
  createdBy?: string;
}): Promise<GeneratedLetter> {
  const { data, error } = await supabase
    .from('generated_letters')
    .insert({
      event_id: params.eventId || null,
      draft_event_id: params.draftEventId || null,
      letter_data: params.letterData,
      pdf_base64: params.pdfBase64 || null,
      pdf_url: params.pdfUrl || null,
      created_by: params.createdBy || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new SupabaseApiError(error.message);
  if (!data) throw new SupabaseApiError('No data returned after insert');

  return dbGeneratedLetterToGeneratedLetter(data as DbGeneratedLetter);
}

export async function updateGeneratedLetter(
  id: string,
  updates: Partial<Pick<GeneratedLetter, 'letterData' | 'pdfUrl' | 'pdfBase64' | 'status'>>
): Promise<GeneratedLetter> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.letterData !== undefined) dbUpdates.letter_data = updates.letterData;
  if (updates.pdfUrl !== undefined) dbUpdates.pdf_url = updates.pdfUrl;
  if (updates.pdfBase64 !== undefined) dbUpdates.pdf_base64 = updates.pdfBase64;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  const { data, error } = await supabase
    .from('generated_letters')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new SupabaseApiError(error.message);
  if (!data) throw new SupabaseApiError('No data returned after update');

  return dbGeneratedLetterToGeneratedLetter(data as DbGeneratedLetter);
}

export async function deleteGeneratedLetter(id: string): Promise<void> {
  const { error } = await supabase
    .from('generated_letters')
    .update({ status: 'deleted' })
    .eq('id', id);

  if (error) throw new SupabaseApiError(error.message);
}

// ---- Tenant Event Surveys ----

interface DbTenantSurvey {
  id: string;
  event_id: string;
  tenant_user_id: string | null;
  tenant_name: string;
  tenant_organization: string;
  tenant_email: string;
  tenant_phone: string;
  business_category: 'fnb' | 'retail' | 'jasa' | 'other';
  business_subcategory: string;
  sales_lift_pct: number | null;
  traffic_lift_pct: number | null;
  venue_rating: number | null;
  management_rating: number | null;
  event_organization_rating: number | null;
  booth_facility_rating: number | null;
  overall_rating: number | null;
  feedback_comment: string;
  improvement_suggestion: string;
  status: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string;
  created_at: string;
  updated_at: string;
  nama_gerai: string | null;
  lokasi_zona: string | null;
  kategori: string | null;
  kenaikan_traffic: string | null;
  kenaikan_sales: string | null;
  feedback_teks: string | null;
  tenant_id: string | null;
  pic_name: string | null;
  pic_phone: string | null;
}

function dbTenantSurveyToTenantSurvey(row: DbTenantSurvey): TenantEventSurvey {
  return {
    id: row.id,
    event_id: row.event_id,
    tenant_user_id: row.tenant_user_id,
    tenant_name: row.tenant_name || '',
    tenant_organization: row.tenant_organization || '',
    tenant_email: row.tenant_email || '',
    tenant_phone: row.tenant_phone || '',
    business_category: row.business_category || 'other',
    business_subcategory: row.business_subcategory || '',
    sales_lift_pct: row.sales_lift_pct || 0,
    traffic_lift_pct: row.traffic_lift_pct || 0,
    venue_rating: row.venue_rating,
    management_rating: row.management_rating,
    event_organization_rating: row.event_organization_rating,
    booth_facility_rating: row.booth_facility_rating,
    overall_rating: row.overall_rating,
    feedback_comment: row.feedback_comment || '',
    improvement_suggestion: row.improvement_suggestion || '',
    status: (row.status as TenantEventSurvey['status']) || 'draft',
    submitted_at: row.submitted_at,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    review_notes: row.review_notes || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    nama_gerai: row.nama_gerai,
    lokasi_zona: row.lokasi_zona,
    kategori: row.kategori,
    kenaikan_traffic: row.kenaikan_traffic,
    kenaikan_sales: row.kenaikan_sales,
    feedback_teks: row.feedback_teks,
    tenant_id: row.tenant_id,
    pic_name: row.pic_name,
    pic_phone: row.pic_phone,
  };
}

function tenantSurveyFormToDbRow(data: TenantSurveyFormData, userId?: string): Record<string, unknown> {
  return {
    event_id: data.event_id,
    tenant_user_id: userId || null,
    tenant_name: data.tenant_name || '',
    tenant_organization: data.tenant_organization || '',
    tenant_email: data.tenant_email || '',
    tenant_phone: data.tenant_phone || '',
    nama_gerai: data.nama_gerai || '',
    lokasi_zona: data.lokasi_zona || null,
    kategori: data.kategori || null,
    kenaikan_traffic: data.kenaikan_traffic || null,
    kenaikan_sales: data.kenaikan_sales || null,
    feedback_teks: data.feedback_teks || '',
    tenant_id: data.tenant_id || null,
    pic_name: data.pic_name || '',
    pic_phone: data.pic_phone || '',
    business_category: data.business_category || 'other',
    business_subcategory: data.business_subcategory || '',
    sales_lift_pct: data.sales_lift_pct ?? null,
    traffic_lift_pct: data.traffic_lift_pct ?? null,
    venue_rating: data.venue_rating ?? null,
    management_rating: data.management_rating ?? null,
    event_organization_rating: data.event_organization_rating ?? null,
    booth_facility_rating: data.booth_facility_rating ?? null,
    overall_rating: data.overall_rating ?? null,
    feedback_comment: data.feedback_comment || '',
    improvement_suggestion: data.improvement_suggestion || '',
    status: 'draft',
  };
}

export async function fetchTenantSurveys(eventId?: string): Promise<TenantEventSurvey[]> {
  try {
    const params = new URLSearchParams({ action: 'list' });
    if (eventId) params.set('event_id', eventId);
    const res = await fetch(`/api/tenant-survey?${params}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data.map((row: DbTenantSurvey) => dbTenantSurveyToTenantSurvey(row));
      }
    }
  } catch { /* fall through to anon client */ }

  let query = supabase
    .from('tenant_event_surveys')
    .select('*')
    .order('created_at', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query;
  if (error) throw new SupabaseApiError(error.message);
  return (data || []).map((row) => dbTenantSurveyToTenantSurvey(row as DbTenantSurvey));
}

/**
 * Public TR results list (no login). Rate-limited server-side.
 * Only submitted/reviewed + PII stripped.
 */
export async function fetchPublicTenantSurveyResults(
  eventId?: string,
): Promise<TenantEventSurvey[]> {
  const params = new URLSearchParams({
    mode: 'public',
    action: 'results-list',
  });
  if (eventId) params.set('event_id', eventId);
  const res = await fetch(`/api/tenant-survey?${params}`);
  if (res.status === 429) {
    throw new SupabaseApiError('Terlalu banyak permintaan. Coba lagi sebentar.');
  }
  if (!res.ok) {
    throw new SupabaseApiError('Gagal memuat hasil survey');
  }
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new SupabaseApiError(json.error || 'Gagal memuat hasil survey');
  }
  return json.data.map((row: DbTenantSurvey) => dbTenantSurveyToTenantSurvey(row));
}

export async function fetchTenantSurveyById(id: string): Promise<TenantEventSurvey> {
  const { data, error } = await supabase
    .from('tenant_event_surveys')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new SupabaseApiError(error.message);
  if (!data) throw new SupabaseApiError('Survey not found');
  return dbTenantSurveyToTenantSurvey(data as DbTenantSurvey);
}

/**
 * Check if a tenant has already submitted a survey for a given event.
 * Returns existingSurveyId if found (for redirect/edit).
 */
export async function checkTenantSurveyDuplicate(
  eventId: string,
  tenantUserId: string,
): Promise<{ alreadySubmitted: boolean; existingSurveyId?: string }> {
  const { data, error } = await supabase
    .from('tenant_event_surveys')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_user_id', tenantUserId)
    .eq('status', 'submitted')
    .maybeSingle();

  if (error) throw new SupabaseApiError(error.message);

  return {
    alreadySubmitted: !!data,
    existingSurveyId: data?.id,
  };
}

export async function createTenantSurvey(formData: TenantSurveyFormData): Promise<TenantEventSurvey> {
  const { data: { user } } = await supabase.auth.getUser();
  const row = tenantSurveyFormToDbRow(formData, user?.id);

  const { data, error } = await supabase
    .from('tenant_event_surveys')
    .insert(row)
    .select()
    .single();

  if (error) {
    // Detect unique-constraint violation (duplicate submission)
    if (error.code === '23505') {
      throw new SupabaseApiError('Anda sudah pernah mengirimkan survey untuk event ini.');
    }
    throw new SupabaseApiError(error.message);
  }
  if (!data) throw new SupabaseApiError('No data returned after insert');
  return dbTenantSurveyToTenantSurvey(data as DbTenantSurvey);
}

export async function updateTenantSurvey(
  id: string,
  updates: Partial<TenantSurveyFormData> & { status?: TenantEventSurvey['status'] },
): Promise<TenantEventSurvey> {
  const dbUpdates: Record<string, unknown> = {};

  const ratingKeys = [
    'venue_rating', 'management_rating',
    'event_organization_rating', 'booth_facility_rating', 'overall_rating',
  ] as const;

  for (const key of ratingKeys) {
    if (key in updates) dbUpdates[key] = (updates as Record<string, unknown>)[key] ?? null;
  }

  const textKeys = [
    'tenant_name', 'tenant_organization', 'tenant_email', 'tenant_phone',
    'nama_gerai', 'lokasi_zona', 'kategori', 'kenaikan_traffic', 'kenaikan_sales',
    'business_category', 'business_subcategory',
    'feedback_comment', 'improvement_suggestion', 'feedback_teks',
    'pic_name', 'pic_phone',
  ] as const;

  for (const key of textKeys) {
    if (key in updates) {
      if (key === 'business_category' || key === 'business_subcategory') {
        dbUpdates[key] = (updates as Record<string, unknown>)[key] ?? '';
      } else {
        dbUpdates[key] = (updates as Record<string, unknown>)[key] || '';
      }
    }
  }

  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    if (updates.status === 'submitted') dbUpdates.submitted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tenant_event_surveys')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new SupabaseApiError('Survey sudah pernah dikirim untuk event ini.');
    }
    throw new SupabaseApiError(error.message);
  }
  if (!data) throw new SupabaseApiError('No data returned after update');
  return dbTenantSurveyToTenantSurvey(data as DbTenantSurvey);
}

/**
 * Submit a draft survey atomically (sets status=submitted).
 * Throws on duplicate (unique constraint).
 */
export async function submitTenantSurvey(id: string): Promise<TenantEventSurvey> {
  return updateTenantSurvey(id, { status: 'submitted' });
}

async function getTenantSurveyAccessToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  } catch { /* ignore */ }
  try {
    const keys = Object.keys(localStorage);
    const sbKey = keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) {
      const raw = JSON.parse(localStorage.getItem(sbKey) || '{}') as { access_token?: string };
      return raw.access_token || '';
    }
  } catch { /* ignore */ }
  return '';
}

/** Admin review: marks survey as reviewed with optional notes. */
export async function reviewTenantSurvey(
  id: string,
  reviewNotes = '',
): Promise<TenantEventSurvey> {
  const token = await getTenantSurveyAccessToken();
  const res = await fetch('/api/tenant-survey?action=review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ id, review_notes: reviewNotes }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new SupabaseApiError(json.error || 'Gagal me-review survey');
  }
  return dbTenantSurveyToTenantSurvey(json.data as DbTenantSurvey);
}

/** Admin hard-delete a survey response. */
export async function deleteTenantSurvey(id: string): Promise<void> {
  const token = await getTenantSurveyAccessToken();
  const res = await fetch('/api/tenant-survey?action=delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ id }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new SupabaseApiError(json.error || 'Gagal menghapus survey');
  }
}

type AnalyticsGroupMode = 'tenant' | 'event' | 'month';

interface AnalyticsFetchOptions {
  group?: AnalyticsGroupMode;
  eventId?: string;
}

// Overloads narrow return type by group param; RPC shape is server contract.
export function fetchTenantSurveyAnalytics(): Promise<TenantSurveyAnalytics[]>;
export function fetchTenantSurveyAnalytics(opts: { group: 'event'; eventId?: string }): Promise<TenantSurveyEventAnalytics[]>;
export function fetchTenantSurveyAnalytics(opts: { group: 'month'; eventId?: string }): Promise<TenantSurveyMonthlyTrend[]>;
export function fetchTenantSurveyAnalytics(opts?: AnalyticsFetchOptions): Promise<TenantSurveyAnalytics[] | TenantSurveyEventAnalytics[] | TenantSurveyMonthlyTrend[]>;
export async function fetchTenantSurveyAnalytics(
  opts?: AnalyticsFetchOptions,
): Promise<TenantSurveyAnalytics[] | TenantSurveyEventAnalytics[] | TenantSurveyMonthlyTrend[]> {
  const params = new URLSearchParams({ action: 'analytics' });
  if (opts?.group) params.set('group', opts.group);
  if (opts?.eventId) params.set('event_id', opts.eventId);

  try {
    const res = await fetch(`/api/tenant-survey?${params}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch { /* fall through to anon client */ }

  // Fallback: direct RPC (old v3 function, no group/event filter)
  const { data, error } = await supabase.rpc('get_tenant_survey_analytics');
  if (error) throw new SupabaseApiError(error.message);
  return (data || []) as TenantSurveyAnalytics[];
}

export function fetchTenantSurveyEventAnalytics(eventId?: string): Promise<TenantSurveyEventAnalytics[]> {
  return fetchTenantSurveyAnalytics({ group: 'event', eventId });
}

export function fetchTenantSurveyMonthlyTrend(eventId?: string): Promise<TenantSurveyMonthlyTrend[]> {
  return fetchTenantSurveyAnalytics({ group: 'month', eventId });
}

/** Public monthly trend for TR results page (rate-limited). */
export async function fetchPublicTenantSurveyMonthlyTrend(
  eventId?: string,
): Promise<TenantSurveyMonthlyTrend[]> {
  const params = new URLSearchParams({
    mode: 'public',
    action: 'results-analytics',
    group: 'month',
  });
  if (eventId) params.set('event_id', eventId);
  const res = await fetch(`/api/tenant-survey?${params}`);
  if (res.status === 429) {
    throw new SupabaseApiError('Terlalu banyak permintaan. Coba lagi sebentar.');
  }
  if (!res.ok) {
    throw new SupabaseApiError('Gagal memuat trend bulanan');
  }
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) return [];
  return json.data as TenantSurveyMonthlyTrend[];
}

export async function fetchTenantSurveyEventSummary(eventId: string): Promise<TenantSurveyEventSummary | null> {
  try {
    const res = await fetch(`/api/tenant-survey?action=summary&event_id=${encodeURIComponent(eventId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data as TenantSurveyEventSummary;
      }
    }
  } catch { /* fall through */ }

  const { data, error } = await supabase.rpc('get_tenant_survey_event_summary', { p_event_id: eventId });
  if (error) throw new SupabaseApiError(error.message);
  if (!data || (data as TenantSurveyEventSummary).tenant_survey_status === 'none') return null;
  return data as TenantSurveyEventSummary;
}

// ─── Public Tenant Survey Submission ────────────────────────────
//
// These functions are used by the PUBLIC route (/tenant-survey/:eventId)
// where visitors/tenants submit surveys WITHOUT being logged in.
// Authentication is bypassed via the service-role API endpoint
// The public endpoint is at /api/tenant-survey?mode=public.
//
// Duplicate detection uses device_fingerprint (like the visitor survey).

export interface PublicTenantSurveyEventInfo {
  id: string;
  acara: string;
  tanggal: string;
  lokasi: string;
  eo: string;
  status: string;
  /** Survey open for public submit; false if config missing or toggled off */
  is_active?: boolean;
}

/**
 * Fetch event info for the public tenant survey form.
 * Uses the anon Supabase client — no auth required.
 * RLS on the events table must allow public SELECT for this to work;
 * if not, the public API endpoint provides a fallback.
 */
export async function fetchPublicTenantSurveyEvent(eventId: string): Promise<PublicTenantSurveyEventInfo | null> {
  // Try the public API endpoint first (uses service-role, bypasses RLS)
  try {
    const res = await fetch(`/api/tenant-survey?mode=public&action=event-info&event_id=${encodeURIComponent(eventId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.event) {
        return {
          ...json.event,
          is_active: json.is_active === true,
        };
      }
      // 403/closed handled by caller via null + status if needed
    }
    if (res.status === 404) return null;
  } catch { /* fall through */ }

  // Fallback: try the anon Supabase client (no is_active — treat as inactive)
  const { data, error } = await supabase
    .from('events')
    .select('id, acara, tanggal, lokasi, eo, status')
    .eq('id', eventId)
    .single();

  if (error || !data) return null;
  return { ...(data as PublicTenantSurveyEventInfo), is_active: false };
}

/**
 * Fetch list of surveyable events (ongoing + past, is_active only via API)
 * for the event picker page at /tenant-survey/ (no eventId).
 */
export async function fetchPublicTenantSurveyEvents(): Promise<PublicTenantSurveyEventInfo[]> {
  try {
    const res = await fetch('/api/tenant-survey?mode=public&action=events');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.events)) {
        return json.events;
      }
    }
  } catch { /* fall through */ }

  // Fallback: anon client — no is_active filter (API path preferred)
  const { data, error } = await supabase
    .from('events')
    .select('id, acara, tanggal, lokasi, eo, status')
    .in('status', ['past', 'ongoing'])
    .order('tanggal', { ascending: false })
    .limit(200);

  if (error || !data) return [];
  return data as PublicTenantSurveyEventInfo[];
}

export interface TenantDropdownOption {
  id: string;
  name: string;
  floor: string;
  lot: string;
  category: string;
  /** May be empty on public list (PII stripped) */
  pic: string;
  /** May be empty on public list (PII stripped) */
  picTelp: string;
  logo: string;
  status: string;
  participantEvoucher: string;
}

/**
 * Fetch PIC detail for a single tenant (by id) from the MID loyalty API.
 * Used to auto-fill PIC name/phone after a tenant is picked from the list.
 * The public list response strips PIC (no mass PII dump); this endpoint
 * returns only the explicitly-selected tenant's PIC fields.
 */
export async function fetchTenantDetail(
  id: string,
): Promise<{ id: string; name: string; pic: string; picTelp: string } | null> {
  const tid = (id || '').trim();
  if (!tid) return null;
  try {
    const res = await fetch(
      `/api/tenant-survey?mode=public&action=tenant-detail&id=${encodeURIComponent(tid)}`,
    );
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.tenant) return json.tenant;
    }
  } catch { /* fall through */ }
  return null;
}

/**
 * Fetch list of active tenants from the MID loyalty API
 * (proxied through /api/tenant-survey?mode=public&action=tenants).
 * Server-side env: MID_API_KEY. Requires q min 2 chars; no full dump.
 */
export async function fetchActiveTenants(query?: string): Promise<TenantDropdownOption[]> {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  try {
    const res = await fetch(
      `/api/tenant-survey?mode=public&action=tenants&q=${encodeURIComponent(q)}`,
    );
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.tenants)) {
        return json.tenants;
      }
    }
  } catch { /* fall through */ }
  return [];
}

/** Auth roster: all active MID tenants (id, name, logo, floor, lot, category). No PIC. */
export interface TenantRosterItem {
  id: string;
  name: string;
  floor: string;
  lot: string;
  category: string;
  logo: string;
}

export async function fetchTenantRoster(): Promise<TenantRosterItem[]> {
  try {
    const res = await fetch('/api/tenant-survey?action=tenant-roster', { credentials: 'include' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.tenants)) {
        return json.tenants as TenantRosterItem[];
      }
    }
  } catch { /* fall through */ }
  return [];
}

/** Public MID roster for TR results (rate-limited, no PIC). */
export async function fetchPublicTenantRoster(): Promise<TenantRosterItem[]> {
  try {
    const res = await fetch('/api/tenant-survey?mode=public&action=results-roster');
    if (res.status === 429) return [];
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.tenants)) {
        return json.tenants as TenantRosterItem[];
      }
    }
  } catch { /* fall through */ }
  return [];
}

/**
 * Check if a device has already submitted a public tenant survey
 * for a given event (fingerprint-based duplicate detection).
 */
export async function checkPublicTenantSurveyDuplicate(
  eventId: string,
  deviceFingerprint: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/tenant-survey?mode=public&action=check&event_id=${encodeURIComponent(eventId)}&fingerprint=${encodeURIComponent(deviceFingerprint)}`,
    );
    if (res.ok) {
      const json = await res.json();
      return !!json.submitted;
    }
  } catch { /* fall through */ }

  // Fallback: try via RPC
  const { data, error } = await supabase.rpc('check_tenant_survey_submitted_public', {
    p_event_id: eventId,
    p_device_fingerprint: deviceFingerprint,
  });
  if (error) return false;
  return !!data;
}

/**
 * Submit a public (anonymous) tenant survey.
 * Always inserts as a fresh row with tenant_user_id = NULL,
 * status = 'submitted', and the device fingerprint + IP/UA for audit.
 */
export interface PublicTenantSurveySubmission extends Omit<TenantSurveyFormData, 'tenant_user_id'> {
  device_fingerprint: string;
  ip_address?: string;
  user_agent?: string;
  nama_gerai?: string | null;
  lokasi_zona?: string | null;
  kategori?: string | null;
  kenaikan_traffic?: string | null;
  kenaikan_sales?: string | null;
  feedback_teks?: string | null;
  tenant_id?: string | null;
  pic_name?: string | null;
  pic_phone?: string | null;
  venue_rating?: number | null;
  management_rating?: number | null;
  event_organization_rating?: number | null;
  booth_facility_rating?: number | null;
  overall_rating?: number | null;
  sales_lift_pct?: number | null;
  traffic_lift_pct?: number | null;
}

export async function submitPublicTenantSurvey(
  data: PublicTenantSurveySubmission,
): Promise<{ id: string; created_at: string }> {
  const res = await fetch('/api/tenant-survey?mode=public&action=submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errMsg = 'Gagal mengirim survey';
    try {
      const errBody = await res.json();
      if (errBody.already_submitted) {
        throw new SupabaseApiError('Anda sudah pernah mengirimkan survey untuk event ini dari perangkat ini.');
      }
      errMsg = errBody.errors?.join(', ') || errBody.error || errMsg;
    } catch (e) {
      if (e instanceof SupabaseApiError) throw e;
      errMsg = `Server error (${res.status})`;
    }
    throw new SupabaseApiError(errMsg);
  }

  const json = await res.json();
  if (!json.success) {
    if (json.already_submitted) {
      throw new SupabaseApiError('Anda sudah pernah mengirimkan survey untuk event ini dari perangkat ini.');
    }
    throw new SupabaseApiError(json.error || 'Gagal mengirim survey');
  }
  return { id: json.id, created_at: json.created_at };
}
