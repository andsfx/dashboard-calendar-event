import { EventItem, AnnualTheme, DraftEventItem } from '../types';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

interface SheetsEvent {
  sheetRow: number;
  tanggal: string;
  dateStr: string;
  day: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  keterangan: string;
  month: string;
}

interface SheetsApiResponse {
  success: boolean;
  data?: {
    events: SheetsEvent[];
    themes: AnnualTheme[];
  };
  error?: string;
}

interface DraftSheetsApiResponse {
  success: boolean;
  data?: Array<{
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
    month: string;
    progress: 'draft' | 'confirm' | 'cancel';
    published: boolean;
    publishedAt?: string;
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
  if (/seminar|talkshow|talk\s?show|diskusi|symposium/.test(name))   return 'Seminar';
  if (/pameran|expo|exhibition|display/.test(name))                  return 'Pameran';
  if (/konser|concert|musik|music|band|penyanyi/.test(name))         return 'Konser';
  if (/sosial|bakti|donor|charity|peduli|amal/.test(name))           return 'Sosial';
  if (/seni|art|crafts|kerajinan|lukis|drawing/.test(name))          return 'Seni';
  if (/hiburan|entertainment|fun|carnival|party/.test(name))         return 'Hiburan';
  if (/karir|career|job|rekrut|hiring|beasiswa/.test(name))          return 'Karir';
  if (/produk|product|launch|launching|promo|brand/.test(name))      return 'Produk';
  if (/kids|anak|children|baby|balita|pinguin/.test(name))           return 'Anak';
  if (/food|kuliner|culinary|makanan|minuman|cafe|resto/.test(name)) return 'Kuliner';
  if (/sport|olahraga|fitness|yoga|senam|futsal|run/.test(name))     return 'Olahraga';
  if (/game|gaming|esport|tekno|tech/.test(name))                    return 'Teknologi';
  if (/health|kesehatan|medis|dokter|farmasi/.test(name))            return 'Kesehatan';
  return 'Umum';
}

export async function fetchEvents(): Promise<{ events: EventItem[]; themes: AnnualTheme[] }> {
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

    const events: EventItem[] = result.data.events.map((e, index) => ({
      id: `evt-${e.sheetRow}`,
      sheetRow: e.sheetRow,
      rowIndex: index + 2,
      tanggal: e.tanggal,
      dateStr: e.dateStr,
      day: e.day,
      jam: e.jam,
      acara: e.acara,
      lokasi: e.lokasi,
      eo: e.eo,
      keterangan: e.keterangan,
      month: e.month,
      status: 'upcoming' as const, // Will be recalculated
      category: detectCategory(e.acara),
      priority: 'medium'            // Default for now
    }));

    return { events, themes: result.data.themes };
  } catch (error) {
    console.error('Error fetching from Sheets:', error);
    throw error;
  }
}

export async function createEvent(eventData: Omit<EventItem, 'id' | 'sheetRow' | 'rowIndex' | 'status'>): Promise<number> {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  try {
    const params = new URLSearchParams({
      action: 'create',
      data: JSON.stringify(eventData),
    });
    const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const result = await response.json();
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Create failed');
    }
    return result.row || 0;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

export async function updateEvent(eventData: Partial<EventItem> & { sheetRow: number }): Promise<void> {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  try {
    const params = new URLSearchParams({
      action: 'update',
      data: JSON.stringify(eventData),
    });
    const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const result = await response.json();
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Update failed');
    }
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

export async function deleteEvent(sheetRow: number): Promise<void> {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  try {
    const params = new URLSearchParams({
      action: 'delete',
      sheetRow: String(sheetRow),
    });
    const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const result = await response.json();
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Delete failed');
    }
  } catch (error) {
    console.error('Error deleting event:', error);
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
      id: `draft-${draft.sheetRow}`,
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
      month: draft.month,
      progress: draft.progress,
      published: !!draft.published,
      publishedAt: draft.publishedAt || '',
    }));
  } catch (error) {
    console.error('Error fetching draft events:', error);
    throw error;
  }
}

export async function createDraftEvent(draftData: Omit<DraftEventItem, 'id' | 'sheetRow' | 'rowIndex' | 'published' | 'publishedAt'>): Promise<number> {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  try {
    const params = new URLSearchParams({
      action: 'createDraft',
      data: JSON.stringify(draftData),
    });
    const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const result = await response.json();
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Create draft failed');
    }
    return result.row || 0;
  } catch (error) {
    console.error('Error creating draft event:', error);
    throw error;
  }
}

export async function updateDraftEvent(draftData: Partial<DraftEventItem> & { sheetRow: number }): Promise<void> {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  try {
    const params = new URLSearchParams({
      action: 'updateDraft',
      data: JSON.stringify(draftData),
    });
    const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const result = await response.json();
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Update draft failed');
    }
  } catch (error) {
    console.error('Error updating draft event:', error);
    throw error;
  }
}

export async function deleteDraftEvent(sheetRow: number): Promise<void> {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  try {
    const params = new URLSearchParams({
      action: 'deleteDraft',
      sheetRow: String(sheetRow),
    });
    const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const result = await response.json();
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Delete draft failed');
    }
  } catch (error) {
    console.error('Error deleting draft event:', error);
    throw error;
  }
}

export async function publishDraftEvent(sheetRow: number): Promise<void> {
  if (!APPS_SCRIPT_URL) {
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  try {
    const params = new URLSearchParams({
      action: 'publishDraft',
      sheetRow: String(sheetRow),
    });
    const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const result = await response.json();
    if (!result.success) {
      throw new SheetsApiError(result.error || 'Publish draft failed');
    }
  } catch (error) {
    console.error('Error publishing draft event:', error);
    throw error;
  }
}
