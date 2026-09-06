import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
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
}

interface Props extends ConfirmOptions {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * Dialog konfirmasi generik — pengganti window.confirm().
 * Gaya konsisten dengan DeleteConfirmModal: aksen merah, kartu subjek,
 * tombol Batal/Hapus, state submitting.
 */
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, subject, confirmLabel = 'Hapus', cancelLabel = 'Batal' }: Props) {
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

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" ariaLabelledBy="confirm-dialog-title">
      <div className="rounded-2xl bg-[var(--brand-card-light)] shadow-2xl overflow-hidden dark:bg-slate-800">
        {/* Red accent top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-500" />

        <div className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-slate-700"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 id="confirm-dialog-title" className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mb-1 text-sm ui-text-muted">{message}</p>
          {subject && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-900/10">
              <p className="text-sm font-semibold text-red-800 line-clamp-2 dark:text-red-300">
                "{subject}"
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 text-sm font-semibold text-white shadow transition hover:from-red-700 hover:to-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Trash2 className="h-3.5 w-3.5" /> {isSubmitting ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * Hook konfirmasi promise-based — drop-in untuk window.confirm().
 * const confirmDialog = useConfirmDialog(); ... if (!(await confirmDialog.confirm({...}))) return;
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const requestRef = useRef<ConfirmRequest | null>(null);
  requestRef.current = request;

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    const { promise, resolve } = Promise.withResolvers<boolean>();
    setRequest(prev => {
      // kalau masih ada dialog terbuka, tolak yang lama (anggap batal)
      if (prev) prev.resolve(false);
      return { ...options, resolve };
    });
    return promise;
  }, []);

  const close = useCallback(() => {
    const req = requestRef.current;
    if (req) req.resolve(false);
    setRequest(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    const req = requestRef.current;
    if (!req) return;
    req.resolve(true);
    setRequest(null);
  }, []);

  const dialog = request ? (
    <ConfirmDialog
      isOpen
      title={request.title}
      message={request.message}
      subject={request.subject}
      confirmLabel={request.confirmLabel}
      onClose={close}
      onConfirm={handleConfirm}
    />
  ) : null;

  return { confirm, dialog };
}
