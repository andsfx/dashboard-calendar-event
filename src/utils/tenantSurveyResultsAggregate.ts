import type { TenantEventSurvey } from '../types';
import { isV3Survey } from './surveyUtils';
import { SURVEY_OPTIONS } from '../constants/survey-options';

export interface ResultsFilter {
  eventId: string; // 'all' | id
  dateFrom: string; // '' | yyyy-mm-dd
  dateTo: string;
  zona: string; // 'all' | label
  kategori: string;
  status: 'all' | 'submitted' | 'reviewed';
}

export interface DistMap {
  labels: string[];
  counts: Record<string, number>;
}

export interface TopGeraiRow {
  nama_gerai: string;
  count: number;
  trafficPos: number;
  salesPos: number;
  score: number;
}

export interface CrossTabCell {
  kategori: string;
  sales: string;
  count: number;
}

export interface ResultsAggregate {
  rows: TenantEventSurvey[];
  total: number;
  uniqueGerai: number;
  trafficPosPct: number;
  salesPosPct: number;
  trafficDist: DistMap;
  salesDist: DistMap;
  kategoriDist: DistMap;
  zonaDist: DistMap;
  topGerai: TopGeraiRow[];
  crossTab: CrossTabCell[];
  feedback: Array<{ id: string; gerai: string; event_id: string; text: string; at: string }>;
}

const TRAFFIC_POS = new Set(['Signifikan', 'Sedikit Naik']);
const SALES_POS = new Set(['> 50%', '30% - 50%', '10% - 30%']);

function countDist(items: (string | null | undefined)[], labels: string[]): DistMap {
  const counts: Record<string, number> = {};
  for (const l of labels) counts[l] = 0;
  for (const item of items) {
    if (!item) continue;
    counts[item] = (counts[item] || 0) + 1;
  }
  return { labels, counts };
}

function dayKey(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function filterSurveys(
  surveys: TenantEventSurvey[],
  filter: ResultsFilter,
): TenantEventSurvey[] {
  return surveys.filter((s) => {
    // final only
    if (s.status !== 'submitted' && s.status !== 'reviewed') return false;
    if (filter.status !== 'all' && s.status !== filter.status) return false;
    if (filter.eventId !== 'all' && s.event_id !== filter.eventId) return false;
    if (filter.zona !== 'all' && s.lokasi_zona !== filter.zona) return false;
    if (filter.kategori !== 'all' && s.kategori !== filter.kategori) return false;

    const d = dayKey(s.submitted_at || s.created_at);
    if (filter.dateFrom && d && d < filter.dateFrom) return false;
    if (filter.dateTo && d && d > filter.dateTo) return false;
    return true;
  });
}

export function aggregateResults(surveys: TenantEventSurvey[]): ResultsAggregate {
  const v3 = surveys.filter(isV3Survey);
  const trafficLabels = [...SURVEY_OPTIONS.kenaikan_traffic];
  const salesLabels = [...SURVEY_OPTIONS.kenaikan_sales];
  const kategoriLabels = [...SURVEY_OPTIONS.kategori];
  const zonaLabels = [...SURVEY_OPTIONS.lokasi_zona];

  const trafficDist = countDist(v3.map((s) => s.kenaikan_traffic), trafficLabels);
  const salesDist = countDist(v3.map((s) => s.kenaikan_sales), salesLabels);
  const kategoriDist = countDist(v3.map((s) => s.kategori), kategoriLabels);
  const zonaDist = countDist(v3.map((s) => s.lokasi_zona), zonaLabels);

  const total = v3.length;
  let trafficPos = 0;
  let salesPos = 0;
  for (const s of v3) {
    if (s.kenaikan_traffic && TRAFFIC_POS.has(s.kenaikan_traffic)) trafficPos += 1;
    if (s.kenaikan_sales && SALES_POS.has(s.kenaikan_sales)) salesPos += 1;
  }

  // top gerai by combined positive signals
  const byGerai = new Map<string, TopGeraiRow>();
  for (const s of v3) {
    const name = (s.nama_gerai || s.tenant_name || 'Tanpa nama').trim() || 'Tanpa nama';
    const row = byGerai.get(name) || { nama_gerai: name, count: 0, trafficPos: 0, salesPos: 0, score: 0 };
    row.count += 1;
    if (s.kenaikan_traffic && TRAFFIC_POS.has(s.kenaikan_traffic)) row.trafficPos += 1;
    if (s.kenaikan_sales && SALES_POS.has(s.kenaikan_sales)) row.salesPos += 1;
    row.score = row.trafficPos + row.salesPos;
    byGerai.set(name, row);
  }
  const topGerai = [...byGerai.values()]
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, 10);

  // cross-tab kategori × sales
  const crossMap = new Map<string, CrossTabCell>();
  for (const s of v3) {
    if (!s.kategori || !s.kenaikan_sales) continue;
    const key = `${s.kategori}||${s.kenaikan_sales}`;
    const cell = crossMap.get(key) || { kategori: s.kategori, sales: s.kenaikan_sales, count: 0 };
    cell.count += 1;
    crossMap.set(key, cell);
  }
  const crossTab = [...crossMap.values()].sort((a, b) => b.count - a.count);

  const feedback = v3
    .filter((s) => (s.feedback_teks || '').trim().length > 0)
    .map((s) => ({
      id: s.id,
      gerai: (s.nama_gerai || s.tenant_name || 'Gerai').trim(),
      event_id: s.event_id,
      text: (s.feedback_teks || '').trim(),
      at: s.submitted_at || s.created_at,
    }))
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  return {
    rows: v3,
    total,
    uniqueGerai: new Set(v3.map((s) => s.nama_gerai).filter(Boolean)).size,
    trafficPosPct: total > 0 ? Math.round((trafficPos / total) * 100) : 0,
    salesPosPct: total > 0 ? Math.round((salesPos / total) * 100) : 0,
    trafficDist,
    salesDist,
    kategoriDist,
    zonaDist,
    topGerai,
    crossTab,
    feedback,
  };
}

export const EMPTY_FILTER: ResultsFilter = {
  eventId: 'all',
  dateFrom: '',
  dateTo: '',
  zona: 'all',
  kategori: 'all',
  status: 'all',
};
