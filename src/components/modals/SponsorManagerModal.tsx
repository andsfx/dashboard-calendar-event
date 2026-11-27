import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, Handshake, FileText, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import type { EventProposalEvent, SponsorLead, SponsorLeadStatus } from '../../types';
import {
  fetchSponsorEventsWithProposals,
  fetchAllSponsorLeads,
  updateSponsorLeadStatus,
  deleteSponsorLead,
  setEventProposal,
  deleteEventProposal,
} from '../../utils/domainApi';
import { useConfirmDialog } from './useConfirmDialog';
import { Button } from '../shadcn/button';
import { NativeSelect, NativeSelectOption } from '../shadcn/native-select';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../shadcn/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../shadcn/tabs';

interface Props {
  /** Akun demo: hanya melihat. Tombol mutasi disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB — proposal file (PDF/docx/gambar)

const STATUS_LABELS: Record<SponsorLeadStatus, string> = {
  pending: 'Menunggu',
  contacted: 'Dihubungi',
  agreed: 'Sepakat',
  declined: 'Menolak',
};

const STATUS_CLASSES: Record<SponsorLeadStatus, string> = {
  pending: 'bg-[var(--wf-action)]/10 text-[var(--wf-action)]',
  contacted: 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]',
  agreed: 'bg-[var(--wf-live)]/10 text-[var(--wf-live)]',
  declined: 'bg-red-600/10 text-red-700 dark:text-red-300',
};
export function SponsorManagerModal({ readOnly = false }: Props) {
  const [tab, setTab] = useState<'proposals' | 'leads'>('proposals');
  const [events, setEvents] = useState<EventProposalEvent[]>([]);
  const [leads, setLeads] = useState<SponsorLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingEventId, setUploadingEventId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { confirm, dialog: confirmDialogEl } = useConfirmDialog();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const [evts, lds] = await Promise.all([fetchSponsorEventsWithProposals(), fetchAllSponsorLeads()]);
      setEvents(evts);
      setLeads(lds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data sponsorship');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setTab('proposals');
    setError('');
    setSuccess('');
    loadData();
  }, [loadData]);

  const handleProposalSelect = async (eventId: string, file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran file proposal maksimal 20MB.');
      return;
    }
    setIsUploading(true);
    setUploadingEventId(eventId);
    setError('');
    setSuccess('');
    try {
      await setEventProposal(eventId, file);
      setSuccess('Proposal berhasil diunggah.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah proposal');
    } finally {
      setIsUploading(false);
      setUploadingEventId(null);
      if (fileInputRefs.current[eventId]) fileInputRefs.current[eventId]!.value = '';
    }
  };

  const handleDeleteProposal = async (item: EventProposalEvent) => {
    const ok = await confirm({
      title: 'Hapus proposal?',
      message: 'File proposal untuk event ini akan dihapus.',
      subject: item.event.acara,
    });
    if (!ok) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await deleteEventProposal(item.event.id);
      setSuccess('Proposal dihapus.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (lead: SponsorLead, status: SponsorLeadStatus) => {
    setError('');
    setSuccess('');
    try {
      await updateSponsorLeadStatus(lead.id, status);
      setSuccess(`Status lead "${lead.companyName}" menjadi ${STATUS_LABELS[status]}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status lead');
    }
  };

  const handleDeleteLead = async (lead: SponsorLead) => {
    const ok = await confirm({
      title: 'Hapus lead sponsor?',
      message: 'Data lead ini akan dihapus permanen.',
      subject: lead.companyName,
    });
    if (!ok) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await deleteSponsorLead(lead.id);
      setSuccess('Lead dihapus.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus lead');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (value?: string): string => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatLeadDate = (value?: string): string => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusOptions: SponsorLeadStatus[] = ['pending', 'contacted', 'agreed', 'declined'];

  return (
    <div className="wf-page space-y-4">
      <div className="rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)]">

        <div className="space-y-3 px-4 py-4 sm:px-6">
          {/* Tabs — primitif shadcn/Radix: aria-selected, aria-controls, roving
              tabindex, dan navigasi panah dikelola Radix. */}
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as 'proposals' | 'leads');
              setError('');
              setSuccess('');
            }}
            className="gap-3"
          >
            <TabsList
              aria-label="Sponsorship"
              className="flex h-auto! w-full gap-1 overflow-x-auto rounded-xl bg-[var(--wf-board-2)] p-1"
            >
              <TabsTrigger
                value="proposals"
                className="h-auto! flex-1 rounded-lg px-3 py-2 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
              >
                Proposal Event
              </TabsTrigger>
              <TabsTrigger
                value="leads"
                className="h-auto! flex-1 rounded-lg px-3 py-2 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
              >
                Minat Support ({leads.length})
              </TabsTrigger>
            </TabsList>

            {/* Error message — tetap di dalam Tabs agar tampil di panel mana pun */}
            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-600/20 bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p>{error}</p>
                  <Button variant="ghost" type="button" onClick={loadData} className="mt-2 underline underline-offset-2">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Coba lagi
                  </Button>
                </div>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div role="status" className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--wf-rule)] border-t-[var(--wf-accent)]" aria-hidden="true" />
                <span className="ml-3 text-sm text-[var(--wf-ink-muted)]">Memuat…</span>
              </div>
            )}

          {/* ===== TAB 1: Proposal Event ===== */}
          <TabsContent
            value="proposals"
            forceMount
            className="mt-0 flex-none data-[state=inactive]:hidden"
          >
            {!isLoading && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--wf-ink-muted)]">
                Lampirkan satu berkas proposal (PDF / gambar / DOCX) per event. Proposal tampil di halaman publik /sponsor.
              </p>
              {events.length === 0 && (
                <Empty className="border-2 border-dashed border-[var(--wf-rule)] py-10">
                  <EmptyHeader>
                    <EmptyMedia>
                      <Handshake className="h-10 w-10 text-[var(--wf-ink-muted)]" aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm font-medium text-[var(--wf-ink-muted)]">Belum ada event upcoming</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              )}
              {events.map((item) => (
                <div
                  key={item.event.id}
                  className="group flex items-center gap-3 rounded-xl border border-[var(--wf-rule)] p-3 transition-colors hover:border-[var(--wf-accent)] hover:bg-[var(--wf-accent-soft)]"
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--wf-board-2)]">
                    <FileText className="m-auto mt-3 h-6 w-6 text-[var(--wf-ink-muted)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">
                      {item.event.acara}
                    </p>
                    <p className="text-xs text-[var(--wf-ink-muted)]">
                      {formatDate(item.event.dateStr)}{item.event.lokasi ? ` · ${item.event.lokasi}` : ''}
                    </p>
                    {item.proposal.fileUrl ? (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <a
                          href={item.proposal.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[var(--wf-accent)] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> {item.proposal.fileName || 'Lihat proposal'}
                        </a>
                        {!readOnly && (<>
                        <span className="text-[var(--wf-ink-muted)]">·</span>
                        <Button
                          variant="destructive"
                          type="button"
                          onClick={() => handleDeleteProposal(item)}
                          className="!min-w-0 px-0"
                        >
                          Hapus
                        </Button>
                        </>)}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">Belum ada proposal</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {!readOnly && (<input
                      ref={el => { fileInputRefs.current[item.event.id] = el; }}
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      className="hidden"
                      id={`proposal-file-${item.event.id}`}
                      onChange={(e) => handleProposalSelect(item.event.id, e.target.files?.[0])}
                    />)}
                    {!readOnly && (<Button
                      type="button"
                      onClick={() => document.getElementById(`proposal-file-${item.event.id}`)?.click()}
                      disabled={isUploading}
                      className="px-3.5 py-1.5 text-xs"
                    >
                      {isUploading && uploadingEventId === item.event.id ? (
                        <>
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Mengunggah
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          {item.proposal.fileUrl ? 'Ganti' : 'Unggah'}
                        </>
                      )}
                    </Button>)}
                  </div>
                </div>
              ))}
            </div>
            )}
          </TabsContent>

          {/* ===== TAB 2: Lead Sponsor ===== */}
          <TabsContent
            value="leads"
            forceMount
            className="mt-0 flex-none data-[state=inactive]:hidden"
          >
            {!isLoading && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--wf-ink-muted)]">
                Minat support dari pengunjung halaman /sponsor. Perbarui status saat tim menindaklanjuti.
              </p>
              {leads.length === 0 && (
                <Empty className="border-2 border-dashed border-[var(--wf-rule)] py-10">
                  <EmptyHeader>
                    <EmptyMedia>
                      <Handshake className="h-10 w-10 text-[var(--wf-ink-muted)]" aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm font-medium text-[var(--wf-ink-muted)]">Belum ada lead</EmptyTitle>
                    <EmptyDescription className="text-xs text-[var(--wf-ink-muted)]">Lead muncul saat pengunjung mengirim Minat Support</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-xl border border-[var(--wf-rule)] p-3"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">
                          {lead.companyName}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_CLASSES[lead.status]}`}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
                        {lead.eventAcara || '-'}{lead.eventDate ? ` · ${formatDate(lead.eventDate)}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
                        Narahubung: {lead.contactName || '-'}
                        {lead.phone ? ` · WA: ${lead.phone}` : ''}
                        {lead.email ? ` · ${lead.email}` : ''}
                      </p>
                      {lead.message && (
                        <p className="mt-1.5 rounded-lg bg-[var(--wf-board-2)] px-2.5 py-1.5 text-xs text-[var(--wf-ink-muted)]">
                          "{lead.message}"
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-[var(--wf-ink-muted)]">
                        Diterima {formatLeadDate(lead.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      {readOnly ? (
                        <span className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-2 py-1 text-xs font-medium text-[var(--wf-ink)]">
                          {STATUS_LABELS[lead.status]}
                        </span>
                      ) : (
                        <>
                          <NativeSelect
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead, e.target.value as SponsorLeadStatus)}
                            aria-label={`Status lead ${lead.companyName}`}
                          >
                            {statusOptions.map((s) => (
                              <NativeSelectOption key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          <Button
                            variant="destructive"
                            type="button"
                            onClick={() => handleDeleteLead(lead)}
                            className="!min-w-0 px-0 text-xs"
                          >
                            <Trash2 className="h-3 w-3" /> Hapus
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </TabsContent>
          </Tabs>
        </div>
      </div>
      {confirmDialogEl}
    </div>
  );
}