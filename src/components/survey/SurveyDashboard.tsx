import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck, Download, Star, Users, Building2,
  TrendingUp, Loader2, RefreshCw, ChevronRight,
} from 'lucide-react';

interface SurveyStats {
  total_responses: number;
  organizer_responses: number;
  public_responses: number;
  unique_events: number;
  mall_avg: {
    cleanliness: number;
    staff_service: number;
    coordination: number;
    security: number;
    overall: number;
  } | null;
  nps_score: number | null;
  recent: Array<{
    id: string;
    event_id: string;
    survey_type: string;
    mall_cleanliness: number;
    mall_staff_service: number;
    mall_coordination: number;
    mall_security: number;
    eo_recommendation: number | null;
    respondent_name: string;
    created_at: string;
  }>;
}

interface SurveyDashboardProps {
  events: Array<{ id: string; acara: string; status: string }>;
}

export function SurveyDashboard({ events }: SurveyDashboardProps) {
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/survey?action=stats', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` },
      });
      const json = await res.json();
      if (json.success) setStats(json.stats);
      else setError(json.error || 'Gagal memuat data');
    } catch {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleExport = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/survey?action=export&event_id=${encodeURIComponent(eventId)}`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `survey-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        {error}
        <button onClick={fetchStats} className="ml-2 underline">Coba lagi</button>
      </div>
    );
  }

  if (!stats || stats.total_responses === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
        <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
          Belum ada response survey
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Survey akan muncul setelah event selesai dan responden mengisi feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Survey Kepuasan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Feedback dari penyelenggara & peserta event</p>
        </div>
        <button
          onClick={fetchStats}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatMini icon={<ClipboardCheck className="h-4 w-4" />} label="Total Response" value={stats.total_responses} color="violet" />
        <StatMini icon={<Building2 className="h-4 w-4" />} label="Penyelenggara" value={stats.organizer_responses} color="blue" />
        <StatMini icon={<Users className="h-4 w-4" />} label="Peserta" value={stats.public_responses} color="emerald" />
        <StatMini icon={<Star className="h-4 w-4" />} label="Event Dinilai" value={stats.unique_events} color="amber" />
      </div>

      {/* Mall average ratings */}
      {stats.mall_avg && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Rata-rata Rating Mall
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <RatingBar label="Kebersihan" value={stats.mall_avg.cleanliness} />
            <RatingBar label="Pelayanan" value={stats.mall_avg.staff_service} />
            <RatingBar label="Koordinasi" value={stats.mall_avg.coordination} />
            <RatingBar label="Keamanan" value={stats.mall_avg.security} />
            <RatingBar label="Overall" value={stats.mall_avg.overall} highlight />
          </div>
        </div>
      )}

      {/* NPS Score */}
      {stats.nps_score !== null && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <TrendingUp className={`h-5 w-5 ${stats.nps_score >= 50 ? 'text-emerald-500' : stats.nps_score >= 0 ? 'text-yellow-500' : 'text-red-500'}`} />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Net Promoter Score (NPS)</p>
              <p className={`text-xl font-bold ${stats.nps_score >= 50 ? 'text-emerald-600' : stats.nps_score >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                {stats.nps_score > 0 ? '+' : ''}{stats.nps_score}
              </p>
            </div>
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              {stats.nps_score >= 50 ? 'Excellent' : stats.nps_score >= 0 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        </div>
      )}

      {/* Recent responses */}
      {stats.recent.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Response Terbaru</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {stats.recent.map((r) => {
              const mallAvg = ((r.mall_cleanliness + r.mall_staff_service + r.mall_coordination + r.mall_security) / 4);
              const eventName = events.find(e => e.id === r.event_id)?.acara || r.event_id;
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${mallAvg >= 8 ? 'bg-emerald-500' : mallAvg >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    {mallAvg.toFixed(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{eventName}</p>
                    <p className="text-[10px] text-slate-400">
                      {r.respondent_name || 'Anonim'} · {r.survey_type === 'organizer' ? 'Penyelenggara' : 'Peserta'} · {new Date(r.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export per event */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Export Data Survey</h3>
        </div>
        <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
          {events.filter(e => e.status === 'past').slice(0, 20).map((ev) => (
            <div key={ev.id} className="flex items-center justify-between px-4 py-2.5">
              <p className="truncate text-xs text-slate-700 dark:text-slate-300">{ev.acara}</p>
              <button
                onClick={() => handleExport(ev.id)}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30"
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
            </div>
          ))}
          {events.filter(e => e.status === 'past').length === 0 && (
            <p className="px-4 py-3 text-xs text-slate-400">Belum ada event yang selesai</p>
          )}
        </div>
      </div>
    </div>
  );
}


/* ─── Helpers ──────────────────────────────────────────────────── */

function StatMini({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className={`mb-2 inline-flex rounded-lg p-1.5 ${colors[color] || colors.violet}`}>{icon}</div>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function RatingBar({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const pct = (value / 10) * 100;
  const color = value >= 8 ? 'bg-emerald-500' : value >= 5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className={`space-y-1 ${highlight ? 'rounded-lg bg-violet-50 p-2 dark:bg-violet-900/20' : ''}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] ${highlight ? 'font-semibold text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-400'}`}>{label}</span>
        <span className={`text-xs font-bold ${value >= 8 ? 'text-emerald-600' : value >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function getAccessToken(): string {
  try {
    // Try to get Supabase access token from localStorage
    const keys = Object.keys(localStorage);
    const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) {
      const data = JSON.parse(localStorage.getItem(sbKey) || '{}');
      return data.access_token || '';
    }
  } catch { /* ignore */ }
  return '';
}
