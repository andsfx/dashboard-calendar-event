import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { EventItem } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  event: EventItem | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({ isOpen, event, onClose, onConfirm }: DeleteConfirmModalProps) {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Hapus Acara?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Anda akan menghapus acara:</p>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-6 px-4">"{event.acara}"</p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
