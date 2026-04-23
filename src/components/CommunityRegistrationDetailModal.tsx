import { useState, useEffect, useMemo } from 'react';
import { X, Users, Phone, Mail, Globe, Calendar, FileText, MessageCircle, CheckCircle2, XCircle, Eye, Send } from 'lucide-react';
import { CommunityRegistration, RegistrationStatus } from '../types';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  registration: CommunityRegistration | null;
  onUpdateStatus: (id: string, status: RegistrationStatus, adminNote: string) => Promise<boolean>;
}

const WA_TEMPLATES: Record<string, string> = {
  reviewed:
    'Halo {PIC}, pendaftaran komunitas {NAMA} di Metmal Community Space sedang kami review. Kami akan menghubungi kamu dalam 3-5 hari kerja.\n\nSalam,\nTim Metropolitan Mall Bekasi',
  approved:
    'Halo {PIC}, pendaftaran komunitas {NAMA} di Metmal Community Space sudah disetujui! Silakan hubungi kami untuk diskusi jadwal dan kebutuhan event.\n\nSalam,\nTim Metropolitan Mall Bekasi',
  rejected:
    'Halo {PIC}, terima kasih sudah mendaftarkan komunitas {NAMA} di Metmal Community Space. Mohon maaf, saat ini pendaftaran belum bisa kami proses. Silakan hubungi kami untuk info lebih lanjut.\n\nSalam,\nTim Metropolitan Mall Bekasi',
  custom: '',
};

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-700/40 transition hover:bg-slate-100 dark:hover:bg-slate-700/60">
      <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-white break-words">{value || '–'}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RegistrationStatus }) {
  const map: Record<RegistrationStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Pending' },
    reviewed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Reviewed' },
    approved: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Approved' },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Rejected' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export function CommunityRegistrationDetailModal({ isOpen, onClose, registration, onUpdateStatus }: Props) {
  const [adminNote, setAdminNote] = useState('');
  const [waTemplate, setWaTemplate] = useState('reviewed');
  const [waMessage, setWaMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && registration) {
      setAdminNote(registration.adminNote || '');
      setWaTemplate('reviewed');
      setWaMessage(applyVars(WA_TEMPLATES.reviewed, registration));
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
    return tpl.replace(/\{PIC\}/g, reg.pic).replace(/\{NAMA\}/g, reg.communityName);
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
      <div className="rounded-2xl bg-white shadow-2xl dark:bg-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative px-4 pb-5 pt-6 sm:px-6 shrink-0" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.13) 0%, rgba(139,92,246,0.03) 100%)', borderBottom: '3px solid rgba(139,92,246,0.27)' }}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #8b5cf6, rgba(139,92,246,0.27))' }} />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-700"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 pr-8 sm:pr-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="reg-detail-title" className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                Detail Pendaftaran
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{registration.communityName}</p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-5 sm:px-6 space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <InfoItem icon={<Users className="h-4 w-4 text-violet-500" />} label="Nama Komunitas" value={registration.communityName} />
            <InfoItem icon={<FileText className="h-4 w-4 text-blue-500" />} label="Tipe Komunitas" value={registration.communityType} />
            <InfoItem icon={<Users className="h-4 w-4 text-amber-500" />} label="PIC" value={registration.pic} />
            <InfoItem icon={<Phone className="h-4 w-4 text-emerald-500" />} label="Nomor WhatsApp" value={registration.phone} />
            {registration.email && (
              <InfoItem icon={<Mail className="h-4 w-4 text-red-500" />} label="Email" value={registration.email} />
            )}
            {registration.instagram && (
              <InfoItem icon={<Globe className="h-4 w-4 text-pink-500" />} label="Instagram" value={registration.instagram} />
            )}
            {registration.preferredDate && (
              <InfoItem icon={<Calendar className="h-4 w-4 text-cyan-500" />} label="Preferensi Tanggal" value={registration.preferredDate} />
            )}
          </div>

          {/* Deskripsi */}
          {registration.description && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/40">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <FileText className="h-3 w-3" /> Deskripsi
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{registration.description}</p>
            </div>
          )}

          {/* Current Status */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/40">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Status Saat Ini
            </p>
            <StatusBadge status={registration.status} />
          </div>

          {/* Admin Notes */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/40">
            <label className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <FileText className="h-3 w-3" /> Catatan Admin
            </label>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan admin..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-500"
            />
          </div>

          {/* WhatsApp Template */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/40">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <MessageCircle className="h-3 w-3" /> Template WhatsApp
            </p>

            <select
              value={waTemplate}
              onChange={e => setWaTemplate(e.target.value)}
              className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="custom">Custom</option>
            </select>

            <textarea
              value={waMessage}
              onChange={e => { setWaMessage(e.target.value); if (waTemplate !== 'custom') setWaTemplate('custom'); }}
              rows={5}
              className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-500"
            />

            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-600 active:scale-95"
            >
              <Send className="h-4 w-4" /> Kirim via WhatsApp
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:px-6 shrink-0">
          {canReview && (
            <button
              onClick={() => handleStatusChange('reviewed')}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
            >
              <Eye className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses...' : 'Tandai Reviewed'}
            </button>
          )}
          {canApproveReject && (
            <button
              onClick={() => handleStatusChange('approved')}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses...' : 'Approve'}
            </button>
          )}
          {canApproveReject && (
            <button
              onClick={() => handleStatusChange('rejected')}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 active:scale-95 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            >
              <XCircle className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses...' : 'Reject'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
