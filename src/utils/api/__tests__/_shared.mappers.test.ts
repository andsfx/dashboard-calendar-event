/**
 * Test dbEventToEventItem — kontrak read mapper events.
 *
 * Kontrak yang dijaga:
 * - is_recurring=true di DB → isRecurring=true di klien (badge "Reguler" tampil).
 *   Sebelumnya field ini TIDAK dipetakan → badge tidak pernah muncul dari data live.
 * - recurrence_group_id ikut terbawa untuk filter series (getRecurringSeries, deleteRecurringSeries).
 * - Default aman: is_recurring=false/null → isRecurring=false (bukan undefined).
 */
import { describe, it, expect } from 'vitest';
import { dbEventToEventItem, type DbEvent } from '../_shared';

function makeDbRow(partial: Partial<DbEvent> = {}): DbEvent {
  return {
    id: 'evt_1',
    date_str: '2026-09-10',
    date_end: null,
    day: 'Kamis',
    tanggal: '10 September 2026',
    jam: '10:00 - 21:00',
    acara: 'Festival Minang 2026',
    lokasi: 'Atrium Utama',
    eo: 'Komunitas Minang',
    pic: '',
    phone: '',
    keterangan: '',
    month: 'September',
    status: null,
    category: 'Festival',
    categories: ['Festival'],
    priority: 'medium',
    event_model: '',
    event_nominal: '',
    event_model_notes: '',
    source_draft_id: '',
    is_multi_day: false,
    day_time_slots: null,
    event_type: 'recurring',
    recurrence_group_id: 'grp_abc123',
    is_recurring: true,
    poster_url: null,
    organization_id: null,
    area_id: null,
    ...partial,
  } as DbEvent;
}

describe('dbEventToEventItem — isRecurring/recurrenceGroupId', () => {
  it('is_recurring=true → isRecurring=true (badge Reguler hidup)', () => {
    const ev = dbEventToEventItem(makeDbRow(), 0);
    expect(ev.isRecurring).toBe(true);
  });

  it('recurrence_group_id terbawa untuk filter series', () => {
    const ev = dbEventToEventItem(makeDbRow(), 0);
    expect(ev.recurrenceGroupId).toBe('grp_abc123');
  });

  it('is_recurring=false → isRecurring=false (default aman, bukan undefined)', () => {
    const ev = dbEventToEventItem(makeDbRow({ is_recurring: false }), 0);
    expect(ev.isRecurring).toBe(false);
  });

  it('is_recurring=null (kolom lama) → isRecurring=false', () => {
    const ev = dbEventToEventItem(makeDbRow({ is_recurring: null as unknown as boolean }), 0);
    expect(ev.isRecurring).toBe(false);
  });

  it('recurrence_group_id kosong → ""', () => {
    const ev = dbEventToEventItem(makeDbRow({ recurrence_group_id: '' }), 0);
    expect(ev.recurrenceGroupId).toBe('');
  });
});
