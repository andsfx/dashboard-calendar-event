// ==========================================
// DEPRECATED: Data now comes from Google Sheets API
// Keep recalculateStatuses for local cache updates
// ==========================================
import { EventItem } from '../types';
import { getStatus } from '../utils/eventDateTime';

export function recalculateStatuses(events: EventItem[]): EventItem[] {
  return events.map(e => ({
    ...e,
    status: getStatus(e.dateStr, e.jam),
  }));
}

// Empty array untuk initial state sebelum fetch dari Sheets
export const mockEvents: EventItem[] = [];

// Default themes (akan di-overwrite dari Sheets)
export const annualThemes: import('../types').AnnualTheme[] = [];
