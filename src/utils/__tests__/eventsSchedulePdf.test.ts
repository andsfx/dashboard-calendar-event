import { describe, expect, it } from 'vitest';
import type { EventItem } from '../../types';
import { filterScheduleEventsForPdf } from '../eventsSchedulePdf';

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'status' | 'acara'>): EventItem {
  return {
    rowIndex: 0,
    tanggal: '1 Januari 2026',
    dateStr: '2026-01-01',
    day: 'Kamis',
    jam: '10:00 - 12:00',
    lokasi: 'Atrium',
    eo: 'EO',
    pic: '',
    phone: '',
    keterangan: '',
    month: 'Januari',
    category: 'Umum',
    categories: ['Umum'],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    ...partial,
  };
}

describe('filterScheduleEventsForPdf', () => {
  it('drops draft events', () => {
    const list = [
      ev({ id: '1', status: 'upcoming', acara: 'A' }),
      ev({ id: '2', status: 'draft', acara: 'B' }),
      ev({ id: '3', status: 'ongoing', acara: 'C' }),
    ];
    const out = filterScheduleEventsForPdf(list);
    expect(out.map(e => e.id)).toEqual(['1', '3']);
  });
});
