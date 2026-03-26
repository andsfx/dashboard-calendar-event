import { EventItem, AnnualTheme } from '../types';

// URL dari Google Apps Script deployment (masukkan ke .env)
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

interface ApiResponse {
  success: boolean;
  error?: string;
  row?: number;
}

class SheetsApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetsApiError';
  }
}

export async function fetchEvents(): Promise<{ events: EventItem[]; themes: AnnualTheme[] }> {
  if (!APPS_SCRIPT_URL) {
    console.warn('VITE_APPS_SCRIPT_URL tidak dikonfigurasi. Menggunakan data lokal.');
    throw new SheetsApiError('Apps Script URL tidak dikonfigurasi');
  }

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=read`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new SheetsApiError(`HTTP error! status: ${response.status}`);
    }

    const result: SheetsApiResponse = await response.json();

    if (!result.success || !result.data) {
      throw new SheetsApiError(result.error || 'Unknown error');
    }

    // Transform Sheets events ke EventItem format
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
      status: 'upcoming' as const, // Akan dihitung ulang
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
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        data: eventData,
      }),
    });

    if (!response.ok) {
      throw new SheetsApiError(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse = await response.json();

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
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update',
        data: eventData,
      }),
    });

    if (!response.ok) {
      throw new SheetsApiError(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse = await response.json();

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
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        sheetRow: sheetRow,
      }),
    });

    if (!response.ok) {
      throw new SheetsApiError(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse = await response.json();

    if (!result.success) {
      throw new SheetsApiError(result.error || 'Delete failed');
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}
