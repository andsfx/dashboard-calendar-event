import { type ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color: 'indigo' | 'emerald' | 'amber' | 'slate';
  delay?: number;
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    icon: 'bg-indigo-500 shadow-indigo-500/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100 dark:border-indigo-900/50',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    icon: 'bg-emerald-500 shadow-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-900/50',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: 'bg-amber-500 shadow-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900/50',
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    icon: 'bg-slate-500 shadow-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700/50',
  },
};

export default function StatCard({ icon, label, value, color, delay = 0 }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div
      className={`${c.bg} rounded-2xl p-5 border ${c.border} animate-fade-in-up hover:shadow-md transition-shadow`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className={`${c.icon} text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <p className={`text-3xl font-bold ${c.text} tabular-nums`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
