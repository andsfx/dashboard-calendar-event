import { useState, useMemo } from 'react';
import { Users, Inbox, Clock, CheckCircle2, XCircle, Eye, Filter } from 'lucide-react';
import { CommunityRegistration, RegistrationStatus, OrganizationType } from '../../types';
import { Toggle } from '../shadcn/toggle';
import { Button } from '../shadcn/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../shadcn/table';

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
        {/* Status filter — chip toggle (`aria-pressed` dari shadcn `Toggle`) */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Toggle
              key={tab.key}
              variant="outline"
              size="sm"
              pressed={activeTab === tab.key}
              onPressedChange={pressed => { if (pressed) setActiveTab(tab.key); }}
              className="rounded-full px-3 text-[var(--wf-ink-muted)] data-[state=on]:border-[var(--wf-accent)] data-[state=on]:bg-[var(--wf-accent-soft)] data-[state=on]:text-[var(--wf-accent)] aria-pressed:border-[var(--wf-accent)] aria-pressed:bg-[var(--wf-accent-soft)] aria-pressed:text-[var(--wf-accent)]"
            >
              {tab.dot && <span className={`h-2 w-2 rounded-full ${tab.dot}`} aria-hidden="true" />}
              {tab.label}
            </Toggle>
          ))}
        </div>

        {/* Org type filter (only show if multiple types exist) */}
        {orgTypesInData.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[var(--wf-ink-muted)]" />
            <Toggle
              variant="outline"
              size="sm"
              pressed={orgTypeFilter === 'all'}
              onPressedChange={pressed => { if (pressed) setOrgTypeFilter('all'); }}
              className="rounded-full px-3 text-[var(--wf-ink-muted)] data-[state=on]:border-[var(--wf-accent)] data-[state=on]:bg-[var(--wf-accent-soft)] data-[state=on]:text-[var(--wf-accent)] aria-pressed:border-[var(--wf-accent)] aria-pressed:bg-[var(--wf-accent-soft)] aria-pressed:text-[var(--wf-accent)]"
            >Semua Tipe</Toggle>
            {orgTypesInData.map(type => {
              const config = ORG_TYPE_CONFIG[type] || ORG_TYPE_CONFIG.other;
              return (
                <Toggle
                  key={type}
                  variant="outline"
                  size="sm"
                  pressed={orgTypeFilter === type}
                  onPressedChange={pressed => { if (pressed) setOrgTypeFilter(type); }}
                  className="rounded-full px-3 text-[var(--wf-ink-muted)] data-[state=on]:border-[var(--wf-accent)] data-[state=on]:bg-[var(--wf-accent-soft)] data-[state=on]:text-[var(--wf-accent)] aria-pressed:border-[var(--wf-accent)] aria-pressed:bg-[var(--wf-accent-soft)] aria-pressed:text-[var(--wf-accent)]"
                >{config.label}</Toggle>
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
              /* Kartu mobile full-width — shadcn `Button` ghost dengan chrome
                 primitif dinetralkan. Border/radius/latar tetap milik
                 `.ui-dashboard-surface` (kelas tak berlapis, selalu menang atas
                 utilitas berlapis), jadi `hover:border-[var(--wf-accent)]`
                 dibiarkan seperti semula: ia memang tidak pernah aktif. */
              <Button
                key={reg.id}
                type="button"
                variant="ghost"
                onClick={() => onDetail(reg)}
                className="ui-dashboard-surface flex! h-auto! w-full! flex-col! items-stretch! justify-start! gap-0! p-4! text-left! whitespace-normal! font-normal! transition-colors hover:border-[var(--wf-accent)] active:translate-y-0!"
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
              </Button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="ui-dashboard-surface hidden overflow-hidden md:block">
            <Table className="text-left">
              <TableHeader>
                <TableRow className="ui-dashboard-muted border-b border-[var(--wf-rule)]">
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Nama</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Tipe</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">PIC</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Telepon</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Status</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Tanggal</TableHead>
                  <TableHead scope="col" className="px-4 py-3">
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[var(--wf-rule)]">
                {filtered.map((reg) => (
                  <TableRow
                    key={reg.id}
                    onClick={() => onDetail(reg)}
                    className="cursor-pointer transition-colors hover:bg-[var(--wf-board-2)]"
                  >
                    <TableCell className="px-4 py-3">
                      <p className="font-medium text-[var(--wf-ink)]">{reg.organizationName || reg.communityName}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <OrgTypeBadge type={reg.organizationType || 'community'} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-[var(--wf-ink-muted)]">{reg.pic}</TableCell>
                    <TableCell className="px-4 py-3 text-[var(--wf-ink-muted)]">{reg.phone}</TableCell>
                    <TableCell className="px-4 py-3"><StatusBadgeReg status={reg.status} /></TableCell>
                    <TableCell className="px-4 py-3 text-[var(--wf-ink-muted)]">{formatDate(reg.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3">
                      {/* Baris tetap klik-untuk-mouse, tapi jalur keyboard ada di
                          tombol nyata ini: `role="button"` pada <TableRow> akan
                          menghapus semantik tabel untuk pembaca layar. */}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); onDetail(reg); }}
                        aria-label={`Lihat detail pendaftaran ${reg.organizationName || reg.communityName}`}
                        className="ui-focus-ring inline-flex h-auto min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-accent-soft)] hover:text-[var(--wf-accent)] active:translate-y-0 focus-visible:ring-0"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
