import { useEffect, useState } from 'react';
import { CalendarDays, Save, X } from 'lucide-react';
import { AnnualTheme } from '../types';
import { ModalWrapper } from './ModalWrapper';

const COLOR_OPTIONS = [
  { value: '#6366f1', label: 'Violet' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#ef4444', label: 'Rose' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#f97316', label: 'Orange' },
];

const EMPTY = {
  name: '',
  dateStart: '',
  dateEnd: '',
  color: COLOR_OPTIONS[0]?.value ?? '#3b82f6',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AnnualTheme) => Promise<boolean>;
  editingTheme: AnnualTheme | null;
}

export function AnnualThemeCrudModal({ isOpen, onClose, onSave, editingTheme }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingTheme) {
      setForm({
        name: editingTheme.name,
        dateStart: editingTheme.dateStart,
        dateEnd: editingTheme.dateEnd,
        color: editingTheme.color,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setIsSubmitting(false);
  }, [editingTheme, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Nama tema wajib diisi';
    if (!form.dateStart) nextErrors.dateStart = 'Tanggal mulai wajib diisi';
    if (!form.dateEnd) nextErrors.dateEnd = 'Tanggal selesai wajib diisi';
    if (form.dateStart && form.dateEnd && form.dateEnd < form.dateStart) {
      nextErrors.dateEnd = 'Tanggal selesai tidak boleh sebelum tanggal mulai';
    }
    if (!form.color) nextErrors.color = 'Warna tema wajib dipilih';
    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    const success = await onSave({
      id: editingTheme?.id || `theme-${Date.now()}`,
      sheetRow: editingTheme?.sheetRow,
      name: form.name,
      dateStart: form.dateStart,
      dateEnd: form.dateEnd,
      color: form.color,
    });
    if (!success) {
      setIsSubmitting(false);
      return;
    }
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">{editingTheme ? 'Edit Tema Tahunan' : 'Tambah Tema Tahunan'}</p>
              <p className="text-xs text-slate-400">Kelola tema yang tampil di section Tema Tahunan.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-5 sm:px-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Tema <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => { setForm(prev => ({ ...prev, name: e.target.value })); setErrors(prev => ({ ...prev, name: '' })); }} className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.name ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Date Start <span className="text-red-500">*</span></label>
              <input type="date" value={form.dateStart} onChange={e => { setForm(prev => ({ ...prev, dateStart: e.target.value })); setErrors(prev => ({ ...prev, dateStart: '' })); }} className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${errors.dateStart ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`} />
              {errors.dateStart && <p className="mt-1 text-xs text-red-500">{errors.dateStart}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Date End <span className="text-red-500">*</span></label>
              <input type="date" value={form.dateEnd} onChange={e => { setForm(prev => ({ ...prev, dateEnd: e.target.value })); setErrors(prev => ({ ...prev, dateEnd: '' })); }} className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${errors.dateEnd ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`} />
              {errors.dateEnd && <p className="mt-1 text-xs text-red-500">{errors.dateEnd}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Warna Tema <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {COLOR_OPTIONS.map(option => {
                const isSelected = form.color === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setForm(prev => ({ ...prev, color: option.value })); setErrors(prev => ({ ...prev, color: '' })); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${isSelected ? 'border-slate-900 ring-2 ring-slate-200 dark:border-white dark:ring-slate-600' : 'border-slate-200 hover:border-slate-300 dark:border-slate-600'}`}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: option.value }} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.color && <p className="mt-1 text-xs text-red-500">{errors.color}</p>}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-violet-900/30">
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Menyimpan...' : editingTheme ? 'Simpan Tema' : 'Tambah Tema'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
