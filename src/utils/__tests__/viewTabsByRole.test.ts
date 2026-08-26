import { describe, expect, it } from 'vitest';
import { getAvailableViewTabs } from '../../components/dashboard/DashboardPage';

describe('dashboard view tabs by canEditEvents', () => {
  it('admin/superadmin get calendar + kanban', () => {
    expect(getAvailableViewTabs(true).map(t => t.key)).toEqual(['table', 'calendar', 'kanban', 'timeline']);
  });

  it('viewer / eo / TR without edit: table + timeline only', () => {
    expect(getAvailableViewTabs(false).map(t => t.key)).toEqual(['table', 'timeline']);
  });
});
