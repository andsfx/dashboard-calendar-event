import { useState, useEffect, useMemo } from 'react';
import { X, Users, Phone, Mail, Globe, Calendar, FileText, MessageCircle, CheckCircle2, XCircle, Eye, Send, CalendarPlus, ExternalLink } from 'lucide-react';
import { CommunityRegistration, RegistrationStatus, OrganizationType } from '../types';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  registration: CommunityRegistration | null;
  onUpdateStatus: (id: string, status: RegistrationStatus, adminNote: string) => Promise<boolean>;
  onCreateEvent?: (registration: CommunityRegistration) => void;
  /** Akun demo: hanya melihat. Aksi review/approve disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

const WA_TEMPLATES: Record<string, string> = {
  reviewed:
    'Halo {PIC}, pendaftaran {TIPE} {NAMA} di Metmal Community Space sedang kami review. Kami akan menghubungi kamu segera.\n\nSalam,\nTim Metropolitan Mall Bekasi',
  approved:
    'Halo {PIC}, pendaftaran {TIPE} {NAMA} di Metmal Community Space sudah disetujui! Silakan hubungi kami untuk diskusi jadwal dan kebutuhan event.\n\nSalam,\nTim Metropolitan Mall Bekasi',
  rejected:
    'Halo {PIC}, terima kasih sudah mendaftarkan {TIPE} {NAMA} di Metmal Community Space. Mohon maaf, saat ini pendaftaran belum bisa kami proses. Silakan hubungi kami untuk info lebih lanjut.\n\nSalam,\nTim Metropolitan Mall Bekasi',
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

export function CommunityRegistrationDetailModal({ isOpen, onClose, registration, onUpdateStatus, onCreateEvent, readOnly = false }: Props) {
  const [adminNote, setAdminNote] = useState('');
  const [waTemplate, setWaTemplate] = useState('reviewed');
  const [waMessage, setWaMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const canReview = registration?.status === 'pending';
  const canApproveReject = registration?.status === 'pending' || registration?.status === 'reviewed';

  if (!registration) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" ariaLabelledBy="reg-detail-title">
      <div className="rounded-[var(--wf-radius-board)] bg-[var(--wf-board)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative shrink-0 border-b border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] px-4 py-4 sm:px-6">
          <button
            onClick={onClose}
            className="absolute right-4 top-3 rounded-xl p-2 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)]"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>

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

          {/* Admin Notes */}
          <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
            <label htmlFor="reg-admin-note" className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
              <FileText className="h-3 w-3" /> Catatan Admin
            </label>
            <textarea
              id="reg-admin-note"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan admin…"
              className="w-full rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] transition-colors focus:border-[var(--wf-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--wf-accent)]/20"
            />
          </div>

          {/* WhatsApp Template */}
          {!readOnly && <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-ink-muted)]">
              <MessageCircle className="h-3 w-3" /> Template WhatsApp
            </p>

            <select
              value={waTemplate}
              onChange={e => setWaTemplate(e.target.value)}
              className="mb-3 w-full rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] transition-colors focus:border-[var(--wf-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--wf-accent)]/20"
            >
              <option value="reviewed">Direview</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="custom">Kustom</option>
            </select>

            <textarea
              value={waMessage}
              onChange={e => { setWaMessage(e.target.value); if (waTemplate !== 'custom') setWaTemplate('custom'); }}
              rows={5}
              className="mb-3 w-full rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] transition-colors focus:border-[var(--wf-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--wf-accent)]/20"
            />

            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 rounded-xl bg-[var(--wf-live)] px-4 py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] transition-colors hover:opacity-90 active:scale-95"
            >
              <Send className="h-4 w-4" /> Kirim via WhatsApp
            </button>
          </div>}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-[var(--wf-rule)] px-4 py-4 sm:flex-row sm:items-center sm:px-6 shrink-0">
          {!readOnly && onCreateEvent && registration?.status === 'approved' && (
            <button
              onClick={() => {
                if (registration) {
                  onCreateEvent(registration);
                  onClose();
                }
              }}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] py-2.5 text-sm font-semibold text-[var(--wf-accent)] transition-colors hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Buat Draft dari pendaftaran
            </button>
          )}
          {!readOnly && canReview && (
            <button
              onClick={() => handleStatusChange('reviewed')}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] py-2.5 text-sm font-semibold text-[var(--wf-accent)] transition-colors hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses…' : 'Tandai Direview'}
            </button>
          )}
          {!readOnly && canApproveReject && (
            <button
              onClick={() => handleStatusChange('approved')}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-live)]/10 py-2.5 text-sm font-semibold text-[var(--wf-live)] transition-colors hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses…' : 'Setujui'}
            </button>
          )}
          {!readOnly && canApproveReject && (
            <button
              onClick={() => handleStatusChange('rejected')}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-600/10 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:opacity-90 active:scale-95 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
            >
              <XCircle className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses…' : 'Tolak'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--wf-rule)] py-2.5 text-sm font-medium text-[var(--wf-ink)] transition-colors hover:bg-[var(--wf-board-2)] active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
