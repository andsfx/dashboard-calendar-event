import { memo } from 'react';
import { CalendarDays, Radio, Clock3, CheckCircle2 } from 'lucide-react';
import { StatCard } from '../StatCard';

interface DashboardStatsProps {
  stats: {
    total: number;
    ongoing: number;
    upcoming: number;
    past: number;
  };
  /** compact = ringkasan publik: hanya Akan Datang + Sedang Berlangsung */
  compact?: boolean;
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
export const DashboardStats = memo(function DashboardStats({ stats, compact }: DashboardStatsProps) {
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

  return (
    <div className="wf-register grid grid-cols-2 gap-px bg-[var(--wf-rule)] sm:grid-cols-4">
      {entries.map(entry => (
        <div key={entry.label} className="flex items-baseline justify-between gap-2 bg-[var(--wf-board)] px-3.5 py-3">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={`wf-key wf-key--${entry.tone}`}>{entry.icon}</span>
            <span className="truncate text-xs font-medium text-[var(--wf-ink-muted)]">{entry.label}</span>
          </span>
          <span className="wf-code shrink-0 text-lg font-semibold text-[var(--wf-ink)]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
});
