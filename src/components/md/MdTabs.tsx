import * as React from 'react';

import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';

import { mdCreate, useMdEvent, useMdRef, type MdHost } from './md-internals';

export interface MdTabItem {
  key: string;
  label: string;
  /** node lucide, dirender ke slot "icon" */
  icon?: React.ReactNode;
  /** kelas warna Tailwind untuk titik status, dirender ke slot "icon" */
  dot?: string;
}

export interface MdTabsProps {
  items: MdTabItem[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  /** awalan id untuk host `md-primary-tab` — dipakai `aria-labelledby` tabpanel */
  idPrefix?: string;
  className?: string;
}

/** Set `active` pada tab yang cocok; md-tabs menurunkan state turunannya. */
function Tab({ item, active, id }: { item: MdTabItem; active: boolean; id?: string }): React.ReactElement {
  const bindActive = React.useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      (el as MdHost).active = active;
    },
    [active],
  );
  const marker = item.icon ?? (item.dot ? <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} aria-hidden="true" /> : null);
  return mdCreate(
    'md-primary-tab',
    // `role`/`aria-selected` ditulis eksplisit sebagai atribut.
    // md menaruh peran ini di `ElementInternals.role`/`.ariaSelected`, yang
    // benar bagi screen reader (terbukti di AX tree Chromium) TETAPI tidak
    // terbaca oleh alat otomasi berbasis DOM — Playwright `getByRole` dan
    // axe mengabaikannya. Menuliskan atributnya menyamakan keduanya tanpa
    // mengubah semantik: nilainya identik dengan yang dipasang md.
    { ref: bindActive, id, role: 'tab', 'aria-selected': active ? 'true' : 'false' },
    marker != null ? mdCreate('span', { slot: 'icon' }, marker) : null,
    item.label,
  );
}

export function MdTabs({ items, value, onChange, ariaLabel, idPrefix, className }: MdTabsProps): React.ReactElement {
  const ref = useMdRef<MdHost>();

  // Sinkronkan tab aktif setiap render: md-tabs mengelola `activeTabIndex`
  // sendiri setelah interaksi, dan itu bisa menyimpang dari prop `value`.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const index = items.findIndex((item) => item.key === value);
    if (index >= 0 && el.activeTabIndex !== index) el.activeTabIndex = index;
  });

  const handleChange = React.useCallback(
    (event: Event) => {
      const host = event.currentTarget as MdHost | null;
      const index = typeof host?.activeTabIndex === 'number' ? host.activeTabIndex : -1;
      const item = items[index];
      if (item) onChange(item.key);
    },
    [items, onChange],
  );
  useMdEvent(ref, 'change', handleChange);

  return mdCreate(
    'md-tabs',
    // lihat catatan `role` di `Tab` — md memakai `ElementInternals.role`.
    { ref, class: className, role: 'tablist', 'aria-label': ariaLabel },
    items.map((item) => React.createElement(Tab, { key: item.key, item, active: item.key === value, id: idPrefix ? `${idPrefix}${item.key}` : undefined })),
  );
}
