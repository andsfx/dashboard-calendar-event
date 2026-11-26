import { useState, useMemo } from 'react';
import { Inbox, Clock, Eye, Filter, CalendarPlus } from 'lucide-react';
import { CommunityRegistration, RegistrationStatus, OrganizationType, DraftEventItem, EventItem } from '../../types';
import { Toggle } from '../shadcn/toggle';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../shadcn/table';

interface Props {
  registrations: CommunityRegistration[];
  isLoading: boolean;
  onDetail: (reg: CommunityRegistration) => void;
  /**
   * Draft + event aktif. Dipakai menandai tindak lanjut per registrasi:
   * registrasi yang sudah punya Draft tertaut tidak boleh dianggap "belum
   * dijadwalkan", dan event hasil terbit membuatnya "Sudah dijadwalkan".
   */
  draftEvents?: DraftEventItem[];
  events?: EventItem[];
  /** Buka form Draft terisi dari registrasi (aksi "Buat Draft"). */
  onCreateDraft?: (reg: CommunityRegistration) => void;
  /** Akun demo: hanya melihat, aksi pembuatan Draft disembunyikan. */
  readOnly?: boolean;
}

type FollowUp = { kind: 'event' | 'draft'; label: string; detail: string };

const DRAFT_PROGRESS_LABEL: Record<DraftEventItem['progress'], string> = {
  draft: 'Draft',
  confirm: 'Konfirmasi',
  cancel: 'Batal',
};

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

/**
 * Status tindak lanjut setelah review — pertanyaan yang tidak dijawab kolom
 * "Status" (approved ≠ sudah dijadwalkan, ADR 003).
 */
function FollowUpBadge({ status, followUp }: { status: RegistrationStatus; followUp?: FollowUp }) {
  if (followUp) {
    const className = followUp.kind === 'event'
      ? 'bg-[var(--wf-live)]/10 text-[var(--wf-live)]'
      : 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]';
    return (
      <span
        title={followUp.detail ? `Terhubung ke: ${followUp.detail}` : undefined}
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
      >
        {followUp.label}
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--wf-action)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--wf-action)]">
        Belum dijadwalkan
      </span>
    );
  }
  return <span aria-hidden="true" className="text-xs text-[var(--wf-ink-muted)]">—</span>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function CommunityRegistrationSection({ registrations, isLoading, onDetail, draftEvents = [], events = [], onCreateDraft, readOnly = false }: Props) {
  const [activeTab, setActiveTab] = useState<RegistrationStatus | 'all'>('all');
  const [orgTypeFilter, setOrgTypeFilter] = useState<OrganizationType | 'all'>('all');
  /** Pencarian prototipe: nama organisasi/komunitas + nomor kontak. */
  const [query, setQuery] = useState('');

  // Tindak lanjut per registrasi, dihitung dari relasi yang sudah ada di state
  // dashboard (draft_events.organization_id / events.organization_id). Event
  // menang atas Draft: registrasi yang sudah punya event live tidak lagi
  // dianggap "dalam antrian".
  const followUpByReg = useMemo(() => {
    const map = new Map<string, FollowUp>();
    for (const draft of draftEvents) {
      const orgId = draft.organizationId;
      if (!orgId || draft.deleted) continue;
      // Draft batal bukan antrean aktif: registrasi harus bisa dibuatkan Draft
      // pengganti. Tanpa ini, "Batal" di form Draft jadi jalan buntu.
      if (!draft.published && draft.progress === 'cancel') continue;
      if (draft.published) {
        map.set(orgId, { kind: 'event', label: 'Sudah dijadwalkan', detail: draft.acara });
      } else if (map.get(orgId)?.kind !== 'event') {
        map.set(orgId, {
          kind: 'draft',
          label: `Draft · ${DRAFT_PROGRESS_LABEL[draft.progress] || draft.progress}`,
          detail: draft.acara,
        });
      }
    }
    for (const ev of events) {
      if (!ev.organizationId) continue;
      map.set(ev.organizationId, { kind: 'event', label: 'Sudah dijadwalkan', detail: ev.acara });
    }
    return map;
  }, [draftEvents, events]);

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
    const q = query.trim().toLowerCase();
    return registrations.filter(r => {
      if (activeTab !== 'all' && r.status !== activeTab) return false;
      if (orgTypeFilter !== 'all' && (r.organizationType || 'community') !== orgTypeFilter) return false;
      if (!q) return true;
      const name = (r.organizationName || r.communityName || '').toLowerCase();
      return name.includes(q) || (r.phone || '').toLowerCase().includes(q);
    });
  }, [registrations, activeTab, orgTypeFilter, query]);

  return (
    <section id="registrations" className="space-y-4 scroll-mt-32">
      {/* Filter rows */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Cari organisasi atau nomor kontak…"
            aria-label="Cari pendaftaran"
            className="h-10 w-full sm:max-w-xs"
          />
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--wf-action)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--wf-action)]">
              <Clock className="h-3.5 w-3.5" />
              {pendingCount} menunggu tinjauan
            </span>
          )}
        </div>
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
            >Semua tipe</Toggle>
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
          <p className="text-sm font-semibold text-[var(--wf-ink)]">
            {registrations.length === 0 ? 'Belum ada pendaftaran' : 'Tidak ada hasil yang cocok'}
          </p>
          <p className="text-sm text-[var(--wf-ink-muted)]">
            {registrations.length === 0
              ? 'Pendaftaran dari halaman landing akan muncul di sini.'
              : 'Coba kata kunci atau filter lain.'}
          </p>
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
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--wf-ink-muted)]">
                  <span>Tindak lanjut:</span>
                  <FollowUpBadge status={reg.status} followUp={followUpByReg.get(reg.id)} />
                </div>
              </Button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="ui-dashboard-surface hidden overflow-hidden md:block">
            <Table tableLabel="Pendaftaran komunitas" className="text-left">
              <TableHeader>
                <TableRow className="ui-dashboard-muted border-b border-[var(--wf-rule)]">
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Nama</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Tipe</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">PIC</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Telepon</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Status</TableHead>
                  <TableHead scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Tindak lanjut</TableHead>
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
                    <TableCell className="px-4 py-3"><FollowUpBadge status={reg.status} followUp={followUpByReg.get(reg.id)} /></TableCell>
                    <TableCell className="px-4 py-3 text-[var(--wf-ink-muted)]">{formatDate(reg.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Satu-satunya jalan dari "approved" ke jadwal (ADR 003):
                            draft dibuat manual, tertaut ke registrasi, lalu
                            diterbitkan dari antrian Draft. Disembunyikan bila
                            sudah ada Draft/event tertaut atau akun demo. */}
                        {onCreateDraft && !readOnly && reg.status === 'approved' && !followUpByReg.get(reg.id) && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); onCreateDraft(reg); }}
                            aria-label={`Buat draft dari pendaftaran ${reg.organizationName || reg.communityName}`}
                            className="h-auto whitespace-nowrap px-2.5 py-1.5 text-xs active:translate-y-0"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Buat Draft
                          </Button>
                        )}
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
                      </div>
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
