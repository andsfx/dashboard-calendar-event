import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, AlertTriangle, Calendar, MapPin, Search,
  Building2, ChevronRight,
} from 'lucide-react';
import { fetchPublicTenantSurveyEvents, type PublicTenantSurveyEventInfo } from '../../utils/supabaseApi';

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
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
          if (data.length === 0) setError('Belum ada event yang bisa disurvei');
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

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Memuat daftar event...</p>
      </div>
    );
  }

  // Error + no data
  if (error && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-6 py-16 text-center dark:border-amber-800 dark:bg-amber-950/30">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tidak Ada Event</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header description */}
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Evaluasi dampak event terhadap gerai Anda. Isi informasi tenant, traffic, dan penjualan selama event berlangsung.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari nama event, lokasi, atau penyelenggara..."
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-emerald-500"
        />
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {filtered.map(ev => (
          <button
            key={ev.id}
            type="button"
            onClick={() => navigate(`/tenant-survey/${ev.id}`)}
            className="group relative flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-600"
          >
            {/* Status indicator bar */}
            <div className="hidden h-12 w-1 shrink-0 rounded-full bg-slate-300 sm:block dark:bg-slate-600" />

            {/* Content */}
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {ev.acara}
              </span>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(ev.tanggal)}
                </span>
                {ev.lokasi && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {ev.lokasi}
                  </span>
                )}
                {ev.eo && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {ev.eo}
                  </span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-hover:bg-emerald-100 group-hover:text-emerald-600 dark:bg-slate-700 dark:text-slate-500 dark:group-hover:bg-emerald-900/50 dark:group-hover:text-emerald-400">
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>

      {/* No results */}
      {!loading && filtered.length === 0 && events.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-600">
          <Search className="mb-3 h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Tidak ada event yang cocok dengan "<span className="font-semibold">{query}</span>"
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            Hapus filter
          </button>
        </div>
      )}
    </div>
  );
}