import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, RefreshCw } from 'lucide-react';
import { NewsArticle } from '../types';
import { fetchNewsArticles } from '../utils/domainApi';
import { thumbUrl } from '../utils/imageOptim';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { Button } from '../components/shadcn/button';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';
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
    title: 'Berita dan pengumuman - Metropolitan Mall Bekasi',
    description: 'Berita terbaru dan pengumuman resmi dari Metropolitan Mall Bekasi.',
  });

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
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      {/* Header */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 outline-none">
        {/* Page title */}
        <RevealSection as="div" className="mb-10" refreshKey={articles.length}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Berita</h1>
            <p className="mt-2 text-base text-[var(--wf-ink-muted)]">Kabar dan informasi terbaru dari Metropolitan Mall Bekasi</p>
          </div>
        </RevealSection>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-[var(--wf-board)] shadow-sm ">
                <div className="aspect-[16/9] rounded-t-2xl bg-[var(--wf-rule)]" />
                <div className="p-4">
                  <div className="h-4 w-3/4 rounded bg-[var(--wf-rule)]" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-[var(--wf-board-2)]" />
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
            <p className="mt-4 text-lg font-semibold text-[var(--wf-ink-muted)]">Gagal memuat data</p>
            <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">Terjadi kesalahan saat memuat berita. Periksa koneksi internet kamu.</p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-medium text-[var(--wf-accent-ink)] shadow-sm transition hover:bg-[var(--wf-accent)]! h-auto border-0 rounded-full! active:translate-y-0! hover:text-[var(--wf-accent-ink)]!"
            >
              <RefreshCw className="size-4" />
              Coba lagi
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wf-board-2)]">
              <Newspaper className="h-7 w-7 text-[var(--wf-ink-muted)]" />
            </div>
            <p className="mt-4 text-lg font-semibold text-[var(--wf-ink-muted)]">Belum ada berita</p>
            <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">Artikel berita akan muncul di sini.</p>
          </div>
        )}

        {/* Article grid */}
        {!isLoading && !fetchError && articles.length > 0 && (
          <RevealSection as="div" refreshKey={`${articles.length}:${articles[0]?.id ?? ''}`}>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/news/${article.slug}`}
                data-reveal-item
                className="group overflow-hidden rounded-2xl bg-[var(--wf-board)] shadow-sm transition hover:shadow-lg "
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-[var(--wf-rule)]">
                  {article.coverImageUrl ? (
                    <img
                      src={thumbUrl(article.coverImageUrl)}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] motion-reduce:transform-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[var(--wf-board-2)]">
                      <Newspaper className="h-8 w-8 text-[var(--wf-rule-strong)]" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-[var(--wf-ink)] line-clamp-1">{article.title}</p>
                  {article.excerpt && (
                    <p className="mt-1 text-xs leading-5 text-[var(--wf-ink-muted)] line-clamp-2">{article.excerpt}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--wf-ink-muted)]">
                    {article.author && <span>{article.author}</span>}
                    {article.author && (article.publishedAt || article.createdAt) && <span>·</span>}
                    <span>{formatNewsDate(article.publishedAt || article.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          </RevealSection>
        )}
      </main>

      <footer className="border-t border-[var(--wf-rule)] py-8 text-center text-xs text-[var(--wf-ink-muted)]">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
