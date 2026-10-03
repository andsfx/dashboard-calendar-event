import type { EventInsight } from '../../types';
import { adminAction } from './_shared';

export interface InsightNarrativeResult {
  /** false bila server belum dikonfigurasi (`AI_BASE_URL`/`AI_API_KEY` kosong). */
  enabled: boolean;
  /** Ringkasan siap tampil, atau null bila gagal/tidak tersedia. */
  summary: string | null;
}

/**
 * Kirim **fakta insight yang sudah dihitung klien** ke server untuk dijadikan
 * satu paragraf ringkasan (narasi AI). Sengaja bukan data event mentah: yang
 * keluar hanya judul/isi/metrik yang sudah tampil di dashboard, tanpa PII.
 *
 * Server membalas `enabled: false` bila fitur belum dikonfigurasi — itu bukan
 * error, hanya berarti blok ringkasan tidak ditampilkan.
 */
export async function fetchInsightNarrative(insights: EventInsight[]): Promise<InsightNarrativeResult> {
  const payload = insights.slice(0, 30).map((insight) => ({
    severity: insight.severity,
    title: insight.title,
    body: insight.body,
    ...(insight.metric ? { metric: insight.metric } : {}),
  }));

  const result = await adminAction<{ success: boolean; enabled?: boolean; summary?: string | null }>(
    'getInsightNarrative',
    { insights: payload },
  );
  return { enabled: result.enabled !== false, summary: result.summary ?? null };
}