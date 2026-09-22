import { useEffect, useState } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import { AnnualTheme } from '../types';
import { ModalWrapper } from './ModalWrapper';
import { ModalHeader } from './ui/ModalHeader';

const COLOR_OPTIONS = [
  { value: '#00918e', label: 'Tosca' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#ef4444', label: 'Rose' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#00554c', label: 'Tosca Gelap' },
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
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" ariaLabelledBy="annual-theme-title">
      <div className="overflow-hidden rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)]">
        <ModalHeader
          titleId="annual-theme-title"
          title={editingTheme ? 'Ubah Tema Tahunan' : 'Tambah Tema Tahunan'}
          subtitle='Kelola tema yang tampil di bagian Tema Tahunan.'
          icon={<CalendarDays />}
          onClose={onClose}
          closeDisabled={isSubmitting}
          closeAriaLabel="Tutup"
        />

        <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4 sm:px-6">
          <div>
            <label htmlFor="annual-theme-name" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Nama Tema <span className="text-red-500" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span></label>
            <input id="annual-theme-name" value={form.name} onChange={e => { setForm(prev => ({ ...prev, name: e.target.value })); setErrors(prev => ({ ...prev, name: '' })); }} className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition-colors focus:ring-2 ${errors.name ? 'border-red-400 focus:ring-red-100' : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'}`} />
            {errors.name && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="annual-theme-date-start" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Tanggal Mulai <span className="text-red-500" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span></label>
              <input id="annual-theme-date-start" type="date" value={form.dateStart} onChange={e => { setForm(prev => ({ ...prev, dateStart: e.target.value })); setErrors(prev => ({ ...prev, dateStart: '' })); }} className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition-colors focus:ring-2 dark:[color-scheme:dark] ${errors.dateStart ? 'border-red-400 focus:ring-red-100' : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'}`} />
              {errors.dateStart && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{errors.dateStart}</p>}
            </div>
            <div>
              <label htmlFor="annual-theme-date-end" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Tanggal Selesai <span className="text-red-500" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span></label>
              <input id="annual-theme-date-end" type="date" value={form.dateEnd} onChange={e => { setForm(prev => ({ ...prev, dateEnd: e.target.value })); setErrors(prev => ({ ...prev, dateEnd: '' })); }} className={`w-full rounded-xl border bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none transition-colors focus:ring-2 dark:[color-scheme:dark] ${errors.dateEnd ? 'border-red-400 focus:ring-red-100' : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent-soft)]'}`} />
              {errors.dateEnd && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{errors.dateEnd}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Warna Tema <span className="text-red-500" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span></label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {COLOR_OPTIONS.map(option => {
                const isSelected = form.color === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setForm(prev => ({ ...prev, color: option.value })); setErrors(prev => ({ ...prev, color: '' })); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${isSelected ? 'border-[var(--wf-ink)] ring-2 ring-[var(--wf-rule)]' : 'border-[var(--wf-rule)] hover:border-[var(--wf-rule-strong)]'}`}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: option.value }} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.color && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{errors.color}</p>}
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 rounded-xl border border-[var(--wf-rule)] py-2 text-sm font-medium text-[var(--wf-ink)] transition-colors hover:bg-[var(--wf-board-2)] disabled:cursor-not-allowed disabled:opacity-70">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--wf-accent)] py-2 text-sm font-semibold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)] disabled:cursor-not-allowed disabled:opacity-70">
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Menyimpan…' : editingTheme ? 'Simpan Tema' : 'Tambah Tema'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
