import { useEffect, useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { EventItem } from '../types';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  event: EventItem | null;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

export function DeleteConfirmModal({ isOpen, event, onClose, onConfirm }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (isOpen) setIsSubmitting(false);
  }, [isOpen, event]);

  if (!event) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const success = await onConfirm();
    if (!success) setIsSubmitting(false);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="rounded-2xl bg-white shadow-2xl dark:bg-slate-800 overflow-hidden">
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
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-slate-700"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Hapus Acara?</h3>
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
            Acara berikut akan dihapus secara permanen:
          </p>
          <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-900/10">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300 line-clamp-2">
              "{event.acara}"
            </p>
            <p className="mt-0.5 text-xs text-red-600/70 dark:text-red-400/70">
              {event.tanggal} · {event.lokasi || 'Tanpa lokasi'}
            </p>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" aria-hidden="true" />
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 text-sm font-semibold text-white shadow transition hover:from-red-700 hover:to-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Trash2 className="h-3.5 w-3.5" /> {isSubmitting ? 'Menghapus...' : 'Hapus Sekarang'}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
