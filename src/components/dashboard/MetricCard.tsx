import type { ReactNode } from 'react';

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  /** Kelas Tailwind untuk aksen ikon, mis. `text-[var(--wf-live)]`. */
  tone?: string;
  /** Sorot kartu yang butuh perhatian (mis. menunggu review). */
  emphasis?: boolean;
}

/**
 * Kartu metrik Pusat Komando: label, angka besar, dan keterangan kecil.
 *
 * Bentuk visual mengikuti MetricCard Corporate Overview; warnanya memakai token
 * `--wf-*` supaya terang identik dengan referensi dan tema gelap tetap benar
 * (token `--brand-*` referensi tidak ikut berbalik di mode gelap).
 */
export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'text-[var(--wf-accent)]',
  emphasis = false,
}: MetricCardProps) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border bg-[var(--wf-board)] p-4 shadow-[var(--shadow-card-soft)] ${
        emphasis ? 'border-[var(--wf-action)]' : 'border-[var(--wf-rule)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--wf-ink-muted)]">{label}</p>
        {icon ? <span className={tone}>{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--wf-ink)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">{hint}</p> : null}
    </div>
  );
}
