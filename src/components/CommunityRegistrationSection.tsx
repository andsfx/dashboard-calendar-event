import { useState, useMemo } from 'react';
import { Users, Inbox, Clock, CheckCircle2, XCircle, Eye, Filter } from 'lucide-react';
import { CommunityRegistration, RegistrationStatus, OrganizationType } from '../types';

interface Props {
  registrations: CommunityRegistration[];
  isLoading: boolean;
  onDetail: (reg: CommunityRegistration) => void;
}

const STATUS_TABS: Array<{ key: RegistrationStatus | 'all'; label: string; dot?: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu', dot: 'bg-[var(--wf-action)]' },
  { key: 'reviewed', label: 'Direview', dot: 'bg-[var(--wf-accent)]' },
  { key: 'approved', label: 'Disetujui', dot: 'bg-[var(--wf-live)]' },
  { key: 'rejected', label: 'Ditolak', dot: 'bg-red-600' },
];

const ORG_TYPE_CHIP = 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] border border-[var(--wf-rule)]';

const ORG_TYPE_CONFIG: Record<OrganizationType, { label: string; color: string }> = {
  community: { label: 'Komunitas', color: ORG_TYPE_CHIP },
  school: { label: 'Sekolah', color: ORG_TYPE_CHIP },
  company: { label: 'Perusahaan', color: ORG_TYPE_CHIP },
  eo: { label: 'EO', color: ORG_TYPE_CHIP },
  campus: { label: 'Kampus', color: ORG_TYPE_CHIP },
  government: { label: 'Pemerintah', color: ORG_TYPE_CHIP },
  ngo: { label: 'NGO', color: ORG_TYPE_CHIP },
  other: { label: 'Lainnya', color: ORG_TYPE_CHIP },
};

function OrgTypeBadge({ type }: { type: OrganizationType }) {
  const config = ORG_TYPE_CONFIG[type] || ORG_TYPE_CONFIG.other;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${config.color}`}>
      {config.label}
    </span>
  );
}

function StatusBadgeReg({ status }: { status: RegistrationStatus }) {
  const config = {
    pending: { label: 'Menunggu', className: 'bg-[var(--wf-action)]/10 text-[var(--wf-action)]' },
    reviewed: { label: 'Direview', className: 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]' },
    approved: { label: 'Disetujui', className: 'bg-[var(--wf-live)]/10 text-[var(--wf-live)]' },
    rejected: { label: 'Ditolak', className: 'bg-red-600/10 text-red-700 dark:text-red-300' },
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
  const [orgTypeFilter, setOrgTypeFilter] = useState<OrganizationType | 'all'>('all');

  const pendingCount = useMemo(
    () => registrations.filter((r) => r.status === 'pending').length,
    [registrations],
  );

  // Get unique org types present in data
  const orgTypesInData = useMemo(() => {
    const types = new Set(registrations.map(r => r.organizationType || 'community'));
    return Array.from(types).sort() as OrganizationType[];
  }, [registrations]);

  const filtered = useMemo(() => {
    let result = registrations;
    if (activeTab !== 'all') result = result.filter(r => r.status === activeTab);
    if (orgTypeFilter !== 'all') result = result.filter(r => (r.organizationType || 'community') === orgTypeFilter);
    return result;
  }, [registrations, activeTab, orgTypeFilter]);

  return (
    <section id="registrations" className="space-y-4 scroll-mt-32">
      {/* Header card */}
      <div className="ui-dashboard-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--wf-ink)]">Pendaftaran Organisasi</p>
            <p className="text-xs text-[var(--wf-ink-muted)]">Antrian pendaftaran dari landing page</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--wf-action)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--wf-action)]">
            <Clock className="h-3.5 w-3.5" />
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter rows */}
      <div className="space-y-2">
        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]'
                  : 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] hover:text-[var(--wf-ink)]'
              }`}
            >
              {tab.dot && <span className={`h-2 w-2 rounded-full ${activeTab === tab.key ? 'bg-[var(--wf-accent-ink)]/80' : tab.dot}`} />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Org type filter (only show if multiple types exist) */}
        {orgTypesInData.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[var(--wf-ink-muted)]" />
            <button
              onClick={() => setOrgTypeFilter('all')}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                orgTypeFilter === 'all'
                  ? 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]'
                  : 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] hover:text-[var(--wf-ink)]'
              }`}
            >
              Semua Tipe
            </button>
            {orgTypesInData.map(type => {
              const config = ORG_TYPE_CONFIG[type] || ORG_TYPE_CONFIG.other;
              return (
                <button
                  key={type}
                  onClick={() => setOrgTypeFilter(type)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                    orgTypeFilter === type
                      ? 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]'
                      : `${config.color} hover:opacity-80`
                  }`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--wf-board-2)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ui-dashboard-surface flex flex-col items-center justify-center gap-3 py-16">
          <Inbox className="h-10 w-10 text-[var(--wf-ink-muted)]" />
          <p className="text-sm text-[var(--wf-ink-muted)]">Belum ada pendaftaran</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((reg) => (
              <button
                key={reg.id}
                onClick={() => onDetail(reg)}
                className="ui-dashboard-surface w-full p-4 text-left transition-colors hover:border-[var(--wf-accent)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--wf-ink)]">
                      {reg.organizationName || reg.communityName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <OrgTypeBadge type={reg.organizationType || 'community'} />
                      {reg.organizationType === 'community' && reg.communityType && (
                        <span className="text-[10px] text-[var(--wf-ink-muted)]">• {reg.communityType}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadgeReg status={reg.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--wf-ink-muted)]">
                  <span>PIC: {reg.pic}</span>
                  <span>{reg.phone}</span>
                  <span>{formatDate(reg.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="ui-dashboard-surface hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="ui-dashboard-muted border-b border-[var(--wf-rule)]">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Nama</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Tipe</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">PIC</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Telepon</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Tanggal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--wf-rule)]">
                {filtered.map((reg) => (
                  <tr
                    key={reg.id}
                    onClick={() => onDetail(reg)}
                    className="cursor-pointer transition-colors hover:bg-[var(--wf-board-2)]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--wf-ink)]">{reg.organizationName || reg.communityName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <OrgTypeBadge type={reg.organizationType || 'community'} />
                    </td>
                    <td className="px-4 py-3 text-[var(--wf-ink-muted)]">{reg.pic}</td>
                    <td className="px-4 py-3 text-[var(--wf-ink-muted)]">{reg.phone}</td>
                    <td className="px-4 py-3"><StatusBadgeReg status={reg.status} /></td>
                    <td className="px-4 py-3 text-[var(--wf-ink-muted)]">{formatDate(reg.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Eye className="h-4 w-4 text-[var(--wf-ink-muted)]" />
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
