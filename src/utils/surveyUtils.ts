import type { TenantEventSurvey } from '../types';

/**
 * Detect whether a survey is v3 (categorical) or v2 (legacy rating-based).
 *
 * v3 surveys have a non-empty `kenaikan_traffic` (required enum value).
 * v2 surveys never touch `kenaikan_traffic` — the column stays NULL or ''.
 *
 * Truthy check handles null, undefined, and '' (empty draft) uniformly.
 */
export function isV3Survey(survey: TenantEventSurvey): boolean {
  return !!survey.kenaikan_traffic;
}

/**
 * Opsi yang dihitung sebagai "kenaikan positif".
 *
 * Satu definisi untuk seluruh modul: sebelumnya panel Analytics menghitung
 * sales positif dari tiga opsi (mengabaikan `< 10%`) sementara TrendChart
 * menghitung empat — dataset yang sama menghasilkan dua angka berbeda.
 * `< 10%` tetap kenaikan, jadi ikut dihitung. Traffic hanya punya dua opsi
 * positif, dan keduanya selalu ikut.
 */
export const POSITIVE_SALES_OPTIONS = ['< 10%', '10% - 30%', '30% - 50%', '> 50%'] as const;
export const POSITIVE_TRAFFIC_OPTIONS = ['Signifikan', 'Sedikit Naik'] as const;

/**
 * Kolom agregat (bucket) yang setara dengan opsi positif di atas. TrendChart
 * memakai baris agregat dari server, jadi ia perlu daftar kolomnya — bukan
 * label opsinya. Keduanya harus berubah bersama.
 */
export const POSITIVE_TRAFFIC_BUCKETS = ['traffic_signifikan', 'traffic_sedikit_naik'] as const;
export const POSITIVE_SALES_BUCKETS = ['sales_lt_10', 'sales_10_30', 'sales_30_50', 'sales_gt_50'] as const;

/** Jumlahkan bucket positif dari satu baris agregat; total 0 → 0 (hindari NaN). */
export function positiveSharePct(
  row: object,
  buckets: readonly string[],
  total: number,
): number {
  if (!total || total <= 0) return 0;
  const record = row as Record<string, unknown>;
  const sum = buckets.reduce((acc, key) => {
    const value = record[key];
    return acc + (typeof value === 'number' ? value : 0);
  }, 0);
  return Math.round((sum / total) * 100);
}

/** Persentase responden v3 yang melaporkan kenaikan sales (0 bila tidak ada data). */
export function salesPositivePct(surveys: TenantEventSurvey[]): number {
  const v3 = surveys.filter(isV3Survey);
  if (v3.length === 0) return 0;
  const positive = v3.filter(s => (POSITIVE_SALES_OPTIONS as readonly string[]).includes(s.kenaikan_sales ?? '')).length;
  return Math.round((positive / v3.length) * 100);
}

/** Persentase responden v3 yang melaporkan kenaikan traffic (0 bila tidak ada data). */
export function trafficPositivePct(surveys: TenantEventSurvey[]): number {
  const v3 = surveys.filter(isV3Survey);
  if (v3.length === 0) return 0;
  const positive = v3.filter(s => (POSITIVE_TRAFFIC_OPTIONS as readonly string[]).includes(s.kenaikan_traffic ?? '')).length;
  return Math.round((positive / v3.length) * 100);
}
