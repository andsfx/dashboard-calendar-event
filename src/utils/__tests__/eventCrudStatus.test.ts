import { describe, expect, it, vi, afterEach } from 'vitest';
import { getStatus } from '../eventUtils';

/** Mirrors EventCrudModal submit status choice (P1 audit fix). */
function formSubmitStatus(opts: {
  dateStr: string;
  jam: string;
  dateEnd?: string;
  dayTimeSlots?: Array<{ date: string; jam: string }>;
  editingStatus?: 'draft' | 'upcoming' | 'ongoing' | 'past';
}) {
  if (opts.editingStatus === 'draft') return 'draft';
  return getStatus(opts.dateStr, opts.jam, opts.dateEnd, opts.dayTimeSlots);
}

describe('Event form status uses canonical getStatus', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('preserves internal draft flag on edit', () => {
    expect(formSubmitStatus({
      dateStr: '2030-01-01',
      jam: '10:00 - 12:00',
      editingStatus: 'draft',
    })).toBe('draft');
  });

  it('derives multi-day ongoing mid-range', () => {
    vi.setSystemTime(new Date('2026-05-03T12:00:00'));
    expect(formSubmitStatus({
      dateStr: '2026-05-02',
      jam: '10.00 - 17.00',
      dateEnd: '2026-05-04',
    })).toBe('ongoing');
  });

  it('derives same-day past after end jam', () => {
    vi.setSystemTime(new Date(2026, 2, 24, 16, 0, 0));
    expect(formSubmitStatus({
      dateStr: '2026-03-24',
      jam: '10:00 - 15:00',
    })).toBe('past');
  });
});
