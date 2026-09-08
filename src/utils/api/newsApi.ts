import { SupabaseApiError, adminAction, slugify } from './_shared';
import { deleteFromR2 } from './albumsApi';
import { apiGet, ApiError } from '../../lib/rest';
import type { NewsArticle } from '../../types';

// ─── News / Blog ─────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): NewsArticle {
  return {
    id: String(row.id), title: String(row.title), slug: String(row.slug),
    excerpt: String(row.excerpt || ''), content: String(row.content || ''),
    coverImageUrl: String(row.cover_image_url || ''), author: String(row.author || ''),
    status: row.status === 'published' ? 'published' : 'draft',
    publishedAt: row.published_at ? String(row.published_at) : undefined,
    createdAt: String(row.created_at), updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/** Public list — published articles only, newest first (server urut published_at DESC). */
export async function fetchNewsArticles(): Promise<NewsArticle[]> {
  const rows = await apiGet<Record<string, unknown>[]>('/news');
  return (rows || []).map(row => mapRow(row));
}

/** Public single article by slug (published only). Null when not found/error. */
export async function fetchNewsArticleBySlug(slug: string): Promise<NewsArticle | null> {
  try {
    const row = await apiGet<Record<string, unknown>>(`/news/${encodeURIComponent(slug)}`);
    return mapRow(row);
  } catch (err) {
    // Server 404 saat artikel bukan published/tidak ada (mirror .single(): null).
    if (err instanceof ApiError && err.code === '404') return null;
    throw err;
  }
}

/** Admin list — all statuses via service-role proxy. */
export async function fetchAllNewsArticles(): Promise<NewsArticle[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: unknown[] }>('listNewsArticles', {});
  if (!result.success) throw new SupabaseApiError(result.error || 'Fetch news failed');
  return (result.data || []).map(row => mapRow(row as Record<string, unknown>));
}

function newsArticleToDbRow(data: Partial<NewsArticle>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.title !== undefined) row.title = data.title;
  if (data.excerpt !== undefined) row.excerpt = data.excerpt;
  if (data.content !== undefined) row.content = data.content;
  if (data.coverImageUrl !== undefined) row.cover_image_url = data.coverImageUrl;
  if (data.author !== undefined) row.author = data.author;
  if (data.status !== undefined) row.status = data.status;
  return row;
}

export async function createNewsArticle(input: {
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  author: string;
}): Promise<NewsArticle> {
  const slg = slugify(input.title) || `berita-${Date.now()}`;
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>(
    'createNewsArticle', { data: { ...newsArticleToDbRow(input), slug: slg } }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Create news failed');
  return {
    id: result.id || '', title: input.title, slug: slg, excerpt: input.excerpt,
    content: input.content, coverImageUrl: input.coverImageUrl, author: input.author,
    status: 'draft', createdAt: new Date().toISOString(),
  };
}

export async function updateNewsArticle(id: string, data: Partial<NewsArticle>): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>(
    'updateNewsArticle', { id, data: newsArticleToDbRow(data) }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Update news failed');
}

export async function deleteNewsArticle(id: string, coverImageUrl?: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteNewsArticle', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete news failed');
  if (coverImageUrl) await deleteFromR2(coverImageUrl);
}
