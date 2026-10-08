import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Loader2, X } from 'lucide-react';
import { downloadBlob } from '../../lib/download';
import { MdButton, MdCheckbox, MdIconButton } from '../md';
import { ModalWrapper } from '../modals/ModalWrapper';

// ============================================================
// Pemilih bagian dokumen PDF + pratinjau sebelum unduh.
//
// Dipakai bersama oleh ekspor Jadwal Event, Album Foto, dan Hasil
// Evaluasi Tenant supaya perilaku "pilih bagian" konsisten di seluruh
// aplikasi (satu komponen, satu gaya, satu aturan minimum).
//
// Dua tahap: **pilih** lalu **pratinjau**. `onGenerate` yang mengembalikan
// blob menahan hasilnya sebagai pratinjau; dokumen baru benar-benar
// terunduh setelah pengguna menekan "Unduh PDF". Sebelumnya tiap permukaan
// mengunduh langsung, jadi salah setelan berarti unduhan terbuang dan harus
// diulang dari awal.
// ============================================================

export interface PdfSectionOption {
  /** Kunci stabil yang dipakai builder untuk memutuskan apa yang digambar. */
  id: string;
  label: string;
  hint?: string;
}

/** Hasil generate yang siap dipratinjau: blob + nama berkas unduhannya. */
export interface PdfExportResult {
  blob: Blob;
  fileName: string;
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
  /**
   * Membuat dokumen. Mengembalikan blob untuk menampilkan tahap pratinjau;
   * mengembalikan `undefined` (atau tidak mengembalikan apa pun) berarti
   * dokumen sudah ditangani sendiri oleh pemanggil dan modal langsung tutup.
   */
  onGenerate: (selected: string[]) => void | Promise<void | PdfExportResult>;
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
  generateLabel = 'Preview PDF',
  canGenerate: canGenerateProp,
}: Props) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [preview, setPreview] = useState<PdfExportResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const wasOpen = useRef(false);

  // Reset pilihan setiap kali modal dibuka, bukan saat ditutup — supaya
  // tidak ada kedipan konten lama sebelum animasi keluar selesai.
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setSelected(defaultSelected);
      setErrorMessage('');
      setIsGenerating(false);
      setPreview(null);
    }
    wasOpen.current = isOpen;
  }, [isOpen, defaultSelected]);

  // Object URL dilepas saat pratinjau berganti maupun saat modal ditutup.
  // Tanpa ini setiap pratinjau menahan satu PDF penuh di memori.
  useEffect(() => {
    if (!preview) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(preview.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preview]);

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
      const result = await onGenerate(selected);
      if (result) setPreview(result);
      else onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal membuat PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    downloadBlob(preview.blob, preview.fileName);
  };

  if (!isOpen) return null;

  const isPreviewStage = preview !== null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={isPreviewStage ? 'max-w-6xl' : 'max-w-xl'}
      ariaLabelledBy="pdf-export-options-title"
    >
      <div className="flex max-h-[92vh] flex-col overflow-hidden rounded-3xl bg-[var(--brand-card-light)] text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary-700 dark:text-brand-primary-300">
              Laporan PDF
            </p>
            <h2 id="pdf-export-options-title" className="mt-1 text-xl font-bold tracking-tight">
              {isPreviewStage ? 'Pratinjau PDF' : title}
            </h2>
            <p className="mt-1 text-sm ui-text-muted">
              {isPreviewStage
                ? `Cek dulu hasilnya sebelum diunduh — ${preview.fileName}`
                : description}
            </p>
          </div>
          <MdIconButton
            ariaLabel="Tutup"
            onClick={onClose}
            disabled={isGenerating}
            className="shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </MdIconButton>
        </div>

        {/* Body yang menggulir, bukan seluruh panel: footer tetap terlihat
            sehingga tombol aksi selalu terjangkau tanpa menggulir dulu. */}
        {isPreviewStage ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3 dark:bg-slate-950">
            <iframe
              src={previewUrl ?? undefined}
              title="Pratinjau PDF"
              className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-white shadow-inner dark:border-slate-800"
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {children}

            <fieldset disabled={isGenerating} className="min-w-0 space-y-2">
              <legend className="sr-only">Bagian yang diekspor</legend>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Bagian yang diekspor
                </span>
                <MdButton
                  variant="text"
                  onClick={() => setSelected(allSelected ? [...requiredSections] : sections.map((section) => section.id))}
                >
                  {allSelected ? 'Kosongkan' : 'Pilih semua'}
                </MdButton>
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
                      <MdCheckbox
                        checked={isChecked}
                        disabled={isRequired}
                        onChange={() => toggle(section.id)}
                        className="mt-0.5 shrink-0"
                      />
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
        )}

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
          {isPreviewStage ? (
            <>
              <MdButton key="preview-back" variant="text" onClick={() => setPreview(null)}>
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </MdButton>
              <MdButton key="preview-download" variant="filled" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Unduh PDF
              </MdButton>
            </>
          ) : (
            <>
              <MdButton key="select-cancel" variant="text" onClick={onClose} disabled={isGenerating}>
                Batal
              </MdButton>
              <MdButton key="select-generate" variant="filled" onClick={handleGenerate} disabled={!canGenerate}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isGenerating ? 'Menyiapkan…' : generateLabel}
              </MdButton>
            </>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
