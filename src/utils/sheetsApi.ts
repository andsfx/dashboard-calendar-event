import { EventItem, AnnualTheme, DraftEventItem, HolidayItem, HolidayType, LetterRequestItem } from '../types';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

interface SheetsEvent {
  id?: string;
  sheetRow: number;
  tanggal: string;
  dateStr: string;
  day: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  pic?: string;
  phone?: string;
  keterangan: string;
  month: string;
  status?: EventItem['status'];
  category?: string;
  categories?: string[];
  priority?: EventItem['priority'];
  eventModel?: EventItem['eventModel'];
  eventNominal?: string;
  eventModelNotes?: string;
  sourceDraftId?: string;
}

interface SheetsApiResponse {
  success: boolean;
  data?: {
    events: SheetsEvent[];
    themes: AnnualTheme[];
    holidays: Array<{
      id?: string;
      sheetRow: number;
      tanggal: string;
      dateStr: string;
      day: string;
      month: string;
      name: string;
      type: HolidayType;
      description: string;
    }>;
  };
  error?: string;
}

interface DraftSheetsApiResponse {
  success: boolean;
  data?: Array<{
    id?: string;
    sheetRow: number;
    tanggal: string;
    dateStr: string;
    day: string;
    jam: string;
    acara: string;
    lokasi: string;
    eo: string;
    pic: string;
    phone: string;
    keterangan: string;
    internalNote: string;
    month: string;
    category: string;
    categories: string[];
    priority: 'high' | 'medium' | 'low';
    eventModel: EventItem['eventModel'];
    eventNominal: string;
    eventModelNotes: string;
    progress: 'draft' | 'confirm' | 'cancel';
    published: boolean;
    publishedAt?: string;
    deleted: boolean;
    deletedAt?: string;
  }>;
  error?: string;
}

class SheetsApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetsApiError';
  }
}

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

function normalizeCategories(value?: string[] | string, fallbackCategory?: string): string[] {
  const fromValue = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split('|').map(item => item.trim()).filter(Boolean)
      : [];
  const normalized = fromValue.length > 0 ? fromValue : (fallbackCategory ? [fallbackCategory] : []);
  return Array.from(new Set(normalized.filter(Boolean)));
}

async function postAction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ action, ...payload }),
  });
  return response.json() as Promise<T>;
}

function getComputedStatus(dateStr: string): EventItem['status'] {
  const today = new Date().toISOString().split('T')[0];
  if (dateStr < today) return 'past';
  if (dateStr === today) return 'ongoing';
  return 'upcoming';
}

