import type { KeyboardEvent, ReactNode } from 'react';
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
  /** id of the tabpanel the tabs control (aria-controls). */
  panelId: string;
  className?: string;
}

/** Segmented table/calendar/kanban/timeline toggle — mirrors the HTML prototype `.view-toggle`. */
export function ViewToggle({ tabs, viewMode, onSelect, panelId, className = '' }: ViewToggleProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const lastIndex = tabs.length - 1;
    let nextIndex = index;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;

    const nextTab = tabs[nextIndex];
    if (!nextTab) return;

    onSelect(nextTab.key);
    requestAnimationFrame(() => document.getElementById(`dashboard-tab-${nextTab.key}`)?.focus());
  };

  return (
    <div
      role="tablist"
      aria-label="Pilih tampilan jadwal"
      className={`inline-flex flex-wrap gap-0.5 rounded-[0.85rem] border border-[var(--border-subtle)] bg-[var(--brand-card)] p-1 dark:border-slate-700 dark:bg-slate-800/60 ${className}`}
    >
      {tabs.map(tab => {
        const active = viewMode === tab.key;
        return (
          <button
            key={tab.key}
            id={`dashboard-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(tab.key)}
            onKeyDown={event => handleKeyDown(event, tabs.findIndex(item => item.key === tab.key))}
            className={`ui-focus-ring inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              active
                ? 'bg-[var(--brand-card-light)] text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-slate-700 dark:text-slate-100 dark:shadow-none'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}