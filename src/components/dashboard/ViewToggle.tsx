import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '../shadcn/tabs';
import type { ViewMode } from '../../types';

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
 * Segmented table/calendar/kanban/timeline toggle — shadcn Tabs (Radix).
 *
 * Roving tabindex + navigasi panah kini datang dari Radix `Tabs` (pola APG
 * tabs). `aria-labelledby` pada tabpanel (`DashboardViewsSection`) tetap
 * bekerja karena setiap `TabsTrigger` diberi id `dashboard-tab-<key>`.
 *
 * `aria-controls`: Radix menulis `aria-controls="<baseId>-content-<value>"`
 * yang menunjuk ke id `TabsContent` Radix — panel nyata di sini adalah
 * `<section id="dashboard-panel-<key>">` milik `DashboardViewsSection`, jadi
 * idref default tersebut selalu DANGLING dan axe `aria-valid-attr-value`
 * menandainya (WCAG 4.1.2) — tidak boleh di-ship. Di dist react-tabs,
 * `"aria-controls": contentId` ditulis SEBELUM `...triggerProps`, sehingga
 * memberi `aria-controls={undefined}` pada setiap `TabsTrigger` membuat
 * spread menimpanya dengan `undefined` dan React menghapus atribut
 * sepenuhnya — kembali ke semantik pra-refactor (MdTabs), saat tidak ada
 * `aria-controls` yang menunjuk ke panel yang di-swap-out. Koneksi
 * tab→panel tetap tersirat bagi screen reader lewat `role="tablist"` /
 * `role="tab"` + back-reference `aria-labelledby` panel ke
 * `dashboard-tab-<key>`.
 */
export function ViewToggle({ tabs, viewMode, onSelect, className = '' }: ViewToggleProps) {
  return (
    <Tabs
      value={viewMode}
      onValueChange={v => onSelect(v as ViewMode)}
      className={`max-w-full ${className}`}
    >
      <TabsList aria-label="Pilih tampilan jadwal" className="max-w-full">
        {tabs.map(tab => (
          <TabsTrigger key={tab.key} value={tab.key} id={`dashboard-tab-${tab.key}`} aria-controls={undefined}>
            {tab.icon}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
