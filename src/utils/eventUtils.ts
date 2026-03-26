import { EventItem, EventStatus } from '../types';

export const STATUS_ORDER: Record<EventStatus, number> = {
  ongoing: 0,
  upcoming: 1,
  past: 2,
};

export const STATUS_LABEL: Record<EventStatus, string> = {
  ongoing: 'Berlangsung',
  upcoming: 'Mendatang',
  past: 'Selesai',
};

export const STATUS_COLOR: Record<EventStatus, string> = {
  ongoing: 'emerald',
  upcoming: 'amber',
  past: 'slate',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Bazaar:    '#8b5cf6',
  Festival:  '#f59e0b',
  Workshop:  '#06b6d4',
  Kompetisi: '#f43f5e',
  Fashion:   '#ec4899',
  Seminar:   '#3b82f6',
  Pameran:   '#10b981',
  Konser:    '#a855f7',
  Sosial:    '#14b8a6',
  Seni:      '#f97316',
  Hiburan:   '#6366f1',
  Karir:     '#84cc16',
  Produk:    '#ef4444',
};

export function sortEvents(events: EventItem[]): EventItem[] {
  return [...events].sort((a, b) => {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    if (a.status === 'past') return b.dateStr.localeCompare(a.dateStr);
    return a.dateStr.localeCompare(b.dateStr);
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
    ongoing: events.filter(e => e.status === 'ongoing'),
    upcoming: events.filter(e => e.status === 'upcoming'),
    past: events.filter(e => e.status === 'past'),
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

export function getStatus(dateStr: string, jam: string): EventStatus {
  const now = new Date();
  const eventDate = new Date(dateStr);
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

  if (target > today) return 'upcoming';
  if (target < today) return 'past';

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
    }
  } catch (e) {
    console.error('Error parsing time for status:', e);
  }

  return 'ongoing';
}

export function recalculateStatuses(events: EventItem[]): EventItem[] {
  return events.map(e => ({
    ...e,
    status: getStatus(e.dateStr, e.jam),
  }));
}
