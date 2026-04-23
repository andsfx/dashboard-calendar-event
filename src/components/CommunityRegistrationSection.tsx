import { useState, useMemo } from 'react';
import { Users, Inbox, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { CommunityRegistration, RegistrationStatus } from '../types';

interface Props {
  registrations: CommunityRegistration[];
  isLoading: boolean;
  onDetail: (reg: CommunityRegistration) => void;
}

const STATUS_TABS: Array<{ key: RegistrationStatus | 'all'; label: string; dot?: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Pending', dot: 'bg-amber-500' },
  { key: 'reviewed', label: 'Reviewed', dot: 'bg-blue-500' },
  { key: 'approved', label: 'Approved', dot: 'bg-emerald-500' },
  { key: 'rejected', label: 'Rejected', dot: 'bg-red-500' },
];

function StatusBadgeReg({ status }: { status: RegistrationStatus }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    reviewed: { label: 'Reviewed', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  };
  const c = config[status] || config.pending;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.className}`}>{c.label}</span>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function CommunityRegistrationSection({ registrations, isLoading, onDetail }: Props) {
  const [activeTab, setActiveTab] = useState<RegistrationStatus | 'all'>('all');

  const pendingCount = useMemo(
    () => registrations.filter((r) => r.status === 'pending').length,
    [registrations],
  );

  const filtered = useMemo(
    () => (activeTab === 'all' ? registrations : registrations.filter((r) => r.status === activeTab)),
    [registrations, activeTab],
  );

  return (
    <section id="registrations" className="space-y-4 scroll-mt-32">
      {/* Header card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Pendaftaran Komunitas</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Antrian pendaftaran dari landing page</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <Clock className="h-3.5 w-3.5" />
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === tab.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            {tab.dot && <span className={`h-2 w-2 rounded-full ${activeTab === tab.key ? 'bg-white/80' : tab.dot}`} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-700 dark:bg-slate-800">
          <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Belum ada pendaftaran komunitas</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((reg) => (
              <button
                key={reg.id}
                onClick={() => onDetail(reg)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{reg.communityName}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{reg.communityType}</p>
                  </div>
                  <StatusBadgeReg status={reg.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>PIC: {reg.pic}</span>
                  <span>{reg.phone}</span>
                  <span>{formatDate(reg.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nama Komunitas</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tipe</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">PIC</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanggal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map((reg) => (
                  <tr
                    key={reg.id}
                    onClick={() => onDetail(reg)}
                    className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{reg.communityName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{reg.communityType}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{reg.pic}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{reg.phone}</td>
                    <td className="px-4 py-3"><StatusBadgeReg status={reg.status} /></td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(reg.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
