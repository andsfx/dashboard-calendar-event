import { describe, it, expect } from 'vitest';
import { pickFields, pickFieldsMany, EVENT_FIELDS } from '../pickFields.js';

describe('pickFields', () => {
  it('keeps only allowed keys', () => {
    const row = pickFields(
      { acara: 'Fest', status: 'upcoming', is_admin: true, role: 'superadmin' },
      EVENT_FIELDS
    );
    expect(row).toEqual({ acara: 'Fest', status: 'upcoming' });
    expect(row.is_admin).toBeUndefined();
    expect(row.role).toBeUndefined();
  });

  it('drops undefined values', () => {
    const row = pickFields({ acara: 'A', status: undefined }, EVENT_FIELDS);
    expect(row).toEqual({ acara: 'A' });
  });

  it('returns empty for non-objects', () => {
    expect(pickFields(null, EVENT_FIELDS)).toEqual({});
    expect(pickFields('x', EVENT_FIELDS)).toEqual({});
    expect(pickFields(['a'], EVENT_FIELDS)).toEqual({});
  });
});

describe('pickFieldsMany', () => {
  it('maps arrays', () => {
    const rows = pickFieldsMany(
      [{ acara: 'A', evil: 1 }, { acara: 'B', jam: '10:00' }],
      EVENT_FIELDS
    );
    expect(rows).toEqual([{ acara: 'A' }, { acara: 'B', jam: '10:00' }]);
  });
});
