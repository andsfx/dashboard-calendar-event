import { memo } from 'react';
import { CalendarDays, Radio, Clock3, CheckCircle2, ArrowUp } from 'lucide-react';
import { StatCard } from '../ui/StatCard';

interface DashboardStatsProps {
  stats: {
    total: number;
    ongoing: number;
    upcoming: number;
    past: number;
  };
  /** compact = ringkasan publik: hanya Akan Datang + Sedang Berlangsung */
  compact?: boolean;
  /**
   * Antrian yang benar-benar menunggu keputusan manusia. Hanya diisi di Pusat
   * Komando; kalau kosong pita perhatian tidak dirender sama sekali (bukan
   * dirender dengan angka 0, yang akan terbaca sebagai "ada antrian").
   */
  attention?: {
    draftCount: number;
    pendingRegistrations: number;
    draftsError?: string | null;
  } | null;
}

interface StatEntry {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'live' | 'accent' | 'idle';
}

/**
 * Admin status key: one measured line, read left to right, ordered by what an
 * operator acts on first (running, then next, then the whole, then closed).
 * Deliberately not four equal cards with oversized numerals — those read as
 * decoration, and they made the running count compete with the total.
 */
export const DashboardStats = memo(function DashboardStats({ stats, compact, attention }: DashboardStatsProps) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon={<Clock3 className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
          label="Akan Datang"
          value={stats.upcoming}
          variant="amber"
        />
        <StatCard
          icon={<Radio className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
          label="Sedang Berlangsung"
          value={stats.ongoing}
          variant="emerald"
          pulse
        />
      </div>
    );
  }

  const entries: StatEntry[] = [
    { label: 'Sedang Berlangsung', value: stats.ongoing, icon: <Radio className="h-4 w-4" strokeWidth={1.5} aria-hidden />, tone: 'live' },
    { label: 'Akan Datang', value: stats.upcoming, icon: <Clock3 className="h-4 w-4" strokeWidth={1.5} aria-hidden />, tone: 'accent' },
    { label: 'Total Acara', value: stats.total, icon: <CalendarDays className="h-4 w-4" strokeWidth={1.5} aria-hidden />, tone: 'idle' },
    { label: 'Selesai', value: stats.past, icon: <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />, tone: 'idle' },
  ];

  const pendingTotal = attention
    ? attention.draftCount + attention.pendingRegistrations
    : 0;

  return (
    <div className="space-y-3">
      {/* The queue leads: it is the one number that needs a decision today. */}
      {attention && (pendingTotal > 0 || attention.draftsError) && (
        <div className="wf-metric wf-metric--lead">
          <div className="wf-metric__top">
            <span className="wf-metric__label">Menunggu keputusan</span>
            <span className="wf-metric__icon">
              <ArrowUp className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </span>
          </div>
          <p className="wf-metric__value">{attention.draftsError ? '—' : pendingTotal}</p>
          <p className="wf-metric__hint">
            {attention.draftsError
              ? `Antrian draft gagal dimuat: ${attention.draftsError}`
              : `${attention.draftCount} draft menunggu dipublikasikan · ${attention.pendingRegistrations} pendaftaran komunitas menunggu review`}
          </p>
        </div>
      )}

      <div className="wf-metrics">
        {entries.map(entry => (
          <div key={entry.label} className="wf-metric wf-metric--secondary">
            <div className="wf-metric__top">
              <span className="wf-metric__label">{entry.label}</span>
              <span className={`wf-metric__icon wf-key--${entry.tone}`}>{entry.icon}</span>
            </div>
            <p className="wf-metric__value">{entry.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
});
