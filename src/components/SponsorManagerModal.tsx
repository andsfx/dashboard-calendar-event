import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, Handshake, FileText, ExternalLink } from 'lucide-react';
import type { EventProposalEvent, SponsorLead, SponsorLeadStatus } from '../types';
import {
  fetchSponsorEventsWithProposals,
  fetchAllSponsorLeads,
  updateSponsorLeadStatus,
  deleteSponsorLead,
  setEventProposal,
  deleteEventProposal,
} from '../utils/supabaseApi';
import { ModalWrapper } from './ModalWrapper';
import { ModalHeader } from './ui/ModalHeader';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB — proposal file (PDF/docx/gambar)

const STATUS_LABELS: Record<SponsorLeadStatus, string> = {
  pending: 'Menunggu',
  contacted: 'Dihubungi',
  agreed: 'Sepakat',
  declined: 'Menolak',
};

const STATUS_CLASSES: Record<SponsorLeadStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  contacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  agreed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  declined: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};
export function SponsorManagerModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<'proposals' | 'leads'>('proposals');
  const [events, setEvents] = useState<EventProposalEvent[]>([]);
  const [leads, setLeads] = useState<SponsorLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingEventId, setUploadingEventId] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
    if (isOpen) {
      setTab('proposals');
      setError('');
      setSuccess('');
      loadData();
    }
  }, [isOpen, loadData]);

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
    if (!confirm(`Hapus proposal untuk event "${item.event.acara}"?`)) return;
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
    if (!confirm(`Hapus lead dari "${lead.companyName}"?`)) return;
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
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" ariaLabelledBy="sponsor-manager-title">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--brand-card-light)] shadow-2xl dark:bg-slate-800">
        <ModalHeader
          titleId="sponsor-manager-title"
          title="Sponsorship"
          subtitle="Proposal Event & Minat Support"
          icon={<Handshake />}
          onClose={onClose}
          closeAriaLabel="Tutup"
        />

        <div className="space-y-3 px-4 py-4 sm:px-6">
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700/50">
            <button
              type="button"
              onClick={() => { setTab('proposals'); setError(''); setSuccess(''); }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === 'proposals'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'}`}
            >
              Proposal Event
            </button>
            <button
              type="button"
              onClick={() => { setTab('leads'); setError(''); setSuccess(''); }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === 'leads'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'}`}
            >
              Minat Support ({leads.length})
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
              {success}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary-500 border-t-transparent" />
              <span className="ml-3 text-sm ui-text-muted">Memuat...</span>
            </div>
          )}

          {/* ===== TAB 1: Proposal Event ===== */}
          {tab === 'proposals' && !isLoading && (
            <div className="space-y-2">
              <p className="text-xs ui-text-muted">
                Lampirkan satu berkas proposal (PDF / gambar / DOCX) per event. Proposal tampil di halaman publik /sponsor.
              </p>
              {events.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-600">
                  <Handshake className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
                  <p className="text-sm font-medium ui-text-muted">Belum ada event upcoming</p>
                </div>
              )}
              {events.map((item) => (
                <div
                  key={item.event.id}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-primary-300 hover:bg-brand-primary-50/30 dark:border-slate-600 dark:hover:border-brand-primary-500/50 dark:hover:bg-brand-primary-900/10"
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
                    <FileText className="m-auto mt-3 h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {item.event.acara}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(item.event.dateStr)}{item.event.lokasi ? ` · ${item.event.lokasi}` : ''}
                    </p>
                    {item.proposal.fileUrl ? (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <a
                          href={item.proposal.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-brand-primary-600 hover:underline dark:text-brand-primary-400"
                        >
                          <ExternalLink className="h-3 w-3" /> {item.proposal.fileName || 'Lihat proposal'}
                        </a>
                        <span className="text-slate-400">·</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteProposal(item)}
                          className="font-medium text-rose-500 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Belum ada proposal</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      ref={el => { fileInputRefs.current[item.event.id] = el; }}
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      className="hidden"
                      id={`proposal-file-${item.event.id}`}
                      onChange={(e) => handleProposalSelect(item.event.id, e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById(`proposal-file-${item.event.id}`)?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-tosca-600)] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] disabled:opacity-50"
                    >
                      {isUploading && uploadingEventId === item.event.id ? (
                        <>
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Mengunggah
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          {item.proposal.fileUrl ? 'Ganti' : 'Upload'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===== TAB 2: Lead Sponsor ===== */}
          {tab === 'leads' && !isLoading && (
            <div className="space-y-2">
              <p className="text-xs ui-text-muted">
                Minat support dari pengunjung halaman /sponsor. Perbarui status saat tim menindaklanjuti.
              </p>
              {leads.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-600">
                  <Handshake className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
                  <p className="text-sm font-medium ui-text-muted">Belum ada lead</p>
                  <p className="mt-1 text-xs text-slate-400">Lead muncul saat pengunjung mengirim Minat Support</p>
                </div>
              )}
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-xl border border-slate-200 p-3 dark:border-slate-600"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {lead.companyName}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_CLASSES[lead.status]}`}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {lead.eventAcara || '—'}{lead.eventDate ? ` · ${formatDate(lead.eventDate)}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        PIC: {lead.contactName || '—'}
                        {lead.phone ? ` · WA: ${lead.phone}` : ''}
                        {lead.email ? ` · ${lead.email}` : ''}
                      </p>
                      {lead.message && (
                        <p className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                          "{lead.message}"
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                        Diterima {formatLeadDate(lead.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead, e.target.value as SponsorLeadStatus)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-brand-primary-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteLead(lead)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:underline"
                      >
                        <Trash2 className="h-3 w-3" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
