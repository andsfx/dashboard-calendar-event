import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GeneratedLetter } from '../types';
import { downloadLetterPdf } from '../utils/letterPdfExport';

/**
 * Public viewer page for shared generated letters.
 * Accessible via /letter/:id
 * Shows the PDF inline with a download button.
 */
export function PublicLetterViewer() {
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
        const { data, error: fetchError } = await supabase
          .from('generated_letters')
          .select('*')
          .eq('id', id)
          .eq('status', 'active')
          .single();

        if (fetchError) throw new Error(fetchError.message);
        if (!data) throw new Error('Surat tidak ditemukan atau telah dihapus');

        setLetter({
          id: data.id,
          eventId: data.event_id || undefined,
          draftEventId: data.draft_event_id || undefined,
          letterData: data.letter_data,
          pdfUrl: data.pdf_url || undefined,
          pdfBase64: data.pdf_base64 || undefined,
          createdAt: data.created_at,
          createdBy: data.created_by || undefined,
          status: data.status,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memuat surat';
        setError(message);
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
          <p className="text-slate-600 dark:text-slate-400">Memuat surat...</p>
        </div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-paper)] p-4 dark:bg-slate-950">
        <div className="max-w-md rounded-2xl border border-red-200 bg-[var(--brand-card-light)] p-6 text-center shadow-[var(--shadow-card-soft)] dark:border-red-800 dark:bg-slate-800">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
            Surat Tidak Ditemukan
          </h1>
          <p className="mb-4 text-slate-600 dark:text-slate-400">
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
      </div>
    );
  }

  const pdfSrc = letter.pdfBase64 
    ? `data:application/pdf;base64,${letter.pdfBase64}`
    : letter.pdfUrl;

  return (
    <div className="min-h-screen bg-[var(--brand-paper)] dark:bg-slate-950">
      <header className="ui-dashboard-chrome sticky top-0 z-10 border-b shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="ui-focus-ring rounded-full p-2 ui-text-muted transition hover:bg-[var(--brand-card)] hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} aria-hidden />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                Surat Konfirmasi Event
              </h1>
              <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                {letter.letterData.namaEvent || 'Tanpa Judul'} ·
                Dibuat {new Date(letter.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="ui-btn-primary ui-focus-ring flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-tosca-dark)]"
          >
            <Download size={16} aria-hidden />
            Unduh PDF
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4">
        {pdfSrc ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-[var(--shadow-card-soft)] dark:border-slate-700">
            <iframe
              src={pdfSrc}
              className="h-[calc(100vh-120px)] w-full"
              title={`Surat - ${letter.letterData.namaEvent}`}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--brand-card-light)] p-8 text-center shadow-[var(--shadow-card-soft)] dark:border-slate-700 dark:bg-slate-800">
            <FileText size={48} className="mx-auto mb-4 text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400">
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
      </div>
    </div>
  );
}