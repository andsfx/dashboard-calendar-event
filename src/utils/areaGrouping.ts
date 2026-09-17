// ─── Area grouping & location mapping utilities ───
// Shared helpers for grouping events by canonical area (event_areas),
// normalising free-text lokasi for suggestion, and resolving display names.
import type { EventArea, EventItem } from '../types';

/** @returns string dinormalisasi untuk pencocokan fuzzy antar area master. */
export function normalizeLokasi(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, '')     // hapus tanda baca
    .replace(/\b(lantai|lt)\b/g, 'lt') // sinonim
    .replace(/\b(fun[,.\s]*world|funworld)\b/g, 'funworld') // sinonim mall
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Candidate target area yang paling mungkin untuk raw lokasi tertentu.
 * @returns areaId atau null bila tidak ada kandidat.
 */
export function suggestAreaId(lokasi: string, areas: EventArea[]): string | null {
  const needle = normalizeLokasi(lokasi);
  if (!needle) return null;
  // Exact normalised match first
  const exact = areas.find(a => normalizeLokasi(a.name) === needle);
  if (exact) return exact.id;
  // Token subset match: semua token needle ada di area name, atau sebaliknya
  const needleTokens = new Set(needle.split(/\s+/));
  let best: { id: string; overlap: number } | null = null;
  for (const a of areas) {
    const aTokens = normalizeLokasi(a.name).split(/\s+/);
    const overlap = aTokens.filter(t => needleTokens.has(t)).length;
    if (overlap > 0 && (!best || overlap > best.overlap)) {
      best = { id: a.id, overlap };
    }
  }
  return best?.id ?? null;
}

export interface GroupableEvent {
  id: string;
  areaId?: string | null;
}

export interface AreaGroup<T extends GroupableEvent = EventItem> {
  area: EventArea | null;
  /** key stabil: area.id || '__unmapped__' */
  key: string;
  /** nama tampilan */
  name: string;
  events: T[];
}

/**
 * Kelompokkan event ke area kanonik; yang belum punya area_id masuk ke
 * bucket terpisah (key = '__unmapped__').
 */
export function groupEventsByArea<T extends GroupableEvent>(
  events: T[],
  areas: EventArea[],
): AreaGroup<T>[] {
  const areaById = new Map(areas.map(a => [a.id, a]));
  const groups = new Map<string, { area: EventArea | null; events: T[] }>();

  for (const ev of events) {
    const key = ev.areaId || '__unmapped__';
    let g = groups.get(key);
    if (!g) {
      g = { area: key === '__unmapped__' ? null : (areaById.get(key) ?? null), events: [] };
      groups.set(key, g);
    }
    g.events.push(ev);
  }

  const result: AreaGroup<T>[] = [];
  for (const [key, g] of groups) {
    if (key === '__unmapped__') continue; // bucket unmapped selalu di akhir
    result.push({ area: g.area, key, name: g.area?.name ?? key, events: g.events });
  }
  result.sort((a, b) => {
    const so = (a.area?.sortOrder ?? 999) - (b.area?.sortOrder ?? 999);
    if (so !== 0) return so;
    return a.name.localeCompare(b.name, 'id');
  });

  const unmapped = groups.get('__unmapped__');
  if (unmapped && unmapped.events.length > 0) {
    result.push({ area: null, key: '__unmapped__', name: 'Lokasi Lainnya', events: unmapped.events });
  }

  return result;
}

/** Lokasi tampilan: nama area bila terpetakan, fallback teks bebas. */
export function resolveAreaDisplay(
  areaId: string | null | undefined,
  lokasi: string,
  areas: EventArea[],
): string {
  if (areaId) {
    const a = areas.find(x => x.id === areaId);
    if (a) return a.name;
  }
  return lokasi;
}