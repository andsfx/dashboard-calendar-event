import type { EventArea, EventItem } from '../types';
import { parseDateStrLocal } from './eventUtils';

/**
 * Derivasi untuk Pusat Komando (layout Corporate Overview).
 *
 * Semua fungsi murni dan menerima daftar event yang SUDAH disaring pemanggil,
 * supaya angka yang tampil dapat dilacak ke satu sumber dan mudah diuji.
 */

/** Satu batang pada daftar batang horizontal. */
export interface OverviewBarItem {
  label: string;
  value: number;
}

/** Baris tabel "area paling sering dipakai". */
export interface AreaUsageRow {
  id: string;
  name: string;
  totalEvents: number;
  inUseNow: boolean;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Jumlah event per kategori, urut menurun. Event multi-kategori dihitung di tiap kategorinya. */
export function computeCategoryCounts(events: EventItem[]): OverviewBarItem[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const categories = event.categories.length > 0 ? event.categories : [event.category];
    for (const raw of categories) {
      const name = (raw || '').trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/** Jumlah event per bulan untuk satu tahun, selalu 12 batang agar skala terbaca. */
export function computeMonthlyCounts(events: EventItem[], year: number): OverviewBarItem[] {
  const counts = new Array<number>(12).fill(0);
  for (const event of events) {
    const date = parseDateStrLocal(event.dateStr);
    if (!date || date.getFullYear() !== year) continue;
    const month = date.getMonth();
    counts[month] = (counts[month] ?? 0) + 1;
  }
  return MONTH_SHORT.map((label, index) => ({ label, value: counts[index] ?? 0 }));
}

/**
 * Beban event per area, urut menurun.
 *
 * Area dikenali lewat `areaId` bila event punya tautan; kalau tidak, dikelompokkan
 * menurut `lokasi` apa adanya. Nama area diambil dari master area agar ejaan tetap
 * konsisten walau event menulis lokasi dengan variasi.
 */
export function computeAreaUsage(events: EventItem[], areas: EventArea[]): AreaUsageRow[] {
  const areaById = new Map(areas.map(area => [area.id, area]));
  const groups = new Map<string, AreaUsageRow>();

  for (const event of events) {
    const areaId = event.areaId ?? '';
    const linked = areaId && areaById.has(areaId) ? areaById.get(areaId) : undefined;
    const lokasi = (event.lokasi || '').trim();
    const key = linked ? `id:${linked.id}` : lokasi ? `loc:${lokasi}` : '';
    if (!key) continue;

    let group = groups.get(key);
    if (!group) {
      group = { id: key, name: linked?.name ?? lokasi, totalEvents: 0, inUseNow: false };
      groups.set(key, group);
    }
    group.totalEvents += 1;
    if (event.status === 'ongoing') group.inUseNow = true;
  }

  return [...groups.values()].sort(
    (a, b) => b.totalEvents - a.totalEvents || a.name.localeCompare(b.name),
  );
}

/** Utilisasi area: berapa area aktif yang sedang dipakai event berjalan. */
export function computeAreaUtilisation(
  events: EventItem[],
  areas: EventArea[],
): { inUseNow: number; totalActive: number } {
  const active = areas.filter(area => area.isActive);
  const ongoingAreaIds = new Set(
    events.filter(event => event.status === 'ongoing' && event.areaId).map(event => event.areaId as string),
  );
  return {
    inUseNow: active.filter(area => ongoingAreaIds.has(area.id)).length,
    totalActive: active.length,
  };
}
