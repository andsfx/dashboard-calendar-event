import { useEffect, useState } from 'react';
import { AlertTriangle, X, Trash2, Handshake } from 'lucide-react';
import { Button } from '../shadcn/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '../shadcn/alert-dialog';

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
   * aksi irreversibel; 'neutral' memakai tosca (konfirmasi solid sesuai
   * DESIGN.md) untuk keputusan konsekuensial yang bukan destruktif.
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
    <AlertDialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent
        className="w-full max-w-sm bg-transparent p-0 ring-0 shadow-none outline-none"
        style={{ width: 'min(24rem, calc(100vw - 2rem))', maxWidth: '100%' }}
      >
 <div className="rounded-2xl bg-[var(--wf-board)] shadow-2xl overflow-hidden">
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
              <Button variant="ghost" size="icon-sm" aria-label="Tutup" onClick={onClose} disabled={isSubmitting}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <AlertDialogTitle asChild>
              <h3 className="mb-2 text-lg font-bold text-[var(--wf-ink)] ">{title}</h3>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <p className="mb-1 text-sm text-[var(--wf-ink-muted)]">{message}</p>
            </AlertDialogDescription>
            {subject && (
              <div className={`mt-3 rounded-xl border px-4 py-3 ${isNeutral ? 'border-[var(--wf-rule)] bg-[var(--wf-board-2)]' : 'border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10'}`}>
                <p className={`text-sm font-semibold line-clamp-2 ${isNeutral ? 'text-[var(--wf-ink)]' : 'text-red-800 dark:text-red-300'}`}>
                  "{subject}"
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-[var(--wf-rule)] px-6 py-4 ">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1">
              {cancelLabel}
            </Button>
            <Button variant={isNeutral ? 'default' : 'destructive'} onClick={handleConfirm} disabled={isSubmitting} className="flex-1">
              <SubmitIcon className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses…' : confirmLabel}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook `useConfirmDialog` TIDAK di-ekspor ulang dari sini: modul ini merender
// `AlertDialog` (Radix), yang ringan (tanpa Material Web + Lit); hook tetap
// dipakai jalur boot dan komponen lain. Impor langsung dari './useConfirmDialog'.
