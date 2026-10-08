import { useEffect, useState } from 'react';
import { ArrowLeft, Download, X } from 'lucide-react';
import { downloadBlob } from '../../lib/download';
import { MdButton, MdIconButton } from '../md';
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
        <MdIconButton
          ariaLabel="Tutup"
          onClick={onClose}
          className="shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </MdIconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3 dark:bg-slate-950">
        <iframe
          src={url ?? undefined}
          title="Pratinjau PDF"
          className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-white shadow-inner dark:border-slate-800"
        />
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
        <MdButton variant="text" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </MdButton>
        <MdButton variant="filled" onClick={() => downloadBlob(result.blob, result.fileName)}>
          <Download className="h-4 w-4" />
          Unduh PDF
        </MdButton>
      </div>
    </div>
  );
}