export async function fetchEvents(): Promise<{ events: EventItem[]; themes: AnnualTheme[]; holidays: HolidayItem[] }> {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('REPLACE_WITH_YOUR_URL')) {
    console.warn('VITE_APPS_SCRIPT_URL masih menggunakan placeholder atau belum dikonfigurasi di .env.');
    throw new SheetsApiError('Apps Script URL belum dikonfigurasi (masih menggunakan teks REPLACE_WITH_YOUR_URL)');
  }

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=read`);
    const text = await response.text();
    const result: SheetsApiResponse = JSON.parse(text);

    if (!result.success || !result.data) {
      throw new SheetsApiError(result.error || 'Unknown error');
    }

    const events: EventItem[] = result.data.events.map((e, index) => {
      const categories = normalizeCategories(e.categories, e.category || detectCategory(e.acara));
      return {
        id: e.id || `evt-${e.sheetRow}`,
        sheetRow: e.sheetRow,
        rowIndex: index + 2,
        tanggal: e.tanggal,
        dateStr: e.dateStr,
        day: e.day,
        jam: e.jam,
        acara: e.acara,
        lokasi: e.lokasi,
        eo: e.eo,
        pic: e.pic || '',
        phone: e.phone || '',
        keterangan: e.keterangan,
        month: e.month,
        status: e.status || getComputedStatus(e.dateStr),
        categories,
        category: categories[0] || detectCategory(e.acara),
        priority: e.priority || 'medium',
        eventModel: e.eventModel || '',
        eventNominal: e.eventNominal || '',
        eventModelNotes: e.eventModelNotes || '',
        sourceDraftId: e.sourceDraftId || '',
      };
    });

    const holidays: HolidayItem[] = (result.data.holidays || []).map((holiday, index) => ({
      id: holiday.id || `hol-${holiday.sheetRow || index + 1}`,
      sheetRow: holiday.sheetRow,
      tanggal: holiday.tanggal,
      dateStr: holiday.dateStr,
      day: holiday.day,
      month: holiday.month,
      name: holiday.name,
      type: holiday.type,
      description: holiday.description || '',
    }));

    const themes: AnnualTheme[] = (result.data.themes || []).map((theme, index) => ({
      id: theme.id || `theme-${theme.sheetRow || index + 1}`,
      sheetRow: theme.sheetRow,
      name: theme.name,
      dateStart: theme.dateStart,
      dateEnd: theme.dateEnd,
      color: theme.color,
    }));

    return { events, themes, holidays };
  } catch (error) {
    console.error('Error fetching from Sheets:', error);
    throw error;
  }
}

export async function createEvent(eventData: Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex' | 'status'>): Promise<{ row: number; id: string }> {
  try {
    const result = await postAction<{ success: boolean; error?: string; row?: number; id?: string }>('create', { data: eventData });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Create failed');
    }
    return { row: result.row || 0, id: result.id || '' };
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

export async function updateEvent(eventData: Partial<EventItem> & { id: string }): Promise<void> {
  try {
    const result = await postAction<{ success: boolean; error?: string }>('update', { data: eventData });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Update failed');
    }
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    const result = await postAction<{ success: boolean; error?: string }>('delete', { id });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Delete failed');
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

export async function createAnnualTheme(themeData: Omit<AnnualTheme, 'id' | 'sheetRow'>): Promise<{ row: number; id: string }> {
  try {
    const result = await postAction<{ success: boolean; error?: string; row?: number; id?: string }>('createTheme', { data: themeData });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Create annual theme failed');
    }
    return { row: result.row || 0, id: result.id || '' };
  } catch (error) {
    console.error('Error creating annual theme:', error);
    throw error;
  }
}

export async function updateAnnualTheme(themeData: Partial<AnnualTheme> & { id: string }): Promise<void> {
  try {
    const result = await postAction<{ success: boolean; error?: string }>('updateTheme', { data: themeData });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Update annual theme failed');
    }
  } catch (error) {
    console.error('Error updating annual theme:', error);
    throw error;
  }
}

export async function deleteAnnualTheme(id: string): Promise<void> {
  try {
    const result = await postAction<{ success: boolean; error?: string }>('deleteTheme', { id });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Delete annual theme failed');
    }
  } catch (error) {
    console.error('Error deleting annual theme:', error);
    throw error;
  }
}

export async function fetchDraftEvents(): Promise<DraftEventItem[]> {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('REPLACE_WITH_YOUR_URL')) {
    throw new SheetsApiError('Apps Script URL belum dikonfigurasi');
  }

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=readDrafts`);
    const text = await response.text();
    const result: DraftSheetsApiResponse = JSON.parse(text);

    if (!result.success || !result.data) {
      throw new SheetsApiError(result.error || 'Failed to read drafts');
    }

    return result.data.map((draft, index) => ({
      id: draft.id || `draft-${draft.sheetRow}`,
      sheetRow: draft.sheetRow,
      rowIndex: index + 2,
      tanggal: draft.tanggal,
      dateStr: draft.dateStr,
      day: draft.day,
      jam: draft.jam,
      acara: draft.acara,
      lokasi: draft.lokasi,
      eo: draft.eo,
      pic: draft.pic,
      phone: draft.phone,
      keterangan: draft.keterangan,
      internalNote: draft.internalNote || '',
      month: draft.month,
      category: draft.category || detectCategory(draft.acara),
      categories: normalizeCategories(draft.categories, draft.category || detectCategory(draft.acara)),
      priority: draft.priority || 'medium',
      eventModel: draft.eventModel || '',
      eventNominal: draft.eventNominal || '',
      eventModelNotes: draft.eventModelNotes || '',
      progress: draft.progress,
      published: !!draft.published,
      publishedAt: draft.publishedAt || '',
      deleted: !!draft.deleted,
      deletedAt: draft.deletedAt || '',
    }));
  } catch (error) {
    console.error('Error fetching draft events:', error);
    throw error;
  }
}

export async function createDraftEvent(draftData: Omit<DraftEventItem, 'id' | 'sheetRow' | 'rowIndex' | 'published' | 'publishedAt' | 'deleted' | 'deletedAt'>): Promise<{ row: number; id: string }> {
  try {
    const result = await postAction<{ success: boolean; error?: string; row?: number; id?: string }>('createDraft', { data: draftData });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Create draft failed');
    }
    return { row: result.row || 0, id: result.id || '' };
  } catch (error) {
    console.error('Error creating draft event:', error);
    throw error;
  }
}

export async function updateDraftEvent(draftData: Partial<DraftEventItem> & { id: string }): Promise<void> {
  try {
    const result = await postAction<{ success: boolean; error?: string }>('updateDraft', { data: draftData });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Update draft failed');
    }
  } catch (error) {
    console.error('Error updating draft event:', error);
    throw error;
  }
}

export async function deleteDraftEvent(id: string): Promise<void> {
  try {
    const result = await postAction<{ success: boolean; error?: string }>('deleteDraft', { id });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Delete draft failed');
    }
  } catch (error) {
    console.error('Error deleting draft event:', error);
    throw error;
  }
}

export async function publishDraftEvent(id: string): Promise<void> {
  try {
    const result = await postAction<{ success: boolean; error?: string }>('publishDraft', { id });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Publish draft failed');
    }
  } catch (error) {
    console.error('Error publishing draft event:', error);
    throw error;
  }
}

export async function restoreDraftEvent(id: string): Promise<void> {
  try {
    const result = await postAction<{ success: boolean; error?: string }>('restoreDraft', { id });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Restore draft failed');
    }
  } catch (error) {
    console.error('Error restoring draft event:', error);
    throw error;
  }
}

export async function createLetterRequest(data: LetterRequestItem): Promise<{ row: number }> {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  try {
    const result = await postAction<{ success: boolean; error?: string; row?: number }>('createLetterRequest', { data });
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Create letter request failed');
    }

    return { row: result.row || 0 };
  } catch (error) {
    console.error('Error submitting letter request:', error);
    throw error;
  }
}
