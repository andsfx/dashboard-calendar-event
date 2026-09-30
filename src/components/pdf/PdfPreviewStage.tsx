import { useEffect, useState } from 'react';
import { ArrowLeft, Download, X } from 'lucide-react';
import { downloadBlob } from '../../lib/download';
import type { PdfExportResult } from './PdfExportOptionsModal';

// ============================================================
// Tahap pratinjau dokumen PDF: iframe + tombol unduh.
//
// Satu implementasi untuk seluruh permukaan ekspor. Object URL dibuat dan
// dilepas di sini — pemanggil hanya menyerahkan hasil generate, sehingga
// tidak ada yang bisa lupa melepasnya (setiap pratinjau menahan satu PDF
// penuh di memori selama URL-nya hidup).
// ============================================================

interface Props {
  result: PdfExportResult;
  /** Kembali ke tahap pemilihan (bukan menutup dialog). */
  onBack: () => void;
  /** Tutup dialog sepenuhnya. */
  onClose: () => void;
  title?: string;
}

export function PdfPreviewStage({ result, onBack, onClose, title = 'Pratinjau PDF' }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(result.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [result]);

  return (
    <div className="flex max-h-[92vh] flex-col overflow-hidden rounded-3xl bg-[var(--brand-card-light)] text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary-700 dark:text-brand-primary-300">
            Laporan PDF
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 truncate text-sm ui-text-muted">
            Cek dulu hasilnya sebelum diunduh — {result.fileName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3 dark:bg-slate-950">
        <iframe
          src={url ?? undefined}
          title="Pratinjau PDF"
          className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-white shadow-inner dark:border-slate-800"
        />
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <button
          type="button"
          onClick={() => downloadBlob(result.blob, result.fileName)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-primary-600/20 transition hover:bg-brand-primary-700"
        >
          <Download className="h-4 w-4" />
          Unduh PDF
        </button>
      </div>
    </div>
  );
}
