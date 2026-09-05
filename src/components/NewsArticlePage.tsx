import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Moon, Newspaper, RefreshCw, SunMedium } from 'lucide-react';
import { NewsArticle } from '../types';
import { fetchNewsArticleBySlug } from '../utils/supabaseApi';
import { usePageMeta } from '../utils/pageMeta';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

function formatNewsDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

export function NewsArticlePage({ isDark, onToggleDark }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  usePageMeta({
    title: article ? `${article.title} — Berita Metropolitan Mall Bekasi` : 'Berita & Pengumuman — Metropolitan Mall Bekasi',
    description: article?.excerpt || 'Berita terbaru dan pengumuman resmi dari Metropolitan Mall Bekasi.',
  });


  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setIsLoading(true);
    setFetchError(false);
    fetchNewsArticleBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        if (data) setArticle(data);
        else setFetchError(true);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug, retryCount]);

  return (
    <div className="ui-dashboard-page min-h-screen bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <header className="ui-dashboard-chrome sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
            <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">Berita</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleDark}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/news"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />Kembali
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="animate-pulse">
            <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-4 h-9 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-700/60" />
            <div className="mt-8 aspect-[16/9] rounded-2xl bg-slate-200 dark:bg-slate-700" />
          </div>
        )}

        {/* Error / not found */}
        {!isLoading && (fetchError || !article) && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Newspaper className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Berita tidak ditemukan.</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Artikel mungkin sudah dihapus atau belum diterbitkan.</p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                to="/news"
                className="inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Berita
              </Link>
              {fetchError && (
                <button
                  onClick={() => setRetryCount(c => c + 1)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Coba lagi
                </button>
              )}
            </div>
          </div>
        )}

        {/* Article */}
        {!isLoading && article && (
          <article>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Berita</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              {article.author && <span className="font-medium text-slate-700 dark:text-slate-300">{article.author}</span>}
              {article.author && (article.publishedAt || article.createdAt) && <span>·</span>}
              <span>{formatNewsDate(article.publishedAt || article.createdAt)}</span>
            </div>

            {article.coverImageUrl && (
              <img
                src={article.coverImageUrl}
                alt={article.title}
                className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-sm"
              />
            )}

            {article.content && (
              <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-slate-700 dark:text-slate-300">
                {article.content}
              </div>
            )}

            <div className="mt-12 border-t border-slate-200 pt-6 dark:border-slate-800">
              <Link
                to="/news"
                className="inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Berita
              </Link>
            </div>
          </article>
        )}
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life
      </footer>
    </div>
  );
}
