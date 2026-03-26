import React, { useEffect, useRef, useState } from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  gradient: string;
  delay?: number;
  pulse?: boolean;
  trend?: { value: number; label: string };
}

function useCountUp(target: number, duration = 800, delay = 0) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
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

export function StatCard({ icon, label, value, subtitle, gradient, delay = 0, pulse = false, trend }: StatCardProps) {
  const displayed = useCountUp(value, 900, delay);

  return (
    <div
      className="fade-up relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-default group"
      style={{ background: gradient, animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Decorative blobs */}
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110" />
      <div className="absolute -right-2 bottom-2 h-14 w-14 rounded-full bg-white/8 transition-transform duration-300 group-hover:scale-105" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/75">{label}</p>
          <p className="mt-1.5 text-4xl font-black tracking-tight tabular-nums">{displayed}</p>
          {subtitle && <p className="mt-1 text-xs text-white/65">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-xs font-bold ${trend.value >= 0 ? 'text-white/90' : 'text-white/60'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}
              </span>
              <span className="text-[10px] text-white/55">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`rounded-xl bg-white/20 p-3 backdrop-blur-sm shadow-inner transition-transform duration-200 group-hover:scale-110 ${pulse ? 'live-dot' : ''}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
