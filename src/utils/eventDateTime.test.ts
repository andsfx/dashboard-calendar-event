import { describe, expect, it } from 'vitest';
import { getStatus, getTodayIsoLocal, parseIsoDateLocal, parseTimeRange } from './eventDateTime';

describe('eventDateTime utilities', () => {
  it('parses valid ISO date in local timezone', () => {
    const parsed = parseIsoDateLocal('2026-03-24');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(2);
    expect(parsed?.getDate()).toBe(24);
  });

  it('returns null for invalid ISO date format', () => {
    expect(parseIsoDateLocal('24-03-2026')).toBeNull();
    expect(parseIsoDateLocal('')).toBeNull();
  });

  it('parses time range with dot and colon separators', () => {
    expect(parseTimeRange('10.00 - 14.30')).toEqual({
      startHour: 10,
      startMin: 0,
      endHour: 14,
      endMin: 30,
    });
    expect(parseTimeRange('09:15 - 10:45')).toEqual({
      startHour: 9,
      startMin: 15,
      endHour: 10,
      endMin: 45,
    });
  });

  it('returns null for invalid time range', () => {
    expect(parseTimeRange('10 - 14')).toBeNull();
    expect(parseTimeRange('abc')).toBeNull();
  });

  it('computes status upcoming and past correctly by date', () => {
    const now = new Date(2026, 2, 24, 10, 0, 0); // 24 Mar 2026 local
    expect(getStatus('2026-03-25', '', now)).toBe('upcoming');
    expect(getStatus('2026-03-23', '', now)).toBe('past');
  });

  it('computes same-day status using end time', () => {
    const nowBeforeEnd = new Date(2026, 2, 24, 13, 0, 0);
    const nowAfterEnd = new Date(2026, 2, 24, 15, 1, 0);
    expect(getStatus('2026-03-24', '10:00 - 15:00', nowBeforeEnd)).toBe('ongoing');
    expect(getStatus('2026-03-24', '10:00 - 15:00', nowAfterEnd)).toBe('past');
  });

  it('returns ongoing for same-day events with empty or unparseable time', () => {
    const now = new Date(2026, 2, 24, 9, 0, 0);
    expect(getStatus('2026-03-24', '', now)).toBe('ongoing');
    expect(getStatus('2026-03-24', 'jam bebas', now)).toBe('ongoing');
  });

  it('formats today local ISO', () => {
    const date = new Date(2026, 0, 8, 12, 30, 0);
    expect(getTodayIsoLocal(date)).toBe('2026-01-08');
  });
});
