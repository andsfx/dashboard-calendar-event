import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Newspaper, RefreshCw } from 'lucide-react';
import { NewsArticle } from '../types';
import { fetchNewsArticleBySlug } from '../utils/domainApi';
import { usePageMeta } from '../utils/pageMeta';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';

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
    title: article ? `${article.title} - Berita Metropolitan Mall Bekasi` : 'Berita & Pengumuman - Metropolitan Mall Bekasi',
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
    <div className="ui-dashboard-page min-h-screen bg-[var(--brand-paper)] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 outline-none">
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
              <Newspaper className="h-7 w-7 text-slate-500 dark:text-slate-300" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Berita tidak ditemukan.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Artikel mungkin sudah dihapus atau belum diterbitkan.</p>
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
          <RevealSection as="article" refreshKey={`${article.id}:${article.slug}`}>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-300">
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
          </RevealSection>
        )}
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 dark:text-slate-400 dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
