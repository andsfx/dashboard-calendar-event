import { supabase } from '../lib/supabase';
import { EventItem, AnnualTheme, DraftEventItem, HolidayItem, LetterRequestItem, EventPhoto, CommunityRegistration, PhotoAlbum } from '../types';

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
  const { data: albums, error } = await supabase.from('photo_albums').select('*').order('created_at', { ascending: false });
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

export async function uploadToR2(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `gallery/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  // Convert file to base64
  const buffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  const response = await fetch('/api/r2-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fileName, contentType: file.type, fileBase64: base64 }),
  });

  const result = await response.json();
  if (!result.success) throw new SupabaseApiError(result.error || 'R2 upload failed');
  return result.url;
}

export async function deleteFromR2(url: string): Promise<void> {
  const publicUrlBase = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');
  let fileName = url;
  if (publicUrlBase && url.startsWith(publicUrlBase)) {
    fileName = url.slice(publicUrlBase.length + 1);
  }

  await fetch('/api/r2-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fileName }),
  });
}

export async function uploadAlbumPhoto(albumId: string, file: File, caption: string): Promise<EventPhoto> {
  const url = await uploadToR2(file);
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createAlbumPhoto', { data: { url, caption, album_id: albumId } }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Create photo record failed');
  return { id: result.id || '', url, caption, eventDate: '', sortOrder: result.sortOrder || 0, albumId };
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
  }));
}

export async function updateRegistrationStatus(id: string, status: string, adminNote: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateRegistrationStatus', { id, status, adminNote });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update registration failed');
}

// ---- Community Registration (public, via anon key) ----

export async function submitCommunityRegistration(data: {
  communityName: string;
  communityType: string;
  pic: string;
  phone: string;
  email?: string;
  instagram?: string;
  description?: string;
  preferredDate?: string;
}): Promise<{ id: string }> {
  const { data: result, error } = await supabase.from('community_registrations').insert({
    community_name: data.communityName,
    community_type: data.communityType,
    pic: data.pic,
    phone: data.phone,
    email: data.email || '',
    instagram: data.instagram || '',
    description: data.description || '',
    preferred_date: data.preferredDate || '',
  }).select('id').single();
  if (error) throw new SupabaseApiError(`Registration failed: ${error.message}`);
  return { id: result?.id || '' };
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
