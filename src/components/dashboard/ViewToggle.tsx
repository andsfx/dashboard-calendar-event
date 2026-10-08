import type { ReactNode } from 'react';
import type { ViewMode } from '../../types';
import { MdTabs, type MdTabItem } from '../md';

export interface ViewToggleTab {
  key: ViewMode;
  label: string;
  icon: ReactNode;
}

interface ViewToggleProps {
  tabs: ViewToggleTab[];
  viewMode: ViewMode;
  onSelect: (view: ViewMode) => void;
  className?: string;
}

/**
 * Segmented table/calendar/kanban/timeline toggle.
 *
 * Roving tabindex + navigasi panah sekarang datang dari `md-tabs` (pola APG
 * tabs), jadi handler keyboard manual dan prop `panelId` dihapus. `aria-labelledby`
 * pada tabpanel tetap bekerja karena setiap `md-primary-tab` diberi id
 * `dashboard-tab-<key>` lewat `idPrefix`.
 */
export function ViewToggle({ tabs, viewMode, onSelect, className = '' }: ViewToggleProps) {
  const items: MdTabItem[] = tabs.map(tab => ({ key: tab.key, label: tab.label, icon: tab.icon }));

  return (
    <MdTabs
      items={items}
      value={viewMode}
      onChange={key => onSelect(key as ViewMode)}
      ariaLabel="Pilih tampilan jadwal"
      idPrefix="dashboard-tab-"
      className={`max-w-full ${className}`}
    />
  );
}
