import { useState, useEffect } from 'react';
import { ArrowRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewsArticle } from '../../types';
import { fetchNewsArticles } from '../../utils/supabaseApi';
import { RevealSection, CommunityEyebrow } from './CommunityRevealPrimitives';
import { thumbUrl } from '../../utils/imageOptim';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

function formatNewsDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function SkeletonNews() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="text-center">
        <div className="mx-auto h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-4 h-9 w-72 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-3 h-4 w-96 max-w-full rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
      <div className="mt-10">
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
              <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-2 p-3 sm:p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-700/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CommunityNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchNewsArticles()
      .then((data) => { if (!cancelled) setArticles(data); })
      .catch(() => { if (!cancelled) setArticles([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <RevealSection
      id="news"
      className="border-b border-black/5 bg-white px-4 py-16 dark:border-slate-800 dark:bg-slate-950 sm:px-6 sm:py-24 lg:py-32"
      skeleton={<SkeletonNews />}
      isLoading={isLoading}
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <CommunityEyebrow>Berita</CommunityEyebrow>
          <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Kabar terbaru dari Metmal.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Update kegiatan, promo, dan informasi seputar Metropolitan Mall Bekasi
          </p>
        </div>

        {articles.length > 0 && (
          <div className="mt-10 sm:mt-14 lg:mt-16">
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
              {articles.slice(0, 3).map((article) => (
                <Link
                  key={article.id}
                  to={`/news/${article.slug}`}
                  className={`group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg dark:bg-slate-800 ${focusRing}`}
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
                      <div className="flex h-full items-center justify-center bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_30%,black)]">
                        <Newspaper className="h-8 w-8 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1 dark:text-white">{article.title}</p>
                    {article.excerpt && (
                      <p className="mt-1 text-xs leading-5 text-slate-600 line-clamp-2 dark:text-slate-300">{article.excerpt}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <span>{formatNewsDate(article.publishedAt || article.createdAt)}</span>
                      <span className="font-semibold text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]">Baca selengkapnya →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6">
              <Link
                to="/news"
                className={`inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
              >
                <Newspaper className="h-4 w-4" aria-hidden="true" />
                Lihat Semua Berita
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}

        {!isLoading && articles.length === 0 && (
          <div className="mt-10 text-center sm:mt-14">
            <p className="text-base text-slate-500 dark:text-slate-300">Belum ada berita.</p>
          </div>
        )}
      </div>
    </RevealSection>
  );
}
