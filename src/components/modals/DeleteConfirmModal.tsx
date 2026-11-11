import { useEffect, useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { EventItem } from '../../types';
import { Button } from '../shadcn/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '../shadcn/alert-dialog';

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
    <AlertDialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent
        className="w-full max-w-sm bg-transparent p-0 ring-0 shadow-none outline-none"
        style={{ width: 'min(24rem, calc(100vw - 2rem))', maxWidth: '100%' }}
      >
        <div className="rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)] overflow-hidden">
          {/* Red accent top bar */}
          <div className="h-1.5 w-full bg-red-600 dark:bg-red-500" />

          <div className="p-6">
            <div className="mb-5 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10">
                <AlertTriangle className="h-6 w-6 text-red-700 dark:text-red-300" />
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Tutup" onClick={onClose} disabled={isSubmitting}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <AlertDialogTitle asChild>
              <h3 className="mb-2 text-lg font-bold text-[var(--wf-ink)]">Hapus Acara?</h3>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <p className="mb-1 text-sm text-[var(--wf-ink-muted)]">
                Acara berikut akan dihapus secara permanen:
              </p>
            </AlertDialogDescription>
            <div className="mt-3 rounded-xl border border-red-200 bg-red-600/10 px-4 py-3 dark:border-red-800">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300 line-clamp-2">
                "{event.acara}"
              </p>
              <p className="mt-0.5 text-xs text-red-600/70 dark:text-red-300/70">
                {event.tanggal} · {event.lokasi || 'Tanpa lokasi'}
              </p>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--wf-ink-muted)]">
              <AlertTriangle className="h-3 w-3 shrink-0 text-[var(--wf-action)]" aria-hidden="true" />
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>

          <div className="flex gap-3 border-t border-[var(--wf-rule)] px-6 py-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting} className="flex-1">
              <Trash2 className="h-3.5 w-3.5" /> {isSubmitting ? 'Menghapus…' : 'Hapus Sekarang'}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
