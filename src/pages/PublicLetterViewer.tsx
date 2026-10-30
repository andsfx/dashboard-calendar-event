import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, AlertCircle, FileText } from 'lucide-react';
import { GeneratedLetter, LetterRequestItem } from '../types';
import { apiGet } from '../lib/rest';
import { downloadLetterPdf } from '../utils/letterPdfExport';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';

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
        setLetter({
          id: String(data.id ?? ''),
          eventId: (data.event_id as string) || undefined,
          draftEventId: (data.draft_event_id as string) || undefined,
          letterData: data.letter_data as LetterRequestItem,
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
      await downloadLetterPdf(letter.letterData);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Gagal mengunduh PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-paper)] dark:bg-slate-950">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 animate-pulse text-[var(--brand-tosca-soft)] motion-reduce:animate-none" />
          <p className="text-slate-600 dark:text-slate-300">Memuat surat…</p>
        </div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="min-h-screen bg-[var(--brand-paper)] dark:bg-slate-950">
        <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />
        <main id="konten-utama" tabIndex={-1} className="flex justify-center p-4 outline-none">
          <div className="mt-12 max-w-md rounded-2xl border border-red-200 bg-[var(--brand-card-light)] p-6 text-center shadow-[var(--shadow-card-soft)] dark:border-red-800 dark:bg-slate-800">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-500" aria-hidden />
            <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
              Surat Tidak Ditemukan
            </h1>
            <p className="mb-4 text-slate-600 dark:text-slate-300">
              {error || 'Surat yang Anda cari tidak tersedia.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="ui-btn-primary ui-focus-ring mx-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-tosca-dark)]"
            >
              <ArrowLeft size={16} aria-hidden />
              Kembali ke Beranda
            </button>
          </div>
        </main>
      </div>
    );
  }

  const pdfSrc = letter.pdfBase64 
    ? `data:application/pdf;base64,${letter.pdfBase64}`
    : letter.pdfUrl;

  return (
    <div className="min-h-screen bg-[var(--brand-paper)] dark:bg-slate-950">
      <PublicSiteHeader
        isDark={isDark}
        onToggleDark={onToggleDark}
        actions={
          <button
            type="button"
            onClick={handleDownload}
            className="ui-btn-primary ui-focus-ring flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-tosca-dark)]"
          >
            <Download size={16} aria-hidden />
            Unduh PDF
          </button>
        }
      />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-7xl px-4 pt-6 pb-4 outline-none sm:px-6">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
            Surat Konfirmasi Event
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {letter.letterData.namaEvent || 'Tanpa Judul'} &middot;
            Dibuat {new Date(letter.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>

        {pdfSrc ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-[var(--shadow-card-soft)] dark:border-slate-700">
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
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--brand-card-light)] p-8 text-center shadow-[var(--shadow-card-soft)] dark:border-slate-700 dark:bg-slate-800">
            <FileText size={48} className="mx-auto mb-4 text-slate-500" aria-hidden />
            <p className="text-slate-600 dark:text-slate-300">
              PDF tidak tersedia untuk surat ini.
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="ui-btn-primary ui-focus-ring mx-auto mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-tosca-dark)]"
            >
              <Download size={16} aria-hidden />
              Buat & Unduh PDF
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
