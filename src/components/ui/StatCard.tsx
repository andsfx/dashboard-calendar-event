import React, { memo, useEffect, useRef, useState } from 'react';

type StatCardVariant = 'primary' | 'slate' | 'emerald' | 'amber';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  variant: StatCardVariant;
  delay?: number;
  pulse?: boolean;
  trend?: { value: number; label: string };
}

const CHIP_CLASSES: Record<StatCardVariant, string> = {
  primary: 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]',
  slate: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]',
  emerald: 'bg-[var(--wf-live)]/10 text-[var(--wf-live)]',
  amber: 'bg-[var(--wf-action)]/10 text-[var(--wf-action)]',
};

function useCountUp(target: number, duration = 800, delay = 0) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion: jump straight to the final value
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      return;
    }
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out-cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return count;
}

export const StatCard = memo(function StatCard({ icon, label, value, subtitle, variant, delay = 0, pulse = false, trend }: StatCardProps) {
  const displayed = useCountUp(value, 900, delay);
  const chipClass = CHIP_CLASSES[variant];

  return (
    <div
      className="fade-up rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-3.5 transition duration-200 sm:p-5"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--wf-ink-muted)] sm:text-xs">{label}</p>
          <p className="font-display mt-1 text-3xl font-extrabold leading-none tracking-tight tabular-nums text-[var(--wf-ink)] sm:mt-1.5 sm:text-4xl">{displayed}</p>
          {subtitle && <p className="mt-1 text-[11px] text-[var(--wf-ink-muted)] sm:text-xs">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-xs font-bold ${trend.value >= 0 ? 'text-[var(--wf-live)]' : 'text-red-700 dark:text-red-300'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}
              </span>
              <span className="text-[10px] text-[var(--wf-ink-muted)]">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 sm:p-3 ${chipClass} ${pulse ? 'live-dot' : ''}`}>
          {icon}
        </div>
      </div>
    </div>
  );
});
