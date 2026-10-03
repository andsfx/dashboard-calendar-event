import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { EventInsight } from '../../types';
import { fetchInsightNarrative } from '../../utils/api/insightsApi';

/**
 * Blok "Ringkasan AI" di atas daftar insight: satu paragraf naratif dari fakta
 * yang sudah dihitung mesin deterministik.
 *
 * Sengaja **tidak pernah menampilkan error**: bila server belum dikonfigurasi,
 * panggilan gagal, atau tidak ada fakta untuk diringkas, blok ini menghilang
 * tanpa jejak dan panel tetap utuh.
 *
 * Panggilan di-debounce dan di-gate oleh tanda-tangan fakta, bukan identitas
 * array (yang berubah tiap render) — jadi ringkasan disusun ulang hanya saat
 * isi insight benar-benar berubah.
 */
const DEBOUNCE_MS = 700;

export function InsightAiSummary({ insights }: { insights: EventInsight[] }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'off'>('loading');
  const [summary, setSummary] = useState<string | null>(null);

  /** Fakta terbaru tanpa menjadikannya dependensi efek (lihat `signature`). */
  const latest = useRef(insights);
  latest.current = insights;

  const signature = useMemo(
    () => insights.map((insight) => `${insight.id}:${insight.metric ?? ''}`).join('|'),
    [insights],
  );

  useEffect(() => {
    if (signature === '') {
      setStatus('off');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    const timer = setTimeout(() => {
      fetchInsightNarrative(latest.current)
        .then((result) => {
          if (cancelled) return;
          if (!result.enabled || !result.summary) {
            setStatus('off');
            return;
          }
          setSummary(result.summary);
          setStatus('ready');
        })
        .catch(() => {
          if (cancelled) return;
          setStatus('off');
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature]);

  if (status === 'off') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[var(--wf-radius-control)] border border-[var(--wf-accent)] bg-[var(--wf-accent-soft)] px-4 py-3"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--wf-accent)]">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Ringkasan AI
      </p>
      <p className="mt-1 text-sm text-[var(--wf-ink)]">
        {status === 'loading' || !summary ? 'Menyusun ringkasan…' : summary}
      </p>
    </div>
  );
}