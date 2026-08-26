import { supabase } from '../../lib/supabase';
import { SupabaseApiError, adminAction, slugify } from './_shared';
import { deleteFromR2 } from './albumsApi';
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

/** Public list — published articles only, newest first (max 50). */
export async function fetchNewsArticles(): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);
  if (error) throw new SupabaseApiError(`Fetch news failed: ${error.message}`);
  return (data || []).map(row => mapRow(row as Record<string, unknown>));
}

/** Public single article by slug (published only). Null when not found/error. */
export async function fetchNewsArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
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
