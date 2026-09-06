import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, Upload, Save, Newspaper, ChevronLeft, Pencil } from 'lucide-react';
import { NewsArticle } from '../types';
import { fetchAllNewsArticles, createNewsArticle, updateNewsArticle, deleteNewsArticle, uploadToR2 } from '../utils/supabaseApi';
import { ModalWrapper } from './ModalWrapper';
import { ModalHeader } from './ui/ModalHeader';
import { adminThumbUrl } from '../utils/imageOptim';
import { useConfirmDialog } from './ConfirmDialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

const labelClass = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';

export function NewsManagerModal({ isOpen, onClose }: Props) {
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
    if (isOpen) {
      loadArticles();
      setView('list');
      setEditing(null);
      setError('');
    }
  }, [isOpen, loadArticles]);

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
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" ariaLabelledBy="news-manager-title">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--brand-card-light)] shadow-2xl dark:bg-slate-800">
        <ModalHeader
          titleId="news-manager-title"
          title={view === 'list' ? 'Berita & Artikel' : editing ? 'Edit Artikel' : 'Artikel Baru'}
          subtitle={view === 'list' ? 'Kelola artikel berita' : `${articles.length} artikel terdaftar`}
          icon={<Newspaper />}
          onClose={onClose}
          closeAriaLabel="Tutup"
          leading={
            view === 'edit' ? (
              <button
                type="button"
                onClick={goBackToList}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : undefined
          }
        />

        <div className="space-y-3 px-4 py-4 sm:px-6">
          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary-500 border-t-transparent" />
              <span className="ml-3 text-sm ui-text-muted">Memuat...</span>
            </div>
          )}

          {/* ===== VIEW 1: Article List ===== */}
          {view === 'list' && !isLoading && (
            <>
              <button
                type="button"
                onClick={startCreate}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold ui-text-muted transition hover:border-brand-primary-400 hover:text-brand-primary-600 dark:border-slate-600 dark:hover:border-brand-primary-400 dark:hover:text-brand-primary-400"
              >
                <Plus className="h-4 w-4" />
                Buat Artikel Baru
              </button>

              {articles.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-600">
                  <Newspaper className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
                  <p className="text-sm font-medium ui-text-muted">Belum ada artikel</p>
                  <p className="mt-1 text-xs text-slate-500">Buat artikel pertama untuk mulai mengelola berita</p>
                </div>
              )}

              {articles.length > 0 && (
                <div className="space-y-2">
                  {articles.map((article) => (
                    <div
                      key={article.id}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-primary-300 hover:bg-brand-primary-50/30 dark:border-slate-600 dark:hover:border-brand-primary-500/50 dark:hover:bg-brand-primary-900/10"
                    >
                      {/* Cover thumbnail */}
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
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
                            <Newspaper className="h-5 w-5 text-slate-300 dark:text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                          {article.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span
                            className={
                              article.status === 'published'
                                ? 'rounded-full bg-[var(--brand-tosca-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-tosca-dark)] dark:bg-brand-primary-900/40 dark:text-brand-primary-300'
                                : 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                            }
                          >
                            {article.status === 'published' ? 'Terbit' : 'Draft'}
                          </span>
                          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(article)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-primary-600 dark:hover:bg-slate-700 dark:hover:text-brand-primary-400"
                          aria-label={`Edit ${article.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(article)}
                          className={
                            article.status === 'published'
                              ? 'rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                              : 'rounded-lg bg-brand-primary-600 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-primary-700'
                          }
                        >
                          {article.status === 'published' ? 'Tarik Terbit' : 'Terbitkan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(article)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          aria-label={`Hapus ${article.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                <label className={labelClass}>Judul *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Judul artikel"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Ringkasan</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Ringkasan singkat artikel (opsional)"
                  rows={2}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Isi Artikel</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tulis isi artikel di sini..."
                  rows={8}
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </div>

              <div>
                <label className={labelClass}>Penulis</label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Marcomm Metropolitan Mall Bekasi"
                  className={inputClass}
                />
              </div>

              {/* Cover */}
              <div>
                <label className={labelClass}>Cover</label>
                {coverImageUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600">
                    <img src={coverImageUrl} alt="Cover artikel" className="aspect-[16/9] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setCoverImageUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                      aria-label="Hapus cover"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-6 text-sm font-medium ui-text-muted transition hover:border-brand-primary-400 hover:text-brand-primary-600 dark:border-slate-600 dark:hover:border-brand-primary-400 dark:hover:text-brand-primary-400">
                    <Upload className="h-5 w-5" />
                    {isUploading ? 'Mengunggah...' : 'Pilih gambar cover'}
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
                <button
                  type="button"
                  onClick={goBackToList}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!title.trim() || isUploading}
                  className="flex items-center gap-2 rounded-xl bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-primary-200 transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-brand-primary-900/30"
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan Artikel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {confirmDialogEl}
    </ModalWrapper>
  );
}
