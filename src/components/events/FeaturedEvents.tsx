import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Zap, Timer } from 'lucide-react';
import { EventItem } from '../../types';
import { CategoryBadges } from '../ui/CategoryBadges';

/* Keyed by MEANING, not by colour name: "live" for what is running now,
 * "action" for what is coming up. The callers previously passed
 * accent="brand-primary", which was not a key here and silently fell back to
 * amber -- so "Sedang Berlangsung" rendered the same amber as "Segera Dimulai".
 */
const ACCENT_STYLES = {
  live: {
    count: 'bg-[var(--wf-live)]/10 text-[var(--wf-live)]',
    link: 'text-[var(--wf-accent)]',
    border: 'border-[var(--wf-rule)]',
  },
  action: {
    count: 'bg-[var(--wf-action)]/10 text-[var(--wf-action)]',
    link: 'text-[var(--wf-accent)]',
    border: 'border-[var(--wf-rule)]',
  },
} as const;

interface Props {
  events: EventItem[];
  title: string;
  accent: string;
  icon: React.ReactNode;
  onDetail?: (ev: EventItem) => void;
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
    <span className="flex items-center gap-1 rounded-full bg-[var(--wf-action)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--wf-action)]">
      <Timer className="h-3 w-3" /> {diff}
    </span>
  );
}

export function FeaturedEvents({ events, title, accent, icon, onDetail }: Props) {
  const navigate = useNavigate();
  if (events.length === 0) return null;

  const featured = events.slice(0, 3);
  const accentStyle = ACCENT_STYLES[accent as keyof typeof ACCENT_STYLES] ?? ACCENT_STYLES.action;

  // acara sering berisi akhiran "- {eo}" (nama + penyelenggara); tampilkan nama bersih di judul.
  const displayTitle = (ev: EventItem) => {
    const eo = ev.eo?.trim();
    const name = ev.acara.trim();
    if (eo && name.endsWith(` - ${eo}`)) return name.slice(0, -(eo.length + 3)).trim();
    return name;
  };
  // jangan ulangi nama di keterangan bila keterangan hanya mengulang judul/nama.
  const showKeterangan = (ev: EventItem) => {
    const k = ev.keterangan?.trim();
    if (!k) return false;
    const title = displayTitle(ev).toLowerCase();
    const norm = k.replace(/\s+/g, ' ').toLowerCase();
    return !(title && norm === title);
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="shrink-0">{icon}</span>
        <h2 className="min-w-0 truncate font-display font-bold text-[var(--wf-ink)]">{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${accentStyle.count}`}>
          {events.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map(ev => {
          const titleName = displayTitle(ev);
          return (
            <div
              key={ev.id}
              onClick={() => onDetail?.(ev)}
              role={onDetail ? 'button' : undefined}
              tabIndex={onDetail ? 0 : undefined}
              aria-label={onDetail ? `Lihat detail: ${titleName}` : undefined}
              onKeyDown={onDetail ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetail(ev); } } : undefined}
              className={`relative overflow-hidden rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4 transition-colors hover:border-[var(--wf-rule-strong)] sm:p-5 ${onDetail ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--wf-board)] focus-visible:outline-none' : ''} ${accentStyle.border}`}
            >
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <CategoryBadges categories={ev.categories} maxVisible={2} />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {ev.status === 'ongoing' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[var(--wf-live)]">
                      <Zap className="h-3 w-3 animate-pulse" /> Live
                    </span>
                  )}
                  {ev.status === 'upcoming' && <CountdownBadge dateStr={ev.dateStr} />}
                </div>
              </div>

              <h3 className="mb-3 font-bold text-[var(--wf-ink)] leading-snug line-clamp-2">{titleName}</h3>

              <div className="space-y-1.5 text-xs text-[var(--wf-ink-muted)]">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="line-clamp-1">{ev.tanggal}</span>
                  {ev.jam && <span className="text-[var(--wf-ink-muted)]">- {ev.jam}</span>}
                </div>
                {ev.lokasi && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-1">{ev.lokasi}</span>
                  </div>
                )}
                {ev.eo && <p className="font-medium text-[var(--wf-ink-muted)]">Penyelenggara: {ev.eo}</p>}
              </div>

              {showKeterangan(ev) && (
                <p className="mt-3 line-clamp-2 text-xs text-[var(--wf-ink-muted)] border-t border-[var(--wf-rule)] pt-2">{ev.keterangan}</p>
              )}
            </div>
          );
        })}
      </div>
      {events.length > 3 && (
        <button
          type="button"
          onClick={() => navigate('/dashboard/events')}
          className={`mt-3 cursor-pointer text-xs font-medium transition-colors hover:underline ${accentStyle.link}`}
        >
          +{events.length - 3} acara lainnya. Lihat di daftar acara
        </button>
      )}
    </div>
  );
}