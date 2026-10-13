import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, Upload, Save, Newspaper, ChevronLeft, Pencil, AlertCircle, RefreshCw } from 'lucide-react';
import { NewsArticle } from '../../types';
import { fetchAllNewsArticles, createNewsArticle, updateNewsArticle, deleteNewsArticle, uploadToR2 } from '../../utils/domainApi';
import { adminThumbUrl } from '../../utils/imageOptim';
import { useConfirmDialog } from './useConfirmDialog';
import { MdButton, MdIconButton, MdTextField } from '../md';

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
  const [author, setAuthor] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog: confirmDialogEl } = useConfirmDialog();

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
            <MdIconButton
              ariaLabel="Kembali"
              onClick={goBackToList}
              className="mt-1"
            >
              <ChevronLeft className="h-4 w-4" />
            </MdIconButton>
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
                <MdButton variant="text" onClick={loadArticles} className="mt-2 underline underline-offset-2">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Coba lagi
                </MdButton>
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
                <MdButton
                  variant="outlined"
                  onClick={startCreate}
                  className="w-full"
                >
                  <Plus className="h-4 w-4" />
                  Buat Artikel Baru
                </MdButton>
              )}

              {articles.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--wf-rule)] py-10">
                  <Newspaper className="mb-3 h-10 w-10 text-[var(--wf-ink-muted)]" />
                  <p className="text-sm font-medium text-[var(--wf-ink-muted)]">Belum ada artikel</p>
                  <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">Buat artikel pertama untuk mulai mengelola berita</p>
                </div>
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
                            {article.status === 'published' ? 'Terbit' : 'Draft'}
                          </span>
                          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        {!readOnly && (<>
                        <MdIconButton
                          ariaLabel={`Edit ${article.title}`}
                          onClick={() => startEdit(article)}
                        >
                          <Pencil className="h-4 w-4" />
                        </MdIconButton>
                        <MdButton
                          variant={article.status === 'published' ? 'text' : 'filled'}
                          onClick={() => handleTogglePublish(article)}
                          className="px-2 py-1.5 text-xs"
                        >
                          {article.status === 'published' ? 'Tarik Terbit' : 'Terbitkan'}
                        </MdButton>
                        <MdIconButton
                          ariaLabel={`Hapus ${article.title}`}
                          onClick={() => handleDelete(article)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </MdIconButton>
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
                <label htmlFor="news-title" className={labelClass}>Judul *</label>
                <MdTextField
                  id="news-title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Judul artikel"
                  ariaLabel="Judul"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="news-excerpt" className={labelClass}>Ringkasan</label>
                <MdTextField
                  id="news-excerpt"
                  type="textarea"
                  value={excerpt}
                  onChange={setExcerpt}
                  placeholder="Ringkasan singkat artikel (opsional)"
                  rows={2}
                  ariaLabel="Ringkasan"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="news-content" className={labelClass}>Isi Artikel</label>
                <MdTextField
                  id="news-content"
                  type="textarea"
                  value={content}
                  onChange={setContent}
                  placeholder="Tulis isi artikel di sini…"
                  rows={8}
                  ariaLabel="Isi Artikel"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="news-author" className={labelClass}>Penulis</label>
                <MdTextField
                  id="news-author"
                  value={author}
                  onChange={setAuthor}
                  placeholder="Marcomm Metropolitan Mall Bekasi"
                  ariaLabel="Penulis"
                  className="w-full"
                />
              </div>

              {/* Cover */}
              <div>
                <label className={labelClass}>Cover</label>
                {coverImageUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-[var(--wf-rule)]">
                    <img src={coverImageUrl} alt="Cover artikel" className="aspect-[16/9] w-full object-cover" />
                    <MdIconButton
                      ariaLabel="Hapus cover"
                      onClick={() => { setCoverImageUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute right-2 top-2"
                    >
                      <X className="h-4 w-4" />
                    </MdIconButton>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--wf-rule)] py-6 text-sm font-medium text-[var(--wf-ink-muted)] transition-colors hover:border-[var(--wf-accent)] hover:text-[var(--wf-accent)]">
                    <Upload className="h-5 w-5" />
                    {isUploading ? 'Mengunggah…' : 'Pilih gambar cover'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => handleCoverSelect(e.target.files?.[0])}
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <MdButton
                  variant="outlined"
                  onClick={goBackToList}
                >
                  Batal
                </MdButton>
                <MdButton
                  onClick={handleSave}
                  disabled={!title.trim() || isUploading}
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan Artikel
                </MdButton>
              </div>
            </div>
          )}
        </div>
      </div>
      {confirmDialogEl}
    </div>
  );
}
