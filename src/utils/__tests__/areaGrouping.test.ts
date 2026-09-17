import { describe, it, expect } from 'vitest';
import { normalizeLokasi, suggestAreaId, groupEventsByArea, resolveAreaDisplay } from '../areaGrouping';
import type { EventArea } from '../../types';

function area(id: string, name: string, sortOrder = 0): EventArea {
  return { id, name, description: '', coverPhotoUrl: '', sortOrder, isActive: true };
}

/** Fixture minimal — cukup memenuhi GroupableEvent. */
function ev(id: string, areaId: string | null) {
  return { id, areaId };
}

const AREAS: EventArea[] = [
  area('era_1', 'Panggung Funworld Lt. 3', 0),
  area('era_2', 'Panggung Lt. Dasar', 1),
];

describe('normalizeLokasi', () => {
  it('menyamakan sinonim lt/lantai dan membuang tanda baca', () => {
    expect(normalizeLokasi('Panggung Lt. 3')).toBe(normalizeLokasi('Panggung Lt 3'));
    expect(normalizeLokasi('Panggung Lantai 3')).toBe(normalizeLokasi('Panggung Lt. 3'));
  });

  it('menyamakan varian penulisan Fun World', () => {
    expect(normalizeLokasi('Lt. 3 - Fun World')).toBe(normalizeLokasi('Lt. 3 FunWorld'));
  });
});

describe('suggestAreaId', () => {
  it('mengusulkan area yang sama untuk varian ejaan', () => {
    expect(suggestAreaId('Panggung Lt 3', AREAS)).toBe('era_1');
    expect(suggestAreaId('Panggung Lt. 3', AREAS)).toBe('era_1');
    expect(suggestAreaId('Panggung Lantai 3', AREAS)).toBe('era_1');
  });

  it('mengusulkan area yang sama untuk varian Funworld', () => {
    expect(suggestAreaId('Panggung Funworld Lt. 3', AREAS)).toBe('era_1');
    expect(suggestAreaId('Lt. 3 Depan Funworld, Metropolitan Mall Bekasi', AREAS)).toBe('era_1');
  });

  it('mengusulkan Panggung Lt. Dasar untuk lokasi lantai dasar', () => {
    expect(suggestAreaId('Panggung Lt. Dasar', AREAS)).toBe('era_2');
  });

  it('mengembalikan null bila tidak ada kandidat', () => {
    expect(suggestAreaId('XXI METMALL BEKASI', AREAS)).toBeNull();
    expect(suggestAreaId('', AREAS)).toBeNull();
  });
});

describe('groupEventsByArea', () => {
  it('mengelompokkan per area dan menaruh yang belum dipetakan di akhir', () => {
    const groups = groupEventsByArea([ev('e1', 'era_2'), ev('e2', 'era_1'), ev('e3', null)], AREAS);
    expect(groups.map(g => g.key)).toEqual(['era_1', 'era_2', '__unmapped__']);
    expect(groups[0]?.name).toBe('Panggung Funworld Lt. 3');
    expect(groups[0]?.events.map(e => e.id)).toEqual(['e2']);
    expect(groups[2]?.name).toBe('Lokasi Lainnya');
    expect(groups[2]?.events.map(e => e.id)).toEqual(['e3']);
  });

  it('mengurutkan area sesuai sortOrder', () => {
    const reversed = [area('era_2', 'Panggung Lt. Dasar', 5), area('era_1', 'Panggung Funworld Lt. 3', 0)];
    const groups = groupEventsByArea([ev('e1', 'era_2'), ev('e2', 'era_1')], reversed);
    expect(groups.map(g => g.key)).toEqual(['era_1', 'era_2']);
  });

  it('tidak menyertakan bucket unmapped bila semua event punya area', () => {
    expect(groupEventsByArea([ev('e1', 'era_1')], AREAS).map(g => g.key)).toEqual(['era_1']);
  });

  it('mengembalikan satu bucket unmapped bila tidak ada event ber-area', () => {
    const groups = groupEventsByArea([ev('e1', null), ev('e2', null)], AREAS);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe('__unmapped__');
  });
});

describe('resolveAreaDisplay', () => {
  it('memakai nama area bila areaId terpetakan', () => {
    expect(resolveAreaDisplay('era_1', 'Panggung Lt. 3', AREAS)).toBe('Panggung Funworld Lt. 3');
  });

  it('jatuh ke teks lokasi bila areaId null atau tidak dikenal', () => {
    expect(resolveAreaDisplay(null, 'Metland', AREAS)).toBe('Metland');
    expect(resolveAreaDisplay('era_unknown', 'Metland', AREAS)).toBe('Metland');
  });
});
