import { describe, expect, it } from 'vitest';
import type { EventItem } from '../../types';

/** T-003: non-canEditEvents surfaces never include Event status draft */
function filterPublicEvents(events: Array<Pick<EventItem, 'id' | 'status'>>, canSeeInternal: boolean) {
  return events.filter(e => canSeeInternal || e.status !== 'draft');
}

describe('public Event visibility (T-003)', () => {
  const rows = [
    { id: '1', status: 'upcoming' as const },
    { id: '2', status: 'draft' as const },
    { id: '3', status: 'past' as const },
  ];

  it('hides draft for public / viewer', () => {
    expect(filterPublicEvents(rows, false).map(e => e.id)).toEqual(['1', '3']);
  });

  it('keeps draft for admin internal schedule', () => {
    expect(filterPublicEvents(rows, true).map(e => e.id)).toEqual(['1', '2', '3']);
  });
});
