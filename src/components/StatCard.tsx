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
  primary: 'bg-brand-primary-50 text-brand-primary-700 dark:bg-brand-primary-950/50 dark:text-brand-primary-300',
  slate: 'bg-slate-200 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
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
      className="fade-up rounded-2xl border border-[var(--border-subtle)] bg-[var(--brand-card-light)] p-3.5 shadow-[var(--shadow-card-soft)] transition duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 sm:p-5"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300 sm:text-xs">{label}</p>
          <p className="font-display mt-1 text-3xl font-extrabold leading-none tracking-tight tabular-nums text-slate-900 dark:text-white sm:mt-1.5 sm:text-4xl">{displayed}</p>
          {subtitle && <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 sm:text-xs">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-xs font-bold ${trend.value >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-300">{trend.label}</span>
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
