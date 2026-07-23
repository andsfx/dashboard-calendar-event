import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'od-admin-audit-checklist';

interface ResumeItem {
  id: string;
  title: string;
  severity: 'critical' | 'medium' | 'low';
  evidence: string;
  nextAction: string;
}

const RESUME_ITEMS: ResumeItem[] = [
  { id: 'R1', title: 'useDashboardSection dead + incomplete', severity: 'low', evidence: '✅ Re-verify HEAD f115d30 — path absent; 0 refs in src/. Via 719246c', nextAction: 'Selesai — on main' },
  { id: 'R2', title: 'FeaturedEvents scroll ke #views', severity: 'low', evidence: '✅ Re-verify FeaturedEvents.tsx:134 navigate(/dashboard/events); scrollIntoView=0', nextAction: 'Selesai — on main' },
  { id: 'R3', title: 'Logger production sink', severity: 'low', evidence: '✅ Re-verify logger.ts __METMAL_ERROR_SINK__ + reportError; no empty TODO', nextAction: 'Selesai — optional Sentry when DSN' },
  { id: 'R4', title: 'App.tsx monolit route', severity: 'low', evidence: '✅ Re-verify Shell+Handlers in HEAD; App~804 LOC. f115d30=origin/main', nextAction: 'Selesai — on main' },
  { id: 'R5', title: 'ACTION-PLAN Phase 1 security checkboxes', severity: 'critical', evidence: 'Deferred — ops rotate/RLS/cache parked. Local WIP ACTION-PLAN/improve not on main', nextAction: 'Deferred — reopen: rotate · RLS 1.2 · cache 1.3' },
  { id: 'R6', title: 'DEPLOYMENT-VERIFICATION stale', severity: 'low', evidence: '✅ Re-verify Known Issues: no 55 TS claim; SoT npm run build', nextAction: 'Selesai' },
  { id: 'R7', title: 'useDashboardSection vs actual paths', severity: 'low', evidence: '✅ Re-verify dual map gone; SoT dashboardNavigation getDashboardNavGroups', nextAction: 'Selesai — on main' },
];

const CALLOTS = [
  {
    id: 'r1-r7',
    title: 'R1+R7 — Path map fixed',
    body: (
      <>
        ✅ <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">src/hooks/useDashboardSection.ts</code> <strong>dihapus</strong> (0 import, dual-map risk).
        Path SoT: <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">dashboardNavigation.tsx</code> · <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">getDashboardNavGroups</code> · <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">getAllowedDashboardPaths</code>
        (termasuk <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">tenant-surveys</code> + <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">/tenant-survey-results</code>).
      </>
    ),
  },
  {
    id: 'r3',
    title: 'R3 — Logger production sink fixed',
    body: (
      <>
        ✅ <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">src/utils/logger.ts</code> — prod path: optional <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">globalThis.__METMAL_ERROR_SINK__</code> + <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">reportError</code>.
        No Sentry dep (YAGNI). Wire sink saat DSN siap.
      </>
    ),
  },
  {
    id: 'r5',
    title: 'R5 — Security partial · ops deferred',
    body: (
      <>
        ✅ Code harden: <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">.env*</code> gitignore · fail-closed <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">api/admin-login.js</code> · no default password di README.
        ⏸ <strong>Ops skip</strong> (user 2026-07-23): rotate keys, RLS 1.2, Vercel cache 1.3 — parked, not fake-fixed. Reopen saat deploy/ops window.
      </>
    ),
  },
  {
    id: 'r4-r6',
    title: 'R4 + R6 — Shell extracted · doc fixed',
    body: (
      <>
        ✅ <strong>R6</strong> <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">DEPLOYMENT-VERIFICATION.md</code> — drop stale "55 TS errors"; SoT = <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">npm run build</code> / <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">tsc</code>.
        ✅ <strong>R4</strong> chrome: <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">DashboardShell.tsx</code> (in HEAD). Handlers: <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">useDashboardHandlers.ts</code> (in HEAD). App residual ~804 LOC. Commit <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">f115d30</code> = remote <code className="font-mono text-xs rounded bg-rose-50 px-1 py-0.5 text-rose-700">main</code>.
      </>
    ),
  },
];

type SeverityFilter = 'all' | 'critical' | 'medium' | 'low';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, medium: 1, low: 2 };

