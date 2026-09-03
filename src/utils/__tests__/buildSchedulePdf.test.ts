import { describe, expect, it } from 'vitest';
import type { EventItem } from '../../types';
import { buildSchedulePdf } from '../../components/pdf/buildSchedulePdf';
import { renderEventsSchedulePdfBlob } from '../eventsSchedulePdf';

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

const FIXTURE = [
  ev({ id: '1', status: 'ongoing', acara: 'Grand Sale' }),
  ev({ id: '2', status: 'upcoming', acara: 'Komunitas Mingguan', eo: '' }),
  ev({ id: '3', status: 'past', acara: 'Live Music', lokasi: 'Rooftop' }),
];

describe('buildSchedulePdf', () => {
  it('menghasilkan PDF valid dengan header %PDF', async () => {
    const blob = await renderEventsSchedulePdfBlob(FIXTURE);
    expect(blob.size).toBeGreaterThan(1024);
    const head = await blob.slice(0, 4).text();
    expect(head).toBe('%PDF');
  });

  it('memetakan seluruh event ke tabel (lastAutoTable body)', () => {
    const doc = buildSchedulePdf({ events: FIXTURE, generatedAt: '3 September 2026' });
    const table = doc.lastAutoTable;
    expect(table.body).toHaveLength(3);
  });

  it('kosong → tidak ada tabel, tetap PDF valid', async () => {
    const doc = buildSchedulePdf({ events: [], generatedAt: 'x' });
    const head = (await doc.output('blob')).slice(0, 4);
    expect(await head.text()).toBe('%PDF');
    expect(doc.lastAutoTable).toBeUndefined();
  });
});
