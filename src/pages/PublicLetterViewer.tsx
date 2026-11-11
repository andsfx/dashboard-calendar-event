import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, AlertCircle, FileText } from 'lucide-react';
import { GeneratedLetter, LetterDocument } from '../types';
import { apiGet } from '../lib/rest';
import { downloadBlob, safeFileName } from '../lib/download';
import { downloadLetterPdf } from '../utils/letterPdfExport';
import { downloadSikPdf } from '../utils/sikPdfExport';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { Button } from '../components/shadcn/button';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

/**
 * Public viewer page for shared generated letters.
 * Accessible via /letter/:id
 * Shows the PDF inline with a download button.
 */
export function PublicLetterViewer({ isDark, onToggleDark }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [letter, setLetter] = useState<GeneratedLetter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('ID surat tidak valid');
      setIsLoading(false);
      return;
    }

    const fetchLetter = async () => {
      try {
        // GET /api/v1/letters/:id — publik, status='active' saja (server 404 lainnya).
        const data = await apiGet<Record<string, unknown>>(`/letters/${encodeURIComponent(id)}`);
        // Server tidak pernah mengirim kolom `doc_type` (docType hidup di
        // `letter_data` JSONB); fallback baris lama → 'ske'.
        const letterData = data.letter_data as LetterDocument | undefined;
        const docType: GeneratedLetter['docType'] =
          letterData?.docType === 'sik' ? 'sik' : 'ske';
        setLetter({
          id: String(data.id ?? ''),
          eventId: (data.event_id as string) || undefined,
          draftEventId: (data.draft_event_id as string) || undefined,
          docType,
          letterData: letterData as LetterDocument,
          pdfUrl: (data.pdf_url as string) || undefined,
          pdfBase64: (data.pdf_base64 as string) || undefined,
          createdAt: String(data.created_at ?? new Date().toISOString()),
          status: ((data.status as GeneratedLetter['status']) || 'active'),
        });
      } catch {
        // 404 atau gagal jaringan — pesan sama, jangan bocorkan alasannya.
        setLetter(null);
        setError('Surat yang Anda cari tidak tersedia.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLetter();
  }, [id]);

  const handleDownload = async () => {
    if (!letter) return;
    try {
      // Snapshot server (sudah ter-render) menang: tidak perlu render ulang di browser.
      if (letter.pdfBase64) {
        const binary = atob(letter.pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const nomor = safeFileName(letter.letterData.nomorSurat, 'surat');
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${nomor}.pdf`);
        return;
      }
      if (letter.letterData.docType === 'sik') {
        await downloadSikPdf(letter.letterData);
      } else {
        await downloadLetterPdf(letter.letterData);
      }
    } catch (err) {
      console.error('Download failed:', err);
      setError('Gagal mengunduh PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--wf-page)]">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 animate-pulse text-[var(--brand-tosca-soft)] motion-reduce:animate-none" />
          <p className="text-[var(--wf-ink-muted)]">Memuat surat…</p>
        </div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="min-h-screen bg-[var(--wf-page)]">
        <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />
        <main id="konten-utama" tabIndex={-1} className="flex justify-center p-4 outline-none">
          <div className="mt-12 max-w-md rounded-2xl border border-red-200 bg-[var(--wf-board)] p-6 text-center shadow-[var(--shadow-card-soft)]">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-500" aria-hidden />
            <h1 className="mb-2 text-xl font-bold text-[var(--wf-ink)]">
              Surat Tidak Ditemukan
            </h1>
            <p className="mb-4 text-[var(--wf-ink-muted)]">
              {error || 'Surat yang Anda cari tidak tersedia.'}
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/')}
              className="ui-btn-primary ui-focus-ring mx-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--wf-page)] flex! h-auto border-0 rounded-full! active:translate-y-0!"
            >
              <ArrowLeft size={16} aria-hidden />
              Kembali ke Beranda
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const pdfSrc = letter.pdfBase64 
    ? `data:application/pdf;base64,${letter.pdfBase64}`
    : letter.pdfUrl;

  return (
    <div className="min-h-screen bg-[var(--wf-page)]">
      <PublicSiteHeader
        isDark={isDark}
        onToggleDark={onToggleDark}
        actions={
          <Button
            type="button"
            variant="ghost"
            onClick={handleDownload}
            className="ui-focus-ring inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-black/8! px-3 py-2 text-[13px] md:text-[13px] font-semibold text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)]! h-auto rounded-full! leading-normal active:translate-y-0! hover:text-[var(--wf-ink-muted)]!"
          >
            <Download size={16} aria-hidden />
            Unduh PDF
          </Button>
        }
      />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-7xl px-4 pt-6 pb-4 outline-none sm:px-6">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-[var(--wf-ink)] sm:text-xl">
            {letter.docType === 'sik' ? 'Surat Izin Kerja' : 'Surat Konfirmasi Event'}
          </h1>
          <p className="text-xs text-[var(--wf-ink-muted)]">
            {letter.letterData.namaEvent || 'Tanpa Judul'} &middot;
            Dibuat {new Date(letter.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>

        {pdfSrc ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--wf-board)] shadow-[var(--shadow-card-soft)] ">
            {/* Ruang non-PDF: header 64 px + pt-6 24 px + pb-4 16 px + judul dan
                subjudul 44 px + mb-4 16 px = 164 px, dibulatkan ke 168 px
                (`10.5rem`) supaya tidak ada scroll halaman. */}
            <iframe
              src={pdfSrc}
              className="h-[calc(100dvh-10.5rem)] w-full"
              title={`Surat - ${letter.letterData.namaEvent}`}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--wf-board)] p-8 text-center shadow-[var(--shadow-card-soft)]">
            <FileText size={48} className="mx-auto mb-4 text-[var(--wf-ink-muted)]" aria-hidden />
            <p className="text-[var(--wf-ink-muted)]">
              PDF tidak tersedia untuk surat ini.
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDownload}
              className="ui-btn-primary ui-focus-ring mx-auto mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--wf-page)] flex! h-auto border-0 rounded-full! active:translate-y-0!"
            >
              <Download size={16} aria-hidden />
              Buat & Unduh PDF
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
