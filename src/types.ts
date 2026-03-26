export type EventStatus = 'draft' | 'upcoming' | 'ongoing' | 'past';

export type ViewMode = 'table' | 'calendar' | 'kanban' | 'timeline';
export type Theme = 'light' | 'dark';

export interface EventItem {
  id: string;
  sheetRow?: number;
  rowIndex: number;
  tanggal: string;   // "12 Juni 2025"
  dateStr: string;   // "2025-06-12"
  day: string;       // "Kamis"
  jam: string;       // "10:00 - 12:00"
  acara: string;
  lokasi: string;
  eo: string;
  keterangan: string;
  month: string;     // "Juni"
  status: EventStatus;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AnnualTheme {
  id: string;
  name: string;
  dateStart: string;
  dateEnd: string;
  color: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}
