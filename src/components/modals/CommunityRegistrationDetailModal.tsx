import { useState, useEffect, useMemo } from 'react';
import { X, Users, Phone, Mail, Globe, Calendar, FileText, MessageCircle, CheckCircle2, XCircle, Eye, Send, CalendarPlus, ExternalLink, Link2, Unlink } from 'lucide-react';
import { CommunityRegistration, RegistrationStatus, OrganizationType, EventItem } from '../../types';
import { ModalWrapper } from './ModalWrapper';
import { useConfirmDialog } from './useConfirmDialog';
import { Button } from '../shadcn/button';
import { Label } from '../shadcn/label';
import { NativeSelect, NativeSelectOption } from '../shadcn/native-select';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../shadcn/select';
import { Textarea } from '../shadcn/textarea';
import { fetchAdminEvents, linkRegistrationToEvent, unlinkRegistrationFromEvent } from '../../utils/api/eventsApi';
import { formatDateRange } from '../../utils/eventUtils';
import { useToast } from '../../hooks/useToast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  registration: CommunityRegistration | null;
  onUpdateStatus: (id: string, status: RegistrationStatus, adminNote: string) => Promise<boolean>;
  onCreateEvent?: (registration: CommunityRegistration) => void;
  /**
   * Registrasi ini sudah punya Draft tertaut. Aksi "Buat Draft" dinonaktifkan
   * supaya tidak menghasilkan dua Draft untuk satu pendaftaran (keduanya akan
   * menautkan event yang berbeda ke registrasi yang sama).
   */
  hasLinkedDraft?: boolean;
  /** Akun demo: hanya melihat. Aksi review/approve disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

const WA_TEMPLATES: Record<string, string> = {
  reviewed:
    'Halo {PIC}, pendaftaran {TIPE} {NAMA} di Metmal Community Space sedang ditinjau. Tim Metropolitan Mall Bekasi akan menghubungi kembali setelah proses selesai.\n\nSalam,\nTim Metropolitan Mall Bekasi',
  approved:
    'Halo {PIC}, pendaftaran {TIPE} {NAMA} di Metmal Community Space sudah disetujui. Silakan hubungi kami untuk diskusi jadwal dan kebutuhan event.\n\nSalam,\nTim Metropolitan Mall Bekasi',
  rejected:
    'Halo {PIC}, terima kasih sudah mendaftarkan {TIPE} {NAMA} di Metmal Community Space. Pendaftaran ini belum dapat kami proses. Silakan hubungi kami untuk informasi lebih lanjut.\n\nSalam,\nTim Metropolitan Mall Bekasi',
  custom: '',
};

const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  community: 'Komunitas',
  school: 'Sekolah/Universitas',
  company: 'Perusahaan',
  eo: 'Event Organizer',
  campus: 'Organisasi Kampus',
  government: 'Instansi Pemerintah',
  ngo: 'NGO/Yayasan',
  other: 'Organisasi',
};

const TYPE_SPECIFIC_LABELS: Record<string, string> = {
  communitySubType: 'Tipe Komunitas',
  memberCount: 'Jumlah Anggota',
  socialLinks: 'Media Sosial',
  educationLevel: 'Jenjang Pendidikan',
  institutionType: 'Tipe Institusi',
  studentCount: 'Jumlah Siswa/Mahasiswa',
  advisorName: 'Pembimbing',
  industry: 'Industri',
  employeeCount: 'Jumlah Karyawan',
  eventPurpose: 'Tujuan Event',
  specialization: 'Spesialisasi',
  portfolio: 'Portfolio',
  teamSize: 'Jumlah Tim',
  universityName: 'Universitas',
  faculty: 'Fakultas',
  campusOrgType: 'Jenis Organisasi',
  department: 'Departemen',
  programName: 'Nama Program',
  focusArea: 'Bidang Fokus',
  registrationNumber: 'Nomor Registrasi',
  programDescription: 'Deskripsi Program',
  customOrgType: 'Jenis Organisasi',
  additionalInfo: 'Informasi Tambahan',
};

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[var(--wf-board-2)] p-3.5 transition-colors hover:bg-[var(--wf-board)]">
      <div className="mt-0.5 shrink-0 text-[var(--wf-ink-muted)]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-[var(--wf-ink)] break-words">{value || '-'}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RegistrationStatus }) {
  const map: Record<RegistrationStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-[var(--wf-action)]/10', text: 'text-[var(--wf-action)]', label: 'Menunggu' },
    reviewed: { bg: 'bg-[var(--wf-accent-soft)]', text: 'text-[var(--wf-accent)]', label: 'Direview' },
    approved: { bg: 'bg-[var(--wf-live)]/10', text: 'text-[var(--wf-live)]', label: 'Disetujui' },
    rejected: { bg: 'bg-red-600/10', text: 'text-red-700 dark:text-red-300', label: 'Ditolak' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export function CommunityRegistrationDetailModal({ isOpen, onClose, registration, onUpdateStatus, onCreateEvent, hasLinkedDraft = false, readOnly = false }: Props) {
  const { showToast } = useToast();
  const { confirm, dialog: confirmDialogEl } = useConfirmDialog();
  const [adminNote, setAdminNote] = useState('');
  const [waTemplate, setWaTemplate] = useState('reviewed');
  const [waMessage, setWaMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkEvents, setLinkEvents] = useState<EventItem[]>([]);
  const [isLinkEventsLoading, setIsLinkEventsLoading] = useState(false);
  const [linkEventsError, setLinkEventsError] = useState<string | null>(null);
  const [linkEventId, setLinkEventId] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && registration) {
      setAdminNote(registration.adminNote || '');
      const defaultTemplate = (registration.status in WA_TEMPLATES) ? registration.status : 'reviewed';
      setWaTemplate(defaultTemplate);
      const template = WA_TEMPLATES[defaultTemplate];
      if (template) { setWaMessage(applyVars(template, registration)); }
      setIsSubmitting(false);
    }
  }, [isOpen, registration]);

  // Muat daftar event admin untuk dropdown "Tautkan ke event" saat modal dibuka.
  useEffect(() => {
    if (!isOpen || !registration || registration.status !== 'approved' || readOnly) return;
    let cancelled = false;
    setLinkEvents([]);
    setLinkEventId('');
    setLinkEventsError(null);
    setIsLinkEventsLoading(true);
    fetchAdminEvents()
      .then((rows) => { if (!cancelled) setLinkEvents(rows); })
      .catch((err) => {
        if (cancelled) return;
        console.error('Gagal memuat daftar event untuk tautan registrasi:', err);
        setLinkEvents([]);
        setLinkEventsError('Gagal memuat daftar event.');
      })
      .finally(() => { if (!cancelled) setIsLinkEventsLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, registration, readOnly]);

  // Update WA message when template changes
  useEffect(() => {
    if (!registration) return;
    if (waTemplate === 'custom') return; // don't overwrite custom edits
    setWaMessage(applyVars(WA_TEMPLATES[waTemplate] || '', registration));
  }, [waTemplate, registration]);

  function applyVars(tpl: string, reg: CommunityRegistration): string {
    const orgLabel = ORG_TYPE_LABELS[(reg.organizationType || 'community') as OrganizationType] || 'organisasi';
    return tpl
      .replace(/\{PIC\}/g, reg.pic)
      .replace(/\{NAMA\}/g, reg.organizationName || reg.communityName)
      .replace(/\{TIPE\}/g, orgLabel);
  }

  const handleStatusChange = async (newStatus: RegistrationStatus) => {
    if (!registration || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const ok = await onUpdateStatus(registration.id, newStatus, adminNote);
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!registration) return;
    const phone = registration.phone.replace(/\D/g, '');
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
    window.open(waLink, '_blank');
  };

  // Event yang layak ditautkan: sudah punya tanggal, bukan draft, dan belum
  // tertaut ke registrasi ini (hindari duplikat tautan ke event yang sama).
  const linkableEvents = useMemo(() => {
    if (!registration) return [];
    return linkEvents.filter((ev) =>
      ev.status !== 'draft' &&
      !!ev.dateStr &&
      ev.organizationId !== registration.id,
    );
  }, [linkEvents, registration]);

  const linkedEvents = useMemo(() => {
    if (!registration) return [];
    return linkEvents.filter((ev) => ev.organizationId === registration.id);
  }, [linkEvents, registration]);

  const refreshLinkEvents = async () => {
    setLinkEventsError(null);
    try {
      const rows = await fetchAdminEvents();
      setLinkEvents(rows);
      setLinkEventId('');
    } catch (err) {
      console.error('Gagal memuat ulang daftar event untuk tautan registrasi:', err);
      setLinkEventsError('Gagal memuat daftar event.');
    }
  };

  // Event yang sedang dipilih di dropdown "Tautkan ke event".
  const selectedLinkableEvent = useMemo(() => {
    if (!linkEventId) return undefined;
    return linkEvents.find((ev) => ev.id === linkEventId);
  }, [linkEventId, linkEvents]);

  // Menautkan event milik organisasi LAIN menimpa organization_id-nya. Bukan
  // dilarang — hanya butuh konfirmasi supaya tidak menimpa senyap.
  const overwritingOtherOrg = Boolean(
    selectedLinkableEvent?.organizationId &&
    selectedLinkableEvent.organizationId !== registration?.id,
  );

  const handleLinkEvent = async () => {
    if (!registration || !linkEventId || isLinking) return;
    if (overwritingOtherOrg) {
      const ok = await confirm({
        title: 'Pindahkan tautan event?',
        message: 'Event ini sudah tertaut ke organisasi lain. Menautkan ke registrasi ini akan memindahkan tautannya.',
        confirmLabel: 'Pindahkan tautan',
        tone: 'neutral',
      });
      if (!ok) return;
    }
    setIsLinking(true);
    try {
      await linkRegistrationToEvent(registration.id, linkEventId);
      await refreshLinkEvents();
      showToast('success', 'Event tertaut', 'Registrasi sudah ditautkan ke event.');
    } catch (err) {
      showToast('error', 'Gagal menautkan', err instanceof Error ? err.message : 'Registrasi belum tertaut.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkEvent = async (eventId: string) => {
    if (!registration || isLinking) return;
    setIsLinking(true);
    try {
      await unlinkRegistrationFromEvent(registration.id, eventId);
      await refreshLinkEvents();
      showToast('success', 'Tautan dilepas', 'Registrasi sudah dilepas dari event.');
    } catch (err) {
      showToast('error', 'Gagal melepas', err instanceof Error ? err.message : 'Tautan belum dilepas.');
    } finally {
      setIsLinking(false);
    }
  };

  const canReview = registration?.status === 'pending';
  const canApproveReject = registration?.status === 'pending' || registration?.status === 'reviewed';

  if (!registration) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" ariaLabelledBy="reg-detail-title">
      <div className="rounded-[var(--wf-radius-board)] bg-[var(--wf-board)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative shrink-0 border-b border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] px-4 py-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tutup"
            onClick={onClose}
            className="absolute right-4 top-3"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 pr-8 sm:pr-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="reg-detail-title" className="font-bold text-[var(--wf-ink)]">
                Detail Pendaftaran
              </h2>
              <p className="truncate text-xs text-[var(--wf-ink-muted)]">{registration.organizationName || registration.communityName}</p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-5 sm:px-6 space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <InfoItem icon={<Users className="h-4 w-4 text-[var(--wf-accent)]" />} label="Nama Organisasi" value={registration.organizationName || registration.communityName} />
            <InfoItem icon={<FileText className="h-4 w-4 text-[var(--wf-accent)]" />} label="Tipe Organisasi" value={ORG_TYPE_LABELS[(registration.organizationType || 'community') as OrganizationType] || registration.communityType} />
            <InfoItem icon={<Users className="h-4 w-4 text-[var(--wf-action)]" />} label="PIC" value={registration.pic} />
            <InfoItem icon={<Phone className="h-4 w-4 text-[var(--wf-live)]" />} label="Nomor WhatsApp" value={registration.phone} />
            {registration.email && (
              <InfoItem icon={<Mail className="h-4 w-4 text-red-600 dark:text-red-400" />} label="Email" value={registration.email} />
            )}
            {registration.instagram && (
              <InfoItem icon={<Globe className="h-4 w-4 text-[var(--wf-ink-muted)]" />} label="Instagram" value={registration.instagram} />
            )}
            {registration.preferredDate && (
              <InfoItem icon={<Calendar className="h-4 w-4 text-[var(--wf-ink-muted)]" />} label="Preferensi Tanggal" value={registration.preferredDate} />
            )}
          </div>
          {registration.proposalFileUrl && (
            <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
                <FileText className="h-3 w-3" /> Lampiran Proposal
              </p>
              <a
                href={registration.proposalFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-2 text-sm font-semibold text-[var(--wf-accent)] hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="truncate">{registration.proposalFileName || 'Buka file proposal'}</span>
              </a>
            </div>
          )}

          {/* Type-Specific Data */}
          {registration.typeSpecificData && Object.keys(registration.typeSpecificData).length > 0 && (
            <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
              <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
                <FileText className="h-3 w-3" /> Detail {ORG_TYPE_LABELS[(registration.organizationType || 'community') as OrganizationType]}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(registration.typeSpecificData).map(([key, value]) => {
                  if (!value && value !== 0) return null;
                  const label = TYPE_SPECIFIC_LABELS[key] || key;
                  return (
                    <div key={key} className="rounded-lg bg-[var(--wf-board)] p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">{label}</p>
                      <p className="mt-0.5 text-sm font-medium text-[var(--wf-ink)]">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deskripsi */}
          {registration.description && (
            <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
                <FileText className="h-3 w-3" /> Deskripsi
              </p>
              <p className="text-sm text-[var(--wf-ink)] leading-relaxed whitespace-pre-wrap">{registration.description}</p>
            </div>
          )}

          {/* Current Status */}
          <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
              Status Saat Ini
            </p>
            <StatusBadge status={registration.status} />
          </div>

          {/* Tautkan ke event — hanya untuk registrasi approved */}
          {registration.status === 'approved' && (
            <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
                <Link2 className="h-3 w-3" /> Tautkan ke event
              </p>

              {/* Info event yang sekarang tertaut */}
              {linkedEvents.length > 0 && (
                <div className="space-y-2">
                  {linkedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex flex-col gap-2 rounded-lg bg-[var(--wf-board)] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">Tertaut ke</p>
                        <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">
                          {ev.acara} — {formatDateRange(ev.dateStr, ev.dateEnd)}
                        </p>
                      </div>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlinkEvent(ev.id)}
                          disabled={isLinking}
                          className="shrink-0"
                        >
                          <Unlink className="h-3.5 w-3.5" /> {isLinking ? 'Melepas…' : 'Lepas tautan'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Dropdown event baru + tombol tautkan */}
              {!readOnly && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="reg-link-event" className="block text-xs font-semibold text-[var(--wf-ink-muted)]">Pilih event</Label>
                  {isLinkEventsLoading ? (
                    <p className="text-xs text-[var(--wf-ink-muted)]">Memuat daftar event…</p>
                  ) : linkEventsError ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {/* role="alert" hanya pada teks: live region tidak boleh
                          membungkus tombol — isinya ikut dibacakan dan fokus
                          ke "Coba lagi" memicu ulang pengumuman. */}
                      <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-300">{linkEventsError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { void refreshLinkEvents(); }}
                      >
                        Coba lagi
                      </Button>
                    </div>
                  ) : linkableEvents.length === 0 ? (
                    <p className="text-xs text-[var(--wf-ink-muted)]">Tidak ada event yang bisa ditautkan.</p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select value={linkEventId} onValueChange={setLinkEventId}>
                          <SelectTrigger id="reg-link-event" aria-label="Pilih event" className="w-full sm:flex-1">
                            <SelectValue placeholder="Pilih event" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {linkableEvents.map((ev) => (
                                <SelectItem key={ev.id} value={ev.id}>
                                  {ev.acara} — {formatDateRange(ev.dateStr, ev.dateEnd)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          onClick={handleLinkEvent}
                          disabled={!linkEventId || isLinking}
                          className="shrink-0"
                        >
                          <Link2 className="h-3.5 w-3.5" /> {isLinking ? 'Menautkan…' : 'Tautkan'}
                        </Button>
                      </div>
                      {overwritingOtherOrg && (
                        <p className="text-xs font-semibold text-[var(--wf-action)]" role="status">
                          Event ini sudah tertaut ke organisasi lain. Menautkan akan memindahkan tautan ke registrasi ini.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Admin Notes */}
          <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
            <Label htmlFor="reg-admin-note" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Catatan Admin</Label>
            <Textarea
              id="reg-admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan admin…"
              className="w-full"
            />
          </div>

          {/* WhatsApp Template */}
          {!readOnly && <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
              <MessageCircle className="h-3 w-3" /> Template WhatsApp
            </p>

            <NativeSelect
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              aria-label="Template WhatsApp"
              className="mb-3 w-full"
            >
              <NativeSelectOption value="reviewed">Direview</NativeSelectOption>
              <NativeSelectOption value="approved">Disetujui</NativeSelectOption>
              <NativeSelectOption value="rejected">Ditolak</NativeSelectOption>
              <NativeSelectOption value="custom">Kustom</NativeSelectOption>
            </NativeSelect>

            <Textarea
              value={waMessage}
              onChange={(e) => { setWaMessage(e.target.value); if (waTemplate !== 'custom') setWaTemplate('custom'); }}
              rows={5}
              aria-label="Pesan WhatsApp"
              className="mb-3 w-full"
            />

            <Button
              type="button"
              onClick={handleSendWhatsApp}
            >
              <Send className="h-4 w-4" /> Kirim via WhatsApp
            </Button>
          </div>}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-[var(--wf-rule)] px-4 py-4 sm:flex-row sm:items-center sm:px-6 shrink-0">
          {!readOnly && onCreateEvent && registration?.status === 'approved' && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (registration) {
                  onCreateEvent(registration);
                  onClose();
                }
              }}
              disabled={isSubmitting || hasLinkedDraft}
              title={hasLinkedDraft ? 'Pendaftaran ini sudah punya Draft tertaut di antrean.' : undefined}
              className="flex-1"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> {hasLinkedDraft ? 'Draft sudah dibuat' : 'Buat Draft dari pendaftaran'}
            </Button>
          )}
          {!readOnly && canReview && (
            <Button
              variant="outline"
              type="button"
              onClick={() => handleStatusChange('reviewed')}
              disabled={isSubmitting}
              className="flex-1"
            >
              <Eye className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses…' : 'Tandai Direview'}
            </Button>
          )}
          {!readOnly && canApproveReject && (
            <Button
              type="button"
              onClick={() => handleStatusChange('approved')}
              disabled={isSubmitting}
              className="flex-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses…' : 'Setujui'}
            </Button>
          )}
          {!readOnly && canApproveReject && (
            <Button
              variant="destructive"
              type="button"
              onClick={() => handleStatusChange('rejected')}
              disabled={isSubmitting}
              className="flex-1"
            >
              <XCircle className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses…' : 'Tolak'}
            </Button>
          )}
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="flex-1"
          >
            Tutup
          </Button>
        </div>
      </div>
      {confirmDialogEl}
    </ModalWrapper>
  );
}