import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Zap, Timer } from 'lucide-react';
import { EventItem } from '../types';
import { CategoryBadges } from './CategoryBadges';
import { CATEGORY_COLORS } from '../utils/eventUtils';

const ACCENT_STYLES = {
  emerald: {
    count: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    link: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-700/40',
  },
  amber: {
    count: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    link: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-700/40',
  },
} as const;

interface Props {
  events: EventItem[];
  title: string;
  accent: string;
  icon: React.ReactNode;
}

function CountdownBadge({ dateStr }: { dateStr: string }) {
  const [diff, setDiff] = useState('');

  useEffect(() => {
    const calc = () => {
      const target = new Date(dateStr).getTime();
      const now = Date.now();
      const ms = target - now;
      if (ms <= 0) { setDiff('Hari ini'); return; }
      const days = Math.floor(ms / 86400000);
      const hrs  = Math.floor((ms % 86400000) / 3600000);
      if (days > 0) setDiff(`${days}h ${hrs}j lagi`);
      else {
        const mins = Math.floor((ms % 3600000) / 60000);
        setDiff(`${hrs}j ${mins}m lagi`);
      }
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [dateStr]);

  return (
    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      <Timer className="h-3 w-3" /> {diff}
    </span>
  );
}

export function FeaturedEvents({ events, title, accent, icon }: Props) {
  if (events.length === 0) return null;

  const featured = events.slice(0, 3);
  const accentStyle = ACCENT_STYLES[accent as keyof typeof ACCENT_STYLES] ?? ACCENT_STYLES.amber;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="shrink-0">{icon}</span>
        <h2 className="min-w-0 truncate font-bold text-slate-800 dark:text-white">{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${accentStyle.count}`}>
          {events.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map(ev => {
          const color = CATEGORY_COLORS[ev.category] ?? '#6366f1';
          return (
            <div
              key={ev.id}
                className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 sm:p-5 ${accentStyle.border}`}
              >
              {/* Glow bar */}
              <div
                className="absolute left-0 top-0 h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
              />

              <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <CategoryBadges categories={ev.categories} maxVisible={2} />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {ev.status === 'ongoing' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Zap className="h-3 w-3 animate-pulse" /> Live
                    </span>
                  )}
                  {ev.status === 'upcoming' && <CountdownBadge dateStr={ev.dateStr} />}
                </div>
              </div>

              <h3 className="mb-3 font-bold text-slate-800 leading-snug dark:text-white line-clamp-2">{ev.acara}</h3>

              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="line-clamp-1">{ev.tanggal}</span>
                  {ev.jam && <span className="hidden text-slate-400 sm:inline">- {ev.jam}</span>}
                </div>
                {ev.lokasi && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-1">{ev.lokasi}</span>
                  </div>
                )}
                {ev.eo && <p className="font-medium text-slate-600 dark:text-slate-300">EO: {ev.eo}</p>}
              </div>

              {ev.keterangan && (
                <p className="mt-3 line-clamp-2 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">{ev.keterangan}</p>
              )}
            </div>
          );
        })}
      </div>
      {events.length > 3 && (
        <p className={`mt-3 text-xs font-medium ${accentStyle.link}`}>
          +{events.length - 3} acara lainnya tersedia di tampilan utama
        </p>
      )}
    </div>
  );
}
