import { describe, it, expect } from 'vitest';
import {
  computeAreaUsage,
  computeAreaUtilisation,
  computeCategoryCounts,
  computeEventGaps,
  computeMonthlyCounts,
} from '../dashboardOverview';
import type { EventArea, EventItem } from '../../types';

/** Event minimal — hanya field yang dibaca helper. */
function event(overrides: Partial<EventItem>): EventItem {
  return {
    id: 'e1',
    rowIndex: 0,
    tanggal: '',
    status: 'upcoming',
    dateStr: '2026-03-10',
    day: 'Selasa',
    jam: '',
    acara: 'Acara',
    lokasi: '',
    eo: '',
    pic: 'PIC',
    phone: '',
    keterangan: '',
    month: 'Maret',
    category: 'Umum',
    categories: [],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    posterUrl: 'https://cdn/poster.jpg',
    ...overrides,
  } as EventItem;
}

function area(overrides: Partial<EventArea>): EventArea {
  return {
    id: 'a1',
    name: 'Atrium',
    description: '',
    coverPhotoUrl: '',
    sortOrder: 0,
    isActive: true,
    ...overrides,
  };
}

describe('computeEventGaps', () => {
  it('menghitung event tanpa poster dan tanpa PIC', () => {
    const gaps = computeEventGaps([
      event({ posterUrl: '', pic: '' }),
      event({ posterUrl: 'x', pic: 'Budi' }),
      event({ posterUrl: '  ', pic: '' }),
    ]);
    expect(gaps).toEqual({ missingPoster: 2, missingPic: 2 });
  });
});

describe('computeCategoryCounts', () => {
  it('menghitung multi-kategori di tiap kategorinya dan mengurut menurun', () => {
    const rows = computeCategoryCounts([
      event({ categories: ['Bazaar', 'Festival'] }),
      event({ categories: ['Bazaar'] }),
      event({ category: 'Festival', categories: [] }),
    ]);
    expect(rows[0]).toEqual({ label: 'Bazaar', value: 2 });
    expect(rows.find(r => r.label === 'Festival')?.value).toBe(2);
  });

  it('memakai kategori tunggal bila categories kosong dan melewati nama kosong', () => {
    const rows = computeCategoryCounts([event({ category: 'Seminar', categories: [] }), event({ category: '', categories: [] })]);
    expect(rows).toEqual([{ label: 'Seminar', value: 1 }]);
  });
});

describe('computeMonthlyCounts', () => {
  it('selalu 12 batang dan hanya menghitung tahun yang diminta', () => {
    const rows = computeMonthlyCounts(
      [
        event({ dateStr: '2026-03-10' }),
        event({ dateStr: '2026-03-20' }),
        event({ dateStr: '2025-03-01' }),
        event({ dateStr: 'not-a-date' }),
      ],
      2026,
    );
    expect(rows).toHaveLength(12);
    expect(rows[2]).toEqual({ label: 'Mar', value: 2 });
    expect(rows[0]).toEqual({ label: 'Jan', value: 0 });
  });
});

describe('computeAreaUsage', () => {
  it('mengelompokkan lewat areaId dan memakai nama master area', () => {
    const rows = computeAreaUsage(
      [
        event({ areaId: 'a1', lokasi: 'atrium lt 1' }),
        event({ areaId: 'a1', lokasi: 'ATRIUM' }),
        event({ areaId: null, lokasi: 'Lobby' }),
      ],
      [area({ id: 'a1', name: 'Atrium' })],
    );
    expect(rows[0]).toEqual({ id: 'id:a1', name: 'Atrium', totalEvents: 2, inUseNow: false });
    expect(rows[1]).toEqual({ id: 'loc:Lobby', name: 'Lobby', totalEvents: 1, inUseNow: false });
  });

  it('menandai area dipakai sekarang bila ada event ongoing', () => {
    const rows = computeAreaUsage([event({ areaId: 'a1', status: 'ongoing' })], [area({ id: 'a1', name: 'Atrium' })]);
    expect(rows[0]?.inUseNow).toBe(true);
  });

  it('melewati event tanpa areaId maupun lokasi', () => {
    const rows = computeAreaUsage([event({ areaId: null, lokasi: '   ' })], []);
    expect(rows).toEqual([]);
  });
});

describe('computeAreaUtilisation', () => {
  it('hitung area aktif yang dipakai event berjalan', () => {
    const result = computeAreaUtilisation(
      [event({ areaId: 'a1', status: 'ongoing' }), event({ areaId: 'a2', status: 'upcoming' })],
      [area({ id: 'a1' }), area({ id: 'a2' }), area({ id: 'a3', isActive: false })],
    );
    expect(result).toEqual({ inUseNow: 1, totalActive: 2 });
  });
});
