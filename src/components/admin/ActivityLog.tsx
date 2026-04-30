import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Loader2, Calendar, Filter, User,
  Plus, Pencil, Trash2, LogIn, LogOut, Mail, Settings,
} from 'lucide-react';

interface LogEntry {
  id: number;
  user_id: string | null;
  user_email: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <Plus className="h-3 w-3 text-emerald-500" />,
  update: <Pencil className="h-3 w-3 text-blue-500" />,
  delete: <Trash2 className="h-3 w-3 text-red-500" />,
  login: <LogIn className="h-3 w-3 text-violet-500" />,
  logout: <LogOut className="h-3 w-3 text-slate-400" />,
  invite: <Mail className="h-3 w-3 text-amber-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Membuat',
  update: 'Mengubah',
  delete: 'Menghapus',
  login: 'Login',
  logout: 'Logout',
  invite: 'Mengundang',
};

const RESOURCE_LABELS: Record<string, string> = {
  event: 'Event',
  draft: 'Draft',
  theme: 'Tema',
  user: 'User',
  survey_config: 'Survey Config',
  registration: 'Registrasi',
};

export function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'activity-log', page: String(page), limit: String(limit) });
      if (filterAction) params.set('action_type', filterAction);
      if (filterResource) params.set('resource_type', filterResource);
      if (dateFrom) params.set('from', dateFrom + 'T00:00:00Z');
      if (dateTo) params.set('to', dateTo + 'T23:59:59Z');

      const res = await fetch(`/api/auth?${params}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        setTotal(json.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, filterAction, filterResource, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Activity Log</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{total} aktivitas tercatat</p>
        </div>
        <Activity className="h-5 w-5 text-slate-300 dark:text-slate-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-slate-400" />
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <option value="">Semua Aksi</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="invite">Invite</option>
        </select>
        <select value={filterResource} onChange={e => { setFilterResource(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <option value="">Semua Resource</option>
          <option value="event">Event</option>
          <option value="draft">Draft</option>
          <option value="user">User</option>
          <option value="theme">Tema</option>
          <option value="survey_config">Survey</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300" />
        <span className="text-[10px] text-slate-400">—</span>
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300" />
        {(filterAction || filterResource || dateFrom || dateTo) && (
          <button onClick={() => { setFilterAction(''); setFilterResource(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="text-[10px] text-violet-600 hover:underline dark:text-violet-400">Reset</button>
        )}
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <Activity className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm text-slate-500">Tidak ada aktivitas ditemukan</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                    {ACTION_ICONS[log.action] || <Settings className="h-3 w-3 text-slate-400" />}
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{log.user_email}</span>
                      {' '}
                      <span className="text-slate-500">{ACTION_LABELS[log.action] || log.action}</span>
                      {log.resource_type && (
                        <span className="text-slate-500"> {RESOURCE_LABELS[log.resource_type] || log.resource_type}</span>
                      )}
                      {log.resource_id && (
                        <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-700">{log.resource_id.slice(0, 12)}</span>
                      )}
                    </p>
                    {/* Details */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">
                        {JSON.stringify(log.details).slice(0, 120)}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                      {log.ip_address && ` · ${log.ip_address}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300">
            Prev
          </button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function getToken(): string {
  try {
    const keys = Object.keys(localStorage);
    const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) { return JSON.parse(localStorage.getItem(sbKey) || '{}').access_token || ''; }
  } catch {}
  return '';
}
