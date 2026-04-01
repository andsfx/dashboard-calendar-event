export type EventStatus = 'draft' | 'upcoming' | 'ongoing' | 'past';
export type EventModel = '' | 'free' | 'bayar' | 'support';
export type DraftProgress = 'draft' | 'confirm' | 'cancel';
export type HolidayType = 'libur_nasional' | 'cuti_bersama';

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
  pic: string;
  phone: string;
  keterangan: string;
  month: string;     // "Juni"
  status: EventStatus;
  category: string;
  categories: string[];
  priority: 'high' | 'medium' | 'low';
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
}

export interface DraftEventItem {
  id: string;
  sheetRow?: number;
  rowIndex: number;
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
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
  progress: DraftProgress;
  published: boolean;
  publishedAt?: string;
  deleted: boolean;
  deletedAt?: string;
}

export interface AnnualTheme {
  id: string;
  sheetRow?: number;
  name: string;
  dateStart: string;
  dateEnd: string;
  color: string;
}

export interface HolidayItem {
  id: string;
  sheetRow?: number;
  tanggal: string;
  dateStr: string;
  day: string;
  month: string;
  name: string;
  type: HolidayType;
  description: string;
}

export interface LetterRequestItem {
  tanggalSurat: string;
  nomorSurat: string;
  namaEO: string;
  penanggungJawab: string;
  alamatEO: string;
  namaEvent: string;
  lokasi: string;
  hariTanggalPelaksanaan: string;
  waktuPelaksanaan: string;
  nomorTelepon: string;
  hariTanggalLoading: string;
  waktuLoading: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}
