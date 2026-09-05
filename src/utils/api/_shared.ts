import type { EventItem, DraftEventItem } from '../../types';
import { getStatus } from '../eventUtils';


export const ADMIN_PROXY_URL = '/api/supabase-admin';

export class SupabaseApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseApiError';
  }
}

export function detectCategory(acara: string): string {
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

export function normalizeCategories(value?: string[] | string | null, fallbackCategory?: string): string[] {
  const fromValue = Array.isArray(value)
    ? value.filter(Boolean)
    : typeof value === 'string'
      ? value.split(/[|,]/).map(s => s.trim()).filter(Boolean)
      : [];
  const fallback = fallbackCategory ? [fallbackCategory] : [];
  const normalized = fromValue.length > 0 ? fromValue : fallback;
  return Array.from(new Set(normalized.filter(Boolean)));
}

export async function adminAction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(ADMIN_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, ...payload }),
  });
  if (!response.ok) {
    const text = await response.text();
    let message: string | null = null;
    try {
      const body = JSON.parse(text) as { error?: unknown };
      if (typeof body.error === 'string' && body.error) message = body.error;
    } catch {
      // body bukan JSON (mis. 404 dari proxy/dev server) — pakai fallback status
    }
    throw new SupabaseApiError(message ?? `Gagal memuat data admin (HTTP ${response.status})`);
  }
  return response.json() as Promise<T>;
}

// ─── DB row → App type mappers ───────────────────────────────────

export interface DbEvent {
  id: string; date_str: string; date_end: string | null; day: string;
  tanggal: string; jam: string; acara: string; lokasi: string; eo: string;
  pic: string; phone: string; keterangan: string; month: string; status: string;
  category: string; categories: string[]; priority: string; event_model: string;
  event_nominal: string; event_model_notes: string; source_draft_id: string;
  is_multi_day: boolean; day_time_slots: unknown; event_type: string;
  recurrence_group_id: string; is_recurring: boolean; poster_url: string | null;
  organization_id: string | null;
  area_id: string | null;
}

export function dbEventToEventItem(row: DbEvent, index: number): EventItem {
  const categories = normalizeCategories(row.categories, row.category || detectCategory(row.acara));
  return {
    id: row.id, rowIndex: index,
    tanggal: row.tanggal, dateStr: row.date_str, dateEnd: row.date_end || undefined,
    day: row.day, jam: row.jam || '',
    acara: row.acara, lokasi: row.lokasi || '', areaId: row.area_id ?? null, eo: row.eo || '', pic: row.pic || '',
    phone: row.phone || '', keterangan: row.keterangan || '', month: row.month,
    status: row.status === 'draft'
      ? 'draft'
      : getStatus(row.date_str, row.jam || '', row.date_end || undefined,
          Array.isArray(row.day_time_slots) ? row.day_time_slots as EventItem['dayTimeSlots'] : undefined),
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
    posterUrl: row.poster_url || '',
    organizationId: row.organization_id || '',
  };
}

export function eventItemToDbRow(ev: Partial<EventItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (ev.dateStr !== undefined) row.date_str = ev.dateStr;
  if (ev.dateEnd !== undefined) row.date_end = ev.dateEnd || null;
  if (ev.day !== undefined) row.day = ev.day;
  if (ev.tanggal !== undefined) row.tanggal = ev.tanggal;
  if (ev.jam !== undefined) row.jam = ev.jam;
  if (ev.acara !== undefined) row.acara = ev.acara;
  if (ev.areaId !== undefined) row.area_id = ev.areaId || null;
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
  if (ev.organizationId !== undefined) row.organization_id = ev.organizationId || null;
  return row;
}

export interface DbDraft {
  id: string; date_str: string; date_end: string | null; day: string;
  tanggal: string; jam: string; acara: string; lokasi: string; eo: string;
  pic: string; phone: string; keterangan: string; internal_note: string;
  month: string; category: string; categories: string[]; priority: string;
  event_model: string; event_nominal: string; event_model_notes: string;
  progress: string; published: boolean; published_at: string | null;
  deleted: boolean; deleted_at: string | null;
  is_multi_day: boolean; day_time_slots: unknown; event_type: string;
  recurrence_group_id: string; is_recurring: boolean; area_id: string | null;
}

export function dbDraftToDraftItem(row: DbDraft, index: number): DraftEventItem {
  const categories = normalizeCategories(row.categories, row.category || detectCategory(row.acara));
  return {
    id: row.id, rowIndex: index,
    tanggal: row.tanggal, dateStr: row.date_str, dateEnd: row.date_end || undefined,
    day: row.day, jam: row.jam || '',
    acara: row.acara, lokasi: row.lokasi || '', areaId: row.area_id ?? null, eo: row.eo || '', pic: row.pic || '',
    phone: row.phone || '', keterangan: row.keterangan || '',
    internalNote: row.internal_note || '', month: row.month,
    category: categories[0] || detectCategory(row.acara),
    categories,
    priority: (row.priority as DraftEventItem['priority']) || 'medium',
    eventModel: (row.event_model as DraftEventItem['eventModel']) || '',
    eventNominal: row.event_nominal || '',
    eventModelNotes: row.event_model_notes || '',
    progress: (row.progress as DraftEventItem['progress']) || 'draft',
    published: row.published || false, publishedAt: row.published_at || '',
    deleted: row.deleted || false, deletedAt: row.deleted_at || '',
    isMultiDay: row.is_multi_day || false,
    dayTimeSlots: Array.isArray(row.day_time_slots) ? row.day_time_slots as DraftEventItem['dayTimeSlots'] : undefined,
    eventType: (row.event_type as DraftEventItem['eventType']) || 'single',
    recurrenceGroupId: row.recurrence_group_id || '',
    isRecurring: row.is_recurring || false,
  };
}

export function draftItemToDbRow(draft: Partial<DraftEventItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (draft.dateStr !== undefined) row.date_str = draft.dateStr;
  if (draft.dateEnd !== undefined) row.date_end = draft.dateEnd || null;
  if (draft.day !== undefined) row.day = draft.day;
  if (draft.tanggal !== undefined) row.tanggal = draft.tanggal;
  if (draft.jam !== undefined) row.jam = draft.jam;
  if (draft.acara !== undefined) row.acara = draft.acara;
  if (draft.lokasi !== undefined) row.lokasi = draft.lokasi;
  if (draft.eo !== undefined) row.eo = draft.eo;
  if (draft.areaId !== undefined) row.area_id = draft.areaId || null;
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

export function withDerivedStatusCache(ev: Partial<EventItem>): Partial<EventItem> {
  if (ev.status === 'draft') return ev;
  if (!ev.dateStr) return ev;
  return {
    ...ev,
    status: getStatus(ev.dateStr, ev.jam || '', ev.dateEnd, ev.dayTimeSlots),
  };
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}