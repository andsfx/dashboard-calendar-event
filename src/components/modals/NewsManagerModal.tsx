import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, Upload, Save, Newspaper, ChevronLeft, Pencil, AlertCircle, RefreshCw, Eye, EyeOff, Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Quote } from 'lucide-react';
import { NewsArticle } from '../../types';
import { fetchAllNewsArticles, createNewsArticle, updateNewsArticle, deleteNewsArticle, uploadToR2 } from '../../utils/domainApi';
import { adminThumbUrl } from '../../utils/imageOptim';
import { useConfirmDialog } from './useConfirmDialog';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { Textarea } from '../shadcn/textarea';
import { MarkdownBody } from '../shared/MarkdownBody';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '../shadcn/empty';

interface Props {
  /** Akun demo: hanya melihat. Tombol mutasi disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const labelClass = 'mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]';

export function NewsManagerModal({ readOnly = false }: Props) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editing, setEditing] = useState<NewsArticle | null>(null);

  // Editor form
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [author, setAuthor] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const { confirm, dialog: confirmDialogEl } = useConfirmDialog();

  const wrapSelection = (before: string, after = before, placeholder = 'teks') => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = content.slice(start, end) || placeholder;
    const next = `${content.slice(0, start)}${before}${selected}${after}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + before.length;
      el.setSelectionRange(cursorStart, cursorStart + selected.length);
    });
  };

  const prefixLines = (prefix: string | ((i: number) => string), placeholder = 'item') => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const lineStart = content.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const lineEndIdx = content.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;
    const block = content.slice(lineStart, lineEnd) || placeholder;
    const lines = block.split('\n');
    const prefixed = lines.map((line, i) => {
      const p = typeof prefix === 'function' ? prefix(i) : prefix;
      return line.startsWith(p) ? line.slice(p.length) : `${p}${line}`;
    }).join('\n');
    const next = `${content.slice(0, lineStart)}${prefixed}${content.slice(lineEnd)}`;
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + prefixed.length);
    });
  };

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAllNewsArticles();
      setArticles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat berita');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
    setView('list');
    setEditing(null);
    setError('');
  }, [loadArticles]);

  const clearForm = () => {
    setTitle('');
    setExcerpt('');
    setContent('');
    setAuthor('');
    setCoverImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCreate = () => {
    clearForm();
    setEditing(null);
    setView('edit');
    setError('');
  };

  const startEdit = (article: NewsArticle) => {
    setEditing(article);
    setTitle(article.title);
    setExcerpt(article.excerpt);
    setContent(article.content);
    setAuthor(article.author);
    setCoverImageUrl(article.coverImageUrl);
    setView('edit');
    setError('');
  };

  const handleCoverSelect = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File cover harus berupa gambar.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran file cover maksimal 10MB.');
      return;
    }
    setIsUploading(true);
    setError('');
    try {
      const url = await uploadToR2(file, 'news/');
      setCoverImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah cover');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Judul wajib diisi');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const input = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        coverImageUrl,
        author: author.trim() || 'Marcomm Metropolitan Mall Bekasi',
      };
      if (editing) {
        await updateNewsArticle(editing.id, input);
      } else {
        await createNewsArticle(input);
      }
      setView('list');
      setEditing(null);
      clearForm();
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan artikel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublish = async (article: NewsArticle) => {
    setIsLoading(true);
    setError('');
    try {
      const next = article.status === 'published' ? 'draft' : 'published';
      await updateNewsArticle(article.id, { status: next });
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (article: NewsArticle) => {
    const ok = await confirm({
      title: 'Hapus artikel?',
      message: 'Artikel akan dihapus permanen beserta cover image.',
      subject: article.title,
    });
    if (!ok) return;
    setIsLoading(true);
    setError('');
    try {
      await deleteNewsArticle(article.id, article.coverImageUrl);
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus artikel');
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToList = () => {
    setView('list');
    setEditing(null);
    clearForm();
    setError('');
    loadArticles();
  };

  const formatDate = (value?: string): string => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="wf-page space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {view === 'edit' && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Kembali"
              onClick={goBackToList}
              className="mt-1"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            {view === 'edit' && (
              <h2 className="truncate text-base font-bold text-[var(--wf-ink)]">
                {editing ? 'Edit Artikel' : 'Artikel Baru'}
              </h2>
            )}
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--wf-accent)]">
          <Newspaper className="h-4 w-4 text-[var(--wf-accent-ink)]" />
        </div>
      </header>

      <div className="rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board)]">

        <div className="space-y-3 px-4 py-4 sm:px-6">
          {/* Error message */}
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-600/20 bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p>{error}</p>
                <Button variant="ghost" type="button" onClick={loadArticles} className="mt-2 underline underline-offset-2">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Coba lagi
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div role="status" className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--wf-rule)] border-t-[var(--wf-accent)]" aria-hidden="true" />
              <span className="ml-3 text-sm text-[var(--wf-ink-muted)]">Memuat…</span>
            </div>
          )}

          {/* ===== VIEW 1: Article List ===== */}
          {view === 'list' && !isLoading && (
            <>
              {!readOnly && (
                <Button
                  variant="default"
                  type="button"
                  onClick={startCreate}
                  className="w-full"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Artikel
                </Button>
              )}

              {articles.length === 0 && (
                <Empty className="border border-[var(--wf-rule)] py-10">
                  <EmptyHeader>
                    <EmptyMedia>
                      <Newspaper className="h-10 w-10 text-[var(--wf-ink-muted)]" aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm font-medium text-[var(--wf-ink-muted)]">Belum ada artikel</EmptyTitle>
                    <EmptyDescription className="text-xs text-[var(--wf-ink-muted)]">Buat artikel pertama untuk mulai mengelola berita</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}

              {articles.length > 0 && (
                <div className="space-y-2">
                  {articles.map((article) => (
                    <div
                      key={article.id}
                      className="group flex items-center gap-3 rounded-xl border border-[var(--wf-rule)] p-3 transition-colors hover:border-[var(--wf-accent)] hover:bg-[var(--wf-accent-soft)]"
                    >
                      {/* Cover thumbnail */}
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--wf-board-2)]">
                        {article.coverImageUrl ? (
                          <img
                            src={adminThumbUrl(article.coverImageUrl)}
                            alt={article.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = article.coverImageUrl; }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Newspaper className="h-5 w-5 text-[var(--wf-ink-muted)]" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">
                          {article.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--wf-ink-muted)]">
                          <span
                            className={
                              article.status === 'published'
                                ? 'rounded-full bg-[var(--wf-live)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-live)]'
                                : 'rounded-full bg-[var(--wf-action)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-action)]'
                            }
                          >
                            {article.status === 'published' ? 'Terbit' : 'Draf'}
                          </span>
                          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        {!readOnly && (<>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${article.title}`}
                          onClick={() => startEdit(article)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={article.status === 'published' ? 'ghost' : 'outline'}
                          type="button"
                          onClick={() => handleTogglePublish(article)}
                          className="px-2 py-1.5 text-xs"
                        >
                          {article.status === 'published' ? 'Tarik Terbit' : 'Terbitkan'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Hapus ${article.title}`}
                          onClick={() => handleDelete(article)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== VIEW 2: Editor ===== */}
          {view === 'edit' && !isLoading && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="news-title" className={labelClass}>Judul *</Label>
                <Input
                  id="news-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Judul artikel"
                  aria-label="Judul"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="news-excerpt" className={labelClass}>Ringkasan</Label>
                <Textarea
                  id="news-excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Ringkasan singkat artikel (opsional)"
                  rows={2}
                  aria-label="Ringkasan"
                  className="w-full"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Label htmlFor="news-content" className="block text-xs font-semibold text-[var(--wf-ink-muted)]">Isi Artikel</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={showPreview}
                    onClick={() => setShowPreview((prev) => !prev)}
                    className="h-auto gap-1.5 px-2 py-1 text-xs font-medium text-[var(--wf-ink-muted)] active:translate-y-0 hover:text-[var(--wf-ink)]"
                  >
                    {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPreview ? 'Kembali sunting' : 'Pratinjau'}
                  </Button>
                </div>
                {showPreview ? (
                  <div className="min-h-[8rem] w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-page)] px-4 py-4 sm:px-6">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">Pratinjau artikel</p>
                    {title.trim() && (
                      <h2 className="text-2xl font-bold tracking-tight text-[var(--wf-ink)] sm:text-3xl">{title}</h2>
                    )}
                    {author.trim() && (
                      <p className="mt-2 text-sm text-[var(--wf-ink-muted)]">{author}</p>
                    )}
                    {coverImageUrl && (
                      <img
                        src={coverImageUrl}
                        alt={title || 'Cover artikel'}
                        className="mt-4 h-auto w-full rounded-xl border border-[var(--wf-rule)] object-contain"
                      />
                    )}
                    <div className="mt-4">
                      {content.trim() ? (
                        <MarkdownBody content={content} />
                      ) : (
                        <p className="text-sm text-[var(--wf-ink-muted)]">Belum ada isi untuk dipratinjau.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-2 py-1.5">
                      <Button type="button" variant="ghost" size="icon" aria-label="Judul 2" title="Judul 2" onClick={() => prefixLines('## ', 'Judul')} className="h-8 w-8 active:translate-y-0"><Heading2 className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Judul 3" title="Judul 3" onClick={() => prefixLines('### ', 'Subjudul')} className="h-8 w-8 active:translate-y-0"><Heading3 className="h-4 w-4" /></Button>
                      <span className="mx-1 h-5 w-px bg-[var(--wf-rule)]" aria-hidden="true" />
                      <Button type="button" variant="ghost" size="icon" aria-label="Tebal" title="Tebal" onClick={() => wrapSelection('**', '**', 'tebal')} className="h-8 w-8 active:translate-y-0"><Bold className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Miring" title="Miring" onClick={() => wrapSelection('*', '*', 'miring')} className="h-8 w-8 active:translate-y-0"><Italic className="h-4 w-4" /></Button>
                      <span className="mx-1 h-5 w-px bg-[var(--wf-rule)]" aria-hidden="true" />
                      <Button type="button" variant="ghost" size="icon" aria-label="Daftar" title="Daftar" onClick={() => prefixLines('- ', 'item')} className="h-8 w-8 active:translate-y-0"><List className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Daftar bernomor" title="Daftar bernomor" onClick={() => prefixLines((i) => `${i + 1}. `, 'item')} className="h-8 w-8 active:translate-y-0"><ListOrdered className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Kutipan" title="Kutipan" onClick={() => prefixLines('> ', 'kutipan')} className="h-8 w-8 active:translate-y-0"><Quote className="h-4 w-4" /></Button>
                      <span className="mx-1 h-5 w-px bg-[var(--wf-rule)]" aria-hidden="true" />
                      <Button type="button" variant="ghost" size="icon" aria-label="Tautan" title="Tautan" onClick={() => wrapSelection('[', '](https://)', 'teks tautan')} className="h-8 w-8 active:translate-y-0"><Link2 className="h-4 w-4" /></Button>
                    </div>
                    <Textarea
                      ref={contentRef}
                      id="news-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Tulis isi artikel di sini…"
                      rows={10}
                      aria-label="Isi Artikel"
                      className="w-full rounded-t-none border-t-0"
                    />
                    <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
                      Gunakan toolbar atau Markdown: <code className="rounded bg-[var(--wf-board-2)] px-1">##</code> judul, <code className="rounded bg-[var(--wf-board-2)] px-1">**tebal**</code>, <code className="rounded bg-[var(--wf-board-2)] px-1">-</code> daftar.
                    </p>
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="news-author" className={labelClass}>Penulis</Label>
                <Input
                  id="news-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Marcomm Metropolitan Mall Bekasi"
                  aria-label="Penulis"
                  className="w-full"
                />
              </div>

              {/* Cover */}
              <div>
                <Label className={labelClass}>Cover</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleCoverSelect(e.target.files?.[0])}
                  disabled={isUploading}
                />
                {coverImageUrl ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-xl border border-[var(--wf-rule)]">
                      <img src={coverImageUrl} alt="Cover artikel" className="h-auto w-full object-contain" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="h-auto gap-1.5 px-3 py-1.5 text-xs active:translate-y-0"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {isUploading ? 'Mengunggah…' : 'Ganti cover'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => { setCoverImageUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        disabled={isUploading}
                        className="h-auto gap-1.5 px-3 py-1.5 text-xs text-[var(--wf-danger)] active:translate-y-0"
                      >
                        <X className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex h-auto w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--wf-rule)] bg-transparent py-6 text-sm font-medium text-[var(--wf-ink-muted)] transition-colors hover:border-[var(--wf-accent)] hover:bg-transparent hover:text-[var(--wf-accent)] active:translate-y-0"
                  >
                    <Upload className="h-5 w-5" />
                    {isUploading ? 'Mengunggah…' : 'Pilih gambar cover'}
                  </Button>
                )}
                <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
                  Format gambar, maksimal 10MB. Ukuran tampil mengikuti rasio asli materi.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  type="button"
                  onClick={goBackToList}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!title.trim() || isUploading}
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan Artikel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {confirmDialogEl}
    </div>
  );
}