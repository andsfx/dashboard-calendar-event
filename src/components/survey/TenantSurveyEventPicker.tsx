import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, AlertTriangle, Calendar, MapPin, Search, ArrowRight,
} from 'lucide-react';
import { fetchPublicTenantSurveyEvents, type PublicTenantSurveyEventInfo } from '../../utils/supabaseApi';

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

function statusEmoji(s: string) {
  if (s === 'ongoing') return '🟢';
  if (s === 'past') return '✅';
  return '📅';
}

export default function TenantSurveyEventPicker() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<PublicTenantSurveyEventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPublicTenantSurveyEvents();
        if (!cancelled) {
          setEvents(data);
          if (data.length === 0) setError('Belum ada event yang bisa disurvey');
        }
      } catch {
        if (!cancelled) setError('Gagal memuat data event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return events;
    const q = query.toLowerCase();
    return events.filter(e =>
      e.acara.toLowerCase().includes(q) ||
      e.lokasi?.toLowerCase().includes(q) ||
      e.eo?.toLowerCase().includes(q),
    );
  }, [events, query]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Memuat daftar event...</p>
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Tidak Ada Event</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari event..."
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Tidak ada event yang cocok dengan "{query}"
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(ev => (
            <button
              key={ev.id}
              type="button"
              onClick={() => navigate(`/tenant-survey/${ev.id}`)}
              className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-600 dark:hover:bg-violet-950/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{statusEmoji(ev.status)}</span>
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{ev.acara}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(ev.tanggal)}
                  </span>
                  {ev.lokasi && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ev.lokasi}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="ml-3 h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-violet-500 dark:text-slate-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}