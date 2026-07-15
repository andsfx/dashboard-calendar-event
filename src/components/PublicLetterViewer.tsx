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
      <div className="flex min-h-screen items-center justify-center ui-dashboard-page dark:bg-slate-900">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 animate-pulse text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">Memuat surat...</p>
        </div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="flex min-h-screen items-center justify-center ui-dashboard-page dark:bg-slate-900 p-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-lg dark:border-red-800 dark:bg-slate-800">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
            Surat Tidak Ditemukan
          </h1>
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            {error || 'Surat yang Anda cari tidak tersedia.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 mx-auto"
          >
            <ArrowLeft size={16} />
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
    <div className="min-h-screen ui-dashboard-page dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Surat Konfirmasi Event
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
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
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download size={16} />
            Unduh PDF
          </button>
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="mx-auto max-w-7xl p-4">
        {pdfSrc ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700">
            <iframe
              src={pdfSrc}
              className="h-[calc(100vh-120px)] w-full"
              title={`Surat - ${letter.letterData.namaEvent}`}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <FileText size={48} className="mx-auto mb-4 text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400">
              PDF tidak tersedia untuk surat ini.
            </p>
            <button
              onClick={handleDownload}
              className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 mx-auto"
            >
              <Download size={16} />
              Generate & Unduh PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}