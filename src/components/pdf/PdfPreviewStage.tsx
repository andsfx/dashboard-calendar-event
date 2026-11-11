import { useEffect, useState } from 'react';
import { ArrowLeft, Download, X } from 'lucide-react';
import { downloadBlob } from '../../lib/download';
import { Button } from '../shadcn/button';
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
 <div className="flex max-h-[92vh] flex-col overflow-hidden rounded-3xl bg-[var(--wf-board)] text-[var(--wf-ink)] shadow-2xl ">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--wf-rule)] px-6 py-5 ">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--wf-accent)] ">
            Laporan PDF
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 truncate text-sm text-[var(--wf-ink-muted)]">
            Cek dulu hasilnya sebelum diunduh — {result.fileName}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Tutup"
          onClick={onClose}
          className="shrink-0 text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)]"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--wf-board)] p-3">
        <iframe
          src={url ?? undefined}
          title="Pratinjau PDF"
          className="h-[70vh] w-full rounded-2xl border border-[var(--wf-rule)] bg-white shadow-inner "
        />
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[var(--wf-rule)] px-6 py-5 sm:flex-row sm:justify-end ">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <Button onClick={() => downloadBlob(result.blob, result.fileName)}>
          <Download className="h-4 w-4" />
          Unduh PDF
        </Button>
      </div>
    </div>
  );
}
