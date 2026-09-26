import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Loader2, Filter,
  Plus, Pencil, Trash2, LogIn, LogOut, Mail, Settings, AlertCircle,
} from 'lucide-react';
import { apiGet } from '../../lib/rest';

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
  create: <Plus className="h-3 w-3 text-[var(--wf-live)]" />,
  update: <Pencil className="h-3 w-3 text-[var(--wf-accent)]" />,
  delete: <Trash2 className="h-3 w-3 text-red-700 dark:text-red-300" />,
  login: <LogIn className="h-3 w-3 text-[var(--wf-accent)]" />,
  logout: <LogOut className="h-3 w-3 text-[var(--wf-ink-muted)]" />,
  invite: <Mail className="h-3 w-3 text-[var(--wf-action)]" />,
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
  user: 'Pengguna',
  survey_config: 'Konfigurasi Survey',
  registration: 'Registrasi',
};

/** Label ramah untuk kunci `details` yang dikenal (bukan JSON mentah). */
const DETAIL_LABELS: Record<string, string> = {
  deactivated: 'Dinonaktifkan',
  is_active: 'Status aktif',
  activated: 'Diaktifkan',
  fields: 'Field diubah',
  role: 'Role',
  email: 'Email',
  status: 'Status',
  previous_status: 'Status sebelumnya',
};

export function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // GET /api/v1/activity-log → data: { logs, total, page, limit } (staff).
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterAction) params.set('action_type', filterAction);
      if (filterResource) params.set('resource_type', filterResource);
      // Batas hari dalam zona Asia/Jakarta (+07:00), bukan UTC — created_at
      // adalah TIMESTAMPTZ dan pengguna membaca waktu lokal.
      if (dateFrom) params.set('from', dateFrom + 'T00:00:00+07:00');
      if (dateTo) params.set('to', dateTo + 'T23:59:59+07:00');
      const data = await apiGet<{ logs: LogEntry[]; total: number }>(`/activity-log?${params}`);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      // Jangan biarkan daftar kosong menyamar sebagai "tidak ada aktivitas".
      setError(err instanceof Error ? err.message : 'Gagal memuat log aktivitas');
      setLogs([]);
      setTotal(0);
    }
    finally { setLoading(false); }
  }, [page, filterAction, filterResource, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--wf-ink-muted)]">{total} aktivitas tercatat</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-[var(--wf-ink-muted)]" />
        <select aria-label="Filter aksi" value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-2 py-1 text-[11px] text-[var(--wf-ink)]">
          <option value="">Semua Aksi</option>
          <option value="create">Buat</option>
          <option value="update">Perbarui</option>
          <option value="delete">Hapus</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="invite">Undang</option>
        </select>
        <select aria-label="Filter tipe resource" value={filterResource} onChange={e => { setFilterResource(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-2 py-1 text-[11px] text-[var(--wf-ink)]">
          <option value="">Semua Tipe</option>
          <option value="event">Event</option>
          <option value="draft">Draft</option>
          <option value="user">Pengguna</option>
          <option value="theme">Tema</option>
          <option value="survey_config">Konfigurasi Survey</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          aria-label="Dari tanggal"
          className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-2 py-1 text-[11px] text-[var(--wf-ink)]" />
        <span className="text-[10px] text-[var(--wf-ink-muted)]">-</span>
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          aria-label="Sampai tanggal"
          className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-2 py-1 text-[11px] text-[var(--wf-ink)]" />
        {(filterAction || filterResource || dateFrom || dateTo) && (
          <button onClick={() => { setFilterAction(''); setFilterResource(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="text-[10px] text-[var(--wf-accent)] hover:underline">Atur Ulang</button>
        )}
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--wf-accent)]" /></div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{error}</p>
              <button type="button" onClick={fetchLogs} className="mt-1 cursor-pointer underline hover:no-underline">
                Coba lagi
              </button>
            </div>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="ui-dashboard-surface p-6 text-center">
          <Activity className="mx-auto h-8 w-8 text-[var(--wf-ink-muted)]" />
          <p className="mt-2 text-sm text-[var(--wf-ink-muted)]">Tidak ada aktivitas ditemukan</p>
        </div>
      ) : (
        <div className="ui-dashboard-surface">
          <div className="divide-y divide-[var(--wf-rule)]">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--wf-board-2)]">
                    {ACTION_ICONS[log.action] || <Settings className="h-3 w-3 text-[var(--wf-ink-muted)]" />}
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--wf-ink)]">
                      <span className="font-semibold">{log.user_email}</span>
                      {' '}
                      <span className="text-[var(--wf-ink-muted)]">{ACTION_LABELS[log.action] || log.action}</span>
                      {log.resource_type && (
                        <span className="text-[var(--wf-ink-muted)]"> {RESOURCE_LABELS[log.resource_type] || log.resource_type}</span>
                      )}
                      {log.resource_id && (
                        <span className="ml-1 rounded bg-[var(--wf-board-2)] px-1 py-0.5 font-mono text-[10px] text-[var(--wf-ink-muted)]">{log.resource_id.slice(0, 12)}</span>
                      )}
                    </p>
                    {/* Details — ringkasan field yang dikenal, bukan JSON mentah */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--wf-ink-muted)]">
                        {Object.entries(log.details).map(([key, value]) => (
                          <span key={key}>
                            <span className="text-[var(--wf-ink-muted)]">
                              {DETAIL_LABELS[key] || key}:
                            </span>{' '}
                            <span className="font-medium">
                              {typeof value === 'boolean'
                                ? value ? 'Ya' : 'Tidak'
                                : Array.isArray(value)
                                  ? value.join(', ')
                                  : typeof value === 'object' && value !== null
                                    ? `${Object.keys(value).length} field`
                                    : String(value)}
                            </span>
                          </span>
                        ))}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-[var(--wf-ink-muted)]">
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
            className="rounded-lg border border-[var(--wf-rule)] px-3 py-1 text-xs font-medium text-[var(--wf-ink-muted)] disabled:opacity-40">
            Sebelumnya
          </button>
          <span className="text-xs text-[var(--wf-ink-muted)]">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-[var(--wf-rule)] px-3 py-1 text-xs font-medium text-[var(--wf-ink-muted)] disabled:opacity-40">
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}
