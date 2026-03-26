export interface EventItem {
  id: string;
  sheetRow?: number;     // Row number in Google Sheets (for CRUD sync)
  rowIndex: number;
  tanggal: string;       // "12 Juni 2025"
  dateStr: string;       // "2025-06-12" ISO
  day: string;           // "Kamis"
  jam: string;           // "10:00 - 12:00"
  acara: string;         // Event name
  lokasi: string;        // Location
  eo: string;            // Event Organizer
  keterangan: string;    // Description/Notes
  month: string;         // "Juni"
  status: 'upcoming' | 'ongoing' | 'past';
}

export interface AnnualTheme {
  id: string;
  name: string;
  dateStart: string;
  dateEnd: string;
  color: string;
}

export type FilterType = 'Semua' | string;
export type ViewMode = 'table' | 'calendar';
