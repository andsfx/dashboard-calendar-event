import { EventItem, EventStatus, DayTimeSlot } from '../types';

export const STATUS_ORDER: Record<EventStatus, number> = {
  draft:    0,
  ongoing:  1,
  upcoming: 2,
  past:     3,
};

export const STATUS_LABEL: Record<EventStatus, string> = {
  draft:    'Draft',
  ongoing:  'Berlangsung',
  upcoming: 'Mendatang',
  past:     'Selesai',
};

export const STATUS_COLOR: Record<EventStatus, string> = {
  draft:    'purple',
  ongoing:  'emerald',
  upcoming: 'amber',
  past:     'slate',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Bazaar:     '#8b5cf6',
  Festival:   '#f59e0b',
  Workshop:   '#06b6d4',
  Kompetisi:  '#f43f5e',
  Fashion:    '#ec4899',
  Seminar:    '#3b82f6',
  Pameran:    '#10b981',
  Konser:     '#a855f7',
  Sosial:     '#14b8a6',
  Seni:       '#f97316',
  Hiburan:    '#6366f1',
  Karir:      '#84cc16',
  Produk:     '#ef4444',
  Anak:       '#fb923c',
  Kuliner:    '#d97706',
  Olahraga:   '#22c55e',
  Teknologi:  '#0ea5e9',
  Kesehatan:  '#e11d48',
  Umum:       '#64748b',
};

export const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function sortEvents(events: EventItem[]): EventItem[] {
  return [...events].sort((a, b) => {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    if (a.status === 'past') return b.dateStr.localeCompare(a.dateStr);
    return a.dateStr.localeCompare(b.dateStr);
  });
}

function getTimeSortValue(jam: string) {
  const match = jam?.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function sortTableEvents(events: EventItem[]): EventItem[] {
  return [...events].sort((a, b) => {
    const aIsPast = a.status === 'past';
    const bIsPast = b.status === 'past';

    if (aIsPast !== bIsPast) {
      return aIsPast ? 1 : -1;
    }

    const dateCompare = aIsPast
      ? b.dateStr.localeCompare(a.dateStr)
      : a.dateStr.localeCompare(b.dateStr);
    if (dateCompare !== 0) return dateCompare;

    const timeCompare = getTimeSortValue(a.jam) - getTimeSortValue(b.jam);
    if (timeCompare !== 0) return timeCompare;

    return a.acara.localeCompare(b.acara);
  });
}

export function groupByDate(events: EventItem[]): Record<string, EventItem[]> {
  return events.reduce((acc, e) => {
    if (!acc[e.dateStr]) acc[e.dateStr] = [];
    acc[e.dateStr].push(e);
    return acc;
  }, {} as Record<string, EventItem[]>);
}

export function groupByStatus(events: EventItem[]): Record<EventStatus, EventItem[]> {
  return {
    draft:    events.filter(e => e.status === 'draft'),
    ongoing:  events.filter(e => e.status === 'ongoing'),
    upcoming: events.filter(e => e.status === 'upcoming'),
    past:     events.filter(e => e.status === 'past'),
  };
}

export function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, dateStr });
  }
  return days;
}