function loadChecklist(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-rose-50 text-rose-600 border-rose-200',
    medium: 'bg-amber-50 text-amber-600 border-amber-200',
    low: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full border ${colors[severity] || colors.low}`}>
      {severity}
    </span>
  );
}

export function AuditResumeDashboard() {
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const saved = loadChecklist();
    const defaults: Record<string, boolean> = {};
    RESUME_ITEMS.forEach(item => {
      if (item.id in saved) {
        defaults[item.id] = saved[item.id];
      } else {
        defaults[item.id] = item.id !== 'R5';
      }
    });
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checklist));
  }, [checklist]);

  const doneCount = RESUME_ITEMS.filter(item => checklist[item.id]).length;
  const totalCount = RESUME_ITEMS.length;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const toggleCheck = useCallback((id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const filtered = filter === 'all'
    ? RESUME_ITEMS
    : RESUME_ITEMS.filter(item => item.severity === filter);

  const sorted = [...filtered].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id)
  );

  const filters: SeverityFilter[] = ['all', 'critical', 'medium', 'low'];

  return (
    <div className="space-y-6">
      <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 px-3 py-1 rounded-full bg-slate-50 border border-black/[0.04]">
        Audit resume · graphify re-verify
      </span>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resume Temuan</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-prose">
            Progress debt — R1–R4+R6+R7 on <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-700">main</code>. R4 = <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-700">DashboardShell</code> + <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-700">useDashboardHandlers</code>. R5 ops <strong>deferred</strong> — rotate/RLS/cache parked.
          </p>
          <p className="mt-1 text-[10px] font-mono text-slate-400 tracking-[0.02em]">
            re-verify 23 Jul 2026 · HEAD=origin/main <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">f115d30</code> · graph 3330n/4987e · 6 fixed · R5 deferred · graph stale for new symbols
          </p>
        </div>
        <span className="text-[11px] text-slate-400 font-medium tabular-nums whitespace-nowrap">
          {doneCount} / {totalCount} selesai
        </span>
      </div>

      <div className="rounded-full bg-slate-100 dark:bg-slate-800 h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-primary-500 transition-all duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {CALLOTS.map(callout => (
        <div
          key={callout.id}
          className="rounded-2xl border border-rose-200/70 bg-rose-50/30 p-4 shadow-[var(--shadow-card)]"
        >
          <h4 className="text-xs font-semibold text-rose-600 mb-1 tracking-tight">{callout.title}</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-prose">{callout.body}</p>
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter severity">
        {filters.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-[11px] px-4 py-1.5 rounded-full border font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary-500 ${
              filter === f
                ? 'bg-brand-primary-50 text-brand-primary-700 border-brand-primary-300 font-semibold'
                : 'bg-white text-slate-500 border-black/[0.06] hover:border-brand-primary-200 hover:text-brand-primary-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'
            }`}
            aria-pressed={filter === f}
          >
            {f === 'all' ? 'Semua' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-black/[0.04] bg-white dark:bg-slate-800/50 shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Daftar temuan audit">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800">
                <th scope="col" className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.08em] text-slate-400 sticky top-0 bg-inherit w-9">Selesai</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.08em] text-slate-400 sticky top-0 bg-inherit">ID</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.08em] text-slate-400 sticky top-0 bg-inherit">Item</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.08em] text-slate-400 sticky top-0 bg-inherit">Severitas</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.08em] text-slate-400 sticky top-0 bg-inherit">Evidence</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.08em] text-slate-400 sticky top-0 bg-inherit">Langkah selanjutnya</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">Filter kosong</p>
                    <p className="text-xs mt-1">Tidak ada temuan untuk severity ini. Pilih filter lain.</p>
                  </td>
                </tr>
              ) : (
                sorted.map(item => {
                  const done = checklist[item.id] || false;
                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-black/[0.04] transition hover:bg-brand-primary-50/30 dark:hover:bg-brand-primary-950/20 ${done ? 'opacity-45' : ''}`}
                    >
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          id={`check-${item.id}`}
                          checked={done}
                          onChange={() => toggleCheck(item.id)}
                          className="accent-brand-primary-500 w-4 h-4 cursor-pointer"
                          aria-label={`Tandai ${item.id} selesai`}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <code className={`font-mono text-xs rounded px-1 py-0.5 ${done ? 'text-slate-400 bg-slate-100' : 'text-brand-primary-700 bg-brand-primary-50'}`}>
                          {item.id}
                        </code>
                      </td>
                      <td className={`px-4 py-3 align-top font-medium ${done ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {item.title}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <SeverityBadge severity={item.severity} />
                      </td>
                      <td className="px-4 py-3 align-top text-slate-500 max-w-[260px] leading-relaxed">
                        {item.evidence}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-500 max-w-[200px] leading-relaxed">
                        {item.nextAction}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
