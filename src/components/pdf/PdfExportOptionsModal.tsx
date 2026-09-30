import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, Loader2, X } from 'lucide-react';
import { ModalWrapper } from '../modals/ModalWrapper';

// ============================================================
// Pemilih bagian dokumen PDF.
//
// Dipakai bersama oleh ekspor Jadwal Event, Album Foto, dan Hasil
// Evaluasi Tenant supaya perilaku "pilih bagian" konsisten di seluruh
// aplikasi (satu komponen, satu gaya, satu aturan minimum).
// ============================================================

export interface PdfSectionOption {
  /** Kunci stabil yang dipakai builder untuk memutuskan apa yang digambar. */
  id: string;
  label: string;
  hint?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  sections: PdfSectionOption[];
  /** Default pilihan saat modal dibuka. */
  defaultSelected: string[];
  /** Bagian yang wajib ada; tidak bisa dimatikan. */
  requiredSections?: string[];
  onGenerate: (selected: string[]) => void | Promise<void>;
  /** Kontrol tambahan di bawah daftar bagian (mis. filter album). */
  children?: React.ReactNode;
  generateLabel?: string;
  /** Paksa tombol unduh nonaktif (mis. tidak ada item yang dipilih). */
  canGenerate?: boolean;
}

export function PdfExportOptionsModal({
  isOpen,
  onClose,
  title,
  description,
  sections,
  defaultSelected,
  requiredSections = [],
  onGenerate,
  children,
  generateLabel = 'Unduh PDF',
  canGenerate: canGenerateProp,
}: Props) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const wasOpen = useRef(false);

  // Reset pilihan setiap kali modal dibuka, bukan saat ditutup — supaya
  // tidak ada kedipan konten lama sebelum animasi keluar selesai.
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setSelected(defaultSelected);
      setErrorMessage('');
      setIsGenerating(false);
    }
    wasOpen.current = isOpen;
  }, [isOpen, defaultSelected]);

  const toggle = useCallback((id: string) => {
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );
  }, []);

  const selectable = sections.filter((section) => !requiredSections.includes(section.id));
  const allSelected = selectable.every((section) => selected.includes(section.id));
  const canGenerate = selected.length > 0 && !isGenerating && (canGenerateProp ?? true);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setErrorMessage('');
    try {
      await onGenerate(selected);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal membuat PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl" ariaLabelledBy="pdf-export-options-title">
      <div className="flex max-h-[92vh] flex-col overflow-hidden rounded-3xl bg-[var(--brand-card-light)] text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary-700 dark:text-brand-primary-300">
              Laporan PDF
            </p>
            <h2 id="pdf-export-options-title" className="mt-1 text-xl font-bold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm ui-text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body yang menggulir, bukan seluruh panel: footer tetap terlihat
            sehingga "Unduh PDF" selalu terjangkau tanpa menggulir dulu. */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {children}

          <fieldset disabled={isGenerating} className="min-w-0 space-y-2">
            <legend className="sr-only">Bagian yang diekspor</legend>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Bagian yang diekspor
              </span>
              <button
                type="button"
                onClick={() => setSelected(allSelected ? [...requiredSections] : sections.map((section) => section.id))}
                className="text-xs font-semibold text-brand-primary-700 transition hover:text-brand-primary-800 disabled:opacity-50 dark:text-brand-primary-300 dark:hover:text-brand-primary-200"
              >
                {allSelected ? 'Kosongkan' : 'Pilih semua'}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {sections.map((section) => {
                const isRequired = requiredSections.includes(section.id);
                const isChecked = selected.includes(section.id);
                return (
                  <label
                    key={section.id}
                    className={`flex items-start gap-3 rounded-2xl border p-3 transition ${
                      isRequired
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-70 dark:border-slate-800 dark:bg-slate-950'
                        : 'cursor-pointer'
                    } ${
                      isChecked && !isRequired
                        ? 'border-brand-primary-500 bg-brand-primary-50 dark:border-brand-primary-500 dark:bg-brand-primary-500/15'
                        : !isRequired
                          ? 'border-slate-200 bg-[var(--brand-card)] hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950'
                          : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      name={`pdf-section-${section.id}`}
                      checked={isChecked}
                      disabled={isRequired}
                      onChange={() => toggle(section.id)}
                    />
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        isChecked
                          ? 'border-brand-primary-600 bg-brand-primary-600 text-white'
                          : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
                      }`}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                        {section.label}
                      </span>
                      <span className="mt-0.5 block text-xs ui-text-muted">
                        {isRequired ? 'Selalu disertakan' : section.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {errorMessage && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-primary-600/20 transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isGenerating ? 'Menyiapkan…' : generateLabel}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
