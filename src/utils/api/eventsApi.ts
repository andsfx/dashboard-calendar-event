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
  const [events, { themes, holidays }] = await Promise.all([
    apiGet<DbEvent[]>('/events'),
    fetchThemesAndHolidays(),
  ]);

  const eventItems: EventItem[] = (events || []).map((row, idx) => dbEventToEventItem(row, idx));
  return { events: eventItems, themes, holidays };
}

/**
 * Themes + holidays SAJA, tanpa menyentuh endpoint event publik.
 *
 * Dipakai dashboard: ia membaca daftar event dari channel admin
 * (`fetchAdminEvents`), jadi tidak boleh ikut menarik GET /events publik —
 * dua kanal tetap terpisah (AGENTS.md), dan payloadnya akan dibuang.
 */
export async function fetchThemesAndHolidays(): Promise<{ themes: AnnualTheme[]; holidays: HolidayItem[] }> {
  const [themeRows, holidayRows] = await Promise.all([
    apiGet<DbThemeRow[]>('/themes'),
    apiGet<DbHolidayRow[]>('/holidays'),
  ]);

  const themes: AnnualTheme[] = (themeRows || []).map(row => ({
    id: row.id, name: row.name, dateStart: row.date_start, dateEnd: row.date_end, color: row.color,
  }));
  const holidays: HolidayItem[] = (holidayRows || []).map(row => ({
    id: row.id, tanggal: row.tanggal, dateStr: row.date_str, day: row.day, month: row.month,
    name: row.name, type: row.type, description: row.description || '',
  }));
  return { themes, holidays };
}

/**
 * Admin read — daftar event LENGKAP termasuk yang disembunyikan
 * (`status = 'draft'`). Dashboard memakai ini supaya event yang sudah
 * disembunyikan dari halaman publik tetap terlihat dan bisa ditampilkan
 * kembali; channel publik tetap `fetchEvents()` (tanpa draft).
 */
export async function fetchAdminEvents(): Promise<EventItem[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: DbEvent[] }>('listEvents', {});
  // WAJIB: `apiPost` mengembalikan body flat apa adanya dan TIDAK melempar saat
  // HTTP 200 + `{success:false}` (server lama menjawab "Aksi tidak dikenal").
  // Tanpa cek ini, pemanggil menerima [] dan menyangka berhasil — fallback ke
  // kanal publik tidak pernah jalan dan dashboard tampil kosong.
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat daftar event admin');
  return (result.data || []).map((row, idx) => dbEventToEventItem(row, idx));
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
  if (!result.success) throw new ApiError(result.error || 'Gagal membuat event');
  return { row: 0, id: result.id || '' };
}

/**
 * `lifecycle` = jalur EKSPLISIT untuk gerbang visibilitas publik
 * ('draft' | 'published'). Mapper `eventItemToDbRow` sengaja hanya menulis
 * 'draft' (ADR 008), jadi menampilkan kembali event harus menyebut tujuannya
 * di sini. Digabung ke request yang sama dengan perubahan field supaya tidak
 * ada dua tulisan terpisah yang bisa gagal separuh.
 */
export async function updateEvent(
  eventData: Partial<EventItem> & { id: string },
  lifecycle?: 'draft' | 'published',
): Promise<void> {
  const { id, ...rest } = eventData;
  const payload = withDerivedStatusCache(rest);
  const data: Record<string, unknown> = eventItemToDbRow(payload);
  if (lifecycle) data.status = lifecycle;
  const result = await adminAction<{ success: boolean; error?: string }>('updateEvent', { id, data });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui event');
}

/**
 * Hide/unhide dari tombol baris tabel. Delegasi ke {@link updateEvent} dengan
 * lifecycle eksplisit — hanya kolom `status` yang ditulis (field lain
 * undefined → di-skip mapper).
 */
export async function setEventVisibility(id: string, hidden: boolean): Promise<void> {
  await updateEvent({ id }, hidden ? 'draft' : 'published');
}

export async function deleteEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEvent', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus event');
}

export async function batchCreateEvents(eventsData: Array<Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex'> | Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex' | 'status'>>): Promise<{ results: Array<{ row: number; id: string }>; count: number }> {
  const rows = eventsData.map(ev => eventItemToDbRow(withDerivedStatusCache(ev as Partial<EventItem>)));
  const result = await adminAction<{ success: boolean; error?: string; results?: Array<{ id: string }>; count?: number }>('batchCreateEvents', { data: rows });
  if (!result.success) throw new ApiError(result.error || 'Gagal membuat event massal');
  const results = (result.results || []).map(r => ({ row: 0, id: r.id }));
  return { results, count: result.count || results.length };
}

export async function deleteRecurringSeries(groupId: string): Promise<{ deletedCount: number }> {
  const result = await adminAction<{ success: boolean; error?: string; deletedCount?: number }>('deleteRecurringSeries', { groupId });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus rangkaian event');
  return { deletedCount: result.deletedCount || 0 };
}

// ─── Annual Themes ────────────────────────────────────────────────

export async function createAnnualTheme(themeData: Omit<AnnualTheme, 'id' | 'sheetRow'>): Promise<{ row: number; id: string }> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createTheme', {
    data: { name: themeData.name, date_start: themeData.dateStart, date_end: themeData.dateEnd, color: themeData.color },
  });
  if (!result.success) throw new ApiError(result.error || 'Gagal membuat tema');
  return { row: 0, id: result.id || '' };
}

export async function updateAnnualTheme(themeData: Partial<AnnualTheme> & { id: string }): Promise<void> {
  const dbData: Record<string, unknown> = {};
  if (themeData.name !== undefined) dbData.name = themeData.name;
  if (themeData.dateStart !== undefined) dbData.date_start = themeData.dateStart;
  if (themeData.dateEnd !== undefined) dbData.date_end = themeData.dateEnd;
  if (themeData.color !== undefined) dbData.color = themeData.color;
  const result = await adminAction<{ success: boolean; error?: string }>('updateTheme', { id: themeData.id, data: dbData });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui tema');
}

export async function deleteAnnualTheme(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteTheme', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus tema');
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
    // Legacy: error fetch → [] (bukan throw). Galeri menangani album utama via
    // fetchAlbums (yang melempar) di Promise.all yang sama — themes hanya
    // kosmetik, jadi jangan robohkan galeri sehat saat themes-only gagal.
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
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui pengaturan');
}

// ─── Draft Events (read) ─────────────────────────────────────────

export async function fetchDraftEvents(): Promise<DraftEventItem[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: DbDraft[] }>('readDrafts', {});
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat draft');
  return (result.data || []).map((row, idx) => dbDraftToDraftItem(row, idx));
}