export function createId() {
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseDateStrLocal(dateStr: string) {
  if (!dateStr) return null;
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

// ===== MULTI-DAY EVENT HELPERS =====

export function isMultiDayEvent(event: EventItem): boolean {
  return !!(event.dateEnd && event.dateEnd !== event.dateStr);
}

export function getEventDuration(dateStr: string, dateEnd?: string): number {
  if (!dateEnd || dateEnd === dateStr) return 1;
  const start = parseDateStrLocal(dateStr);
  const end = parseDateStrLocal(dateEnd);
  if (!start || !end) return 1;
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function getDateRange(dateStr: string, dateEnd?: string): string[] {
  if (!dateEnd || dateEnd === dateStr) return [dateStr];
  const dates: string[] = [];
  const start = parseDateStrLocal(dateStr);
  const end = parseDateStrLocal(dateEnd);
  if (!start || !end) return [dateStr];
  
  let current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function formatDateRange(dateStr: string, dateEnd?: string): string {
  if (!dateEnd || dateEnd === dateStr) {
    // Single day
    const date = parseDateStrLocal(dateStr);
    if (!date) return dateStr;
    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }
  
  const start = parseDateStrLocal(dateStr);
  const end = parseDateStrLocal(dateEnd);
  if (!start || !end) return dateStr;
  
  const startDay = start.getDate();
  const startMonth = MONTH_NAMES[start.getMonth()];
  const startYear = start.getFullYear();
  
  const endDay = end.getDate();
  const endMonth = MONTH_NAMES[end.getMonth()];
  const endYear = end.getFullYear();
  
  // Sama bulan dan tahun
  if (start.getMonth() === end.getMonth() && startYear === endYear) {
    return `${startDay}-${endDay} ${startMonth} ${startYear}`;
  }
  
  // Beda bulan atau tahun
  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
}

export function getJamForDate(event: EventItem, dateStr: string): string {
  if (!event.dayTimeSlots || event.dayTimeSlots.length === 0) {
    return event.jam || '';
  }
  const slot = event.dayTimeSlots.find(s => s.date === dateStr);
  return slot?.jam || event.jam || '';
}

export function getMultiDayJamDisplay(event: EventItem): string {
  if (!isMultiDayEvent(event) || !event.dayTimeSlots || event.dayTimeSlots.length === 0) {
    return event.jam || '';
  }
  
  const duration = getEventDuration(event.dateStr, event.dateEnd);
  const firstJam = event.dayTimeSlots[0]?.jam || event.jam || '';
  const lastJam = event.dayTimeSlots[event.dayTimeSlots.length - 1]?.jam || event.jam || '';
  
  return `${firstJam} (hari 1) - ${lastJam} (hari ${duration})`;
}

export function getMultiDayEventsForDate(events: EventItem[], dateStr: string): EventItem[] {
  return events.filter(e => {
    if (!isMultiDayEvent(e)) return false;
    const range = getDateRange(e.dateStr, e.dateEnd);
    return range.includes(dateStr);
  });
}

export function getSingleDayEventsForDate(events: EventItem[], dateStr: string): EventItem[] {
  return events.filter(e => {
    if (isMultiDayEvent(e)) return false;
    return e.dateStr === dateStr;
  });
}

// ===== END MULTI-DAY EVENT HELPERS =====


export function getStatus(dateStr: string, jam: string, dateEnd?: string): EventStatus {
  if (!dateStr) return 'upcoming';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const startDate = parseDateStrLocal(dateStr);
  if (!startDate) return 'upcoming';
  
  // Multi-day event
  if (dateEnd && dateEnd !== dateStr) {
    const endDate = parseDateStrLocal(dateEnd);
    if (!endDate) return 'upcoming';
    
    const startTarget = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endTarget = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    if (today > endTarget) return 'past';
    if (today < startTarget) return 'upcoming';
    return 'ongoing'; // today is within range
  }
  
  // Single-day event
  const target = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  if (target > today) return 'upcoming';
  if (target < today) return 'past';

  // Same day - check time
  if (!jam) return 'ongoing';

  try {
    const timeMatch = jam.match(/(\d{1,2})[:.](\d{2})/);
    if (timeMatch) {
      const startHour = parseInt(timeMatch[1]);
      const startMin = parseInt(timeMatch[2]);
      const startTime = new Date(today);
      startTime.setHours(startHour, startMin, 0);
      
      const endMatch = jam.match(/[-–]\s*(\d{1,2})[:.](\d{2})/);
      if (endMatch) {
        const endHour = parseInt(endMatch[1]);
        const endMin = parseInt(endMatch[2]);
        const endTime = new Date(today);
        endTime.setHours(endHour, endMin, 0);
        
        if (now >= startTime && now <= endTime) return 'ongoing';
        if (now < startTime) return 'upcoming';
        return 'past';
      }
      
      if (now >= startTime) return 'ongoing';
      return 'upcoming';
    }
  } catch (e) {
    console.error('Error parsing time for status:', e);
  }

  return 'upcoming';
}

export function recalculateStatuses(events: EventItem[]): EventItem[] {
  return events.map(e => ({
    ...e,
    // Preserve 'draft' — only auto-calculate non-draft events
    status: e.status === 'draft' ? 'draft' : getStatus(e.dateStr, e.jam, e.dateEnd),
  }));
}
