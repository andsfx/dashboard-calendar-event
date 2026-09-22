import type { ReactNode } from 'react';
import { List, Kanban, Clock4, CalendarDays } from 'lucide-react';
import type { ViewMode } from '../../types';

const VIEW_TABS: Array<{ key: ViewMode; label: string; icon: ReactNode }> = [
  { key: 'table',    label: 'Tabel',    icon: <List         className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  { key: 'calendar', label: 'Kalender', icon: <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  { key: 'kanban',   label: 'Kanban',   icon: <Kanban       className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  { key: 'timeline', label: 'Timeline', icon: <Clock4       className="h-3.5 w-3.5" strokeWidth={1.5} /> },
];

/** Gate calendar + kanban tabs to editors — mirrors the HTML prototype view-toggle roles. */
export function getAvailableViewTabs(canEditEvents: boolean): Array<{ key: ViewMode; label: string; icon: ReactNode }> {
  return canEditEvents
    ? VIEW_TABS
    : VIEW_TABS.filter(tab => tab.key !== 'calendar' && tab.key !== 'kanban');
}
