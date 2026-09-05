import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Newspaper, RefreshCw, SunMedium } from 'lucide-react';
import { NewsArticle } from '../types';
import { fetchNewsArticles } from '../utils/supabaseApi';
import { thumbUrl } from '../utils/imageOptim';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { usePageMeta } from '../utils/pageMeta';

function formatNewsDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

export function NewsIndexPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Berita & Pengumuman — Metropolitan Mall Bekasi',
    description: 'Berita terbaru dan pengumuman resmi dari Metropolitan Mall Bekasi.',
  });

  const navigate = useNavigate();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFetchError(false);
    fetchNewsArticles()
      .then((data) => { if (!cancelled) setArticles(data); })
      .catch(() => {
        if (!cancelled) { setArticles([]); setFetchError(true); }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [retryCount]);

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
            <button
              type="button"
              onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />Kembali
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Page title */}
        <div className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Berita</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Semua Berita</h1>
          <p className="mt-2 text-base ui-text-muted">Kabar dan informasi terbaru dari Metropolitan Mall Bekasi</p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                <div className="aspect-[16/9] rounded-t-2xl bg-slate-200 dark:bg-slate-700" />
                <div className="p-4">
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-700/60" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && fetchError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <RefreshCw className="h-7 w-7 text-red-500 dark:text-red-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Gagal memuat data</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Terjadi kesalahan saat memuat berita. Periksa koneksi internet Anda.</p>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Newspaper className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Belum ada berita</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Artikel berita akan muncul di sini.</p>
          </div>
        )}

        {/* Article grid */}
        {!isLoading && !fetchError && articles.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/news/${article.slug}`}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg dark:bg-slate-800"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-200 dark:bg-slate-700">
                  {article.coverImageUrl ? (
                    <img
                      src={thumbUrl(article.coverImageUrl)}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] motion-reduce:transform-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-100 dark:bg-slate-700">
                      <Newspaper className="h-8 w-8 text-slate-300 dark:text-slate-500" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-slate-800 line-clamp-1 dark:text-white">{article.title}</p>
                  {article.excerpt && (
                    <p className="mt-1 text-xs leading-5 text-slate-600 line-clamp-2 dark:text-slate-400">{article.excerpt}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {article.author && <span>{article.author}</span>}
                    {article.author && (article.publishedAt || article.createdAt) && <span>·</span>}
                    <span>{formatNewsDate(article.publishedAt || article.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life
      </footer>
    </div>
  );
}
