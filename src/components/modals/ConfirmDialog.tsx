import { useEffect, useState } from 'react';
import { AlertTriangle, X, Trash2, Handshake } from 'lucide-react';
import { MdButton, MdIconButton } from '../md';
import { ModalWrapper } from './ModalWrapper';

export interface ConfirmOptions {
  /** Judul singkat, mis. "Hapus album?" */
  title: string;
  /** Deskripsi konsekuensi, mis. "Semua foto di dalamnya juga akan dihapus." */
  message: string;
  /** Nama objek yang terdampak (ditampilkan dalam kartu merah). */
  subject?: string;
  /** Label tombol konfirmasi (default "Hapus"). */
  confirmLabel?: string;
  /** Label tombol batal (default "Batal"). */
  cancelLabel?: string;
  /**
   * Nada dialog. 'danger' (default) memakai bahasa destruktif merah untuk
   * aksi hapus; 'neutral' memakai tosca untuk keputusan konsekuensial yang
   * bukan destruktif (mis. setujui/tolak pengajuan), sesuai kontrak modal
   * DESIGN.md: konfirmasi = solid tosca, merah hanya untuk error/destruktif.
   */
  tone?: 'danger' | 'neutral';
}

interface Props extends ConfirmOptions {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * Dialog konfirmasi generik — pengganti window.confirm().
 * Dua nada: 'danger' (default) memakai aksen merah, kartu subjek merah, dan
 * tombol berbahaya, gaya DeleteConfirmModal, untuk aksi destruktif;
 * 'neutral' memakai tosca (konfirmasi solid sesuai DESIGN.md) untuk
 * keputusan konsekuensial yang bukan destruktif.
 */
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, subject, confirmLabel = 'Hapus', cancelLabel = 'Batal', tone = 'danger' }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (isOpen) setIsSubmitting(false);
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNeutral = tone === 'neutral';
  const SubmitIcon = isNeutral ? Handshake : Trash2;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" ariaLabelledBy="confirm-dialog-title">
      <div className="rounded-2xl bg-[var(--brand-card-light)] shadow-2xl overflow-hidden dark:bg-slate-800">
        {/* Aksen bar atas: merah untuk destruktif, tosca untuk keputusan
            netral. Flat fill, no gradient (board language bans multi-stop
            gradients on admin chrome). */}
        <div className={`h-1.5 w-full ${isNeutral ? 'bg-[var(--wf-accent)]' : 'bg-red-600'}`} />

        <div className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isNeutral ? 'bg-[var(--wf-accent-soft)]' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {isNeutral
                ? <Handshake className="h-6 w-6 text-[var(--wf-accent)]" />
                : <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />}
            </div>
            <MdIconButton ariaLabel="Tutup" onClick={onClose} disabled={isSubmitting}>
              <X className="h-4 w-4" />
            </MdIconButton>
          </div>

          <h3 id="confirm-dialog-title" className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mb-1 text-sm ui-text-muted">{message}</p>
          {subject && (
            <div className={`mt-3 rounded-xl border px-4 py-3 ${isNeutral ? 'border-[var(--wf-rule)] bg-[var(--wf-board-2)]' : 'border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10'}`}>
              <p className={`text-sm font-semibold line-clamp-2 ${isNeutral ? 'text-[var(--wf-ink)]' : 'text-red-800 dark:text-red-300'}`}>
                "{subject}"
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <MdButton variant="outlined" onClick={onClose} disabled={isSubmitting} className="flex-1">
            {cancelLabel}
          </MdButton>
          <MdButton variant="filled" danger={!isNeutral} onClick={handleConfirm} disabled={isSubmitting} className="flex-1">
            <SubmitIcon className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses…' : confirmLabel}
          </MdButton>
        </div>
      </div>
    </ModalWrapper>
  );
}

// Hook `useConfirmDialog` TIDAK di-ekspor ulang dari sini: modul ini merender
// md-dialog (→ Material Web + Lit), sedangkan hook dipakai jalur boot dan
// komponen lain yang tidak boleh menyeret MD3. Impor langsung dari
// './useConfirmDialog'.
