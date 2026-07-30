import { describe, expect, it } from 'vitest';
import type { ViewMode } from '../../types';

const VIEW_TABS: Array<{ key: ViewMode }> = [
  { key: 'table' },
  { key: 'calendar' },
  { key: 'kanban' },
  { key: 'timeline' },
];

/** Mirrors App.tsx availableViewTabs gate (canEditEvents only). */
function availableViewTabs(canEditEvents: boolean): ViewMode[] {
  return (canEditEvents
    ? VIEW_TABS
    : VIEW_TABS.filter(tab => tab.key !== 'calendar' && tab.key !== 'kanban')
  ).map(t => t.key);
}

describe('dashboard view tabs by canEditEvents', () => {
  it('admin/superadmin get calendar + kanban', () => {
    expect(availableViewTabs(true)).toEqual(['table', 'calendar', 'kanban', 'timeline']);
  });

  it('viewer / eo / TR without edit: table + timeline only', () => {
    expect(availableViewTabs(false)).toEqual(['table', 'timeline']);
  });
});
