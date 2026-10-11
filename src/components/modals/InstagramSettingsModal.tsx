import { useState, useEffect, useRef } from 'react';
import { Save, Globe, Image as ImageIcon, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { uploadToR2 } from '../../utils/api/albumsApi';
import { apiPost, ApiError } from '../../lib/rest';
import { MdButton, MdIconButton, MdTextField } from '../md';

interface Props {
  posts: string[];
  onSave: (posts: string[]) => Promise<boolean>;
  heroImageUrl?: string;
  onSaveHeroImage?: (url: string) => Promise<boolean>;
  /** Akun demo: hanya melihat. Tombol mutasi disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

export function InstagramSettingsModal({ posts, onSave, heroImageUrl = '', onSaveHeroImage, readOnly = false }: Props) {
  const [postUrls, setPostUrls] = useState<[string, string, string]>(['', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [heroUploading, setHeroUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const heroFileRef = useRef<HTMLInputElement>(null);

  // Sinkronkan form dengan data tersimpan saat halaman dimuat / data berubah.
  useEffect(() => {
    setPostUrls([
      posts[0] || '',
      posts[1] || '',
      posts[2] || '',
    ]);
    setHeroUrl(heroImageUrl);
    setError('');
    setIsSubmitting(false);
    setHeroUploading(false);
  }, [posts, heroImageUrl]);

  const handleHeroUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('File harus berupa gambar'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Ukuran file maksimal 10MB'); return; }

    setHeroUploading(true);
    setError('');
    try {
      // Hero IG → R2 prefix site/ (via presign VPS, bukan Supabase Storage).
      const url = await uploadToR2(file, 'site/');
      setHeroUrl(url);
    } catch (err: unknown) {
      setError(`Upload gagal: ${err instanceof Error ? err.message : 'Kesalahan tidak dikenal'}`);
    } finally {
      setHeroUploading(false);
    }
  };

  const handleRemoveHero = () => {
    setHeroUrl('');
  };

  const setUrl = (index: number, value: string) => {
    setPostUrls(prev => {
      const next = [...prev] as [string, string, string];
      next[index] = value;
      return next;
    });
    setError('');
  };

  const validate = (): boolean => {
    for (let i = 0; i < 3; i++) {
      const url = postUrls[i];
      if (url && url.trim() && !url.includes('instagram.com')) {
        setError(`Post ${i + 1}: URL harus dari instagram.com`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const trimmed = postUrls.map(u => u.trim());
    await onSave(trimmed);
    if (onSaveHeroImage) await onSaveHeroImage(heroUrl);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <form onSubmit={handleSubmit} className="ui-dashboard-surface space-y-3 p-4 sm:p-5">
        {/* Hero Background Image */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--wf-ink-muted)]">Hero Background</p>
          {heroUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-[var(--wf-rule)]">
              <img src={heroUrl} alt="Hero background" className="h-32 w-full object-cover" />
              {!readOnly && <MdIconButton
                ariaLabel="Hapus foto hero"
                title="Hapus foto hero"
                onClick={handleRemoveHero}
                className="absolute right-2 top-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </MdIconButton>}
              <p className="absolute bottom-2 left-3 rounded-md bg-black/50 px-1.5 py-0.5 text-xs font-medium text-white/90">Hero background aktif</p>
            </div>
          ) : readOnly ? null : (
            <MdButton
              variant="outlined"
              onClick={() => heroFileRef.current?.click()}
              disabled={heroUploading}
              className="w-full"
            >
              {heroUploading ? (
                <span>Mengupload…</span>
              ) : (
                <>
                  <ImageIcon className="h-5 w-5" />
                  <span>Upload foto hero background</span>
                </>
              )}
            </MdButton>
          )}
          {!readOnly && <input
            ref={heroFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); e.target.value = ''; }}
          />}
          {heroUrl && !readOnly && (
            <MdButton
              variant="text"
              onClick={() => heroFileRef.current?.click()}
              disabled={heroUploading}
            >
              {heroUploading ? 'Mengupload…' : 'Ganti foto'}
            </MdButton>
          )}
        </div>

        <div className="border-t border-[var(--wf-rule)]" />

        {/* Instagram Posts */}
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--wf-ink-muted)]">Instagram Gallery</p>
        {[0, 1, 2].map(i => (
          <div key={i}>
            <label htmlFor={`ig-post-${i}`} className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--wf-ink-muted)]">
              <Globe className="h-3.5 w-3.5" />
              Post {i + 1}:
            </label>
            <MdTextField
              id={`ig-post-${i}`}
              value={postUrls[i] ?? ''}
              onChange={value => setUrl(i, value)}
              readOnly={readOnly}
              placeholder="https://www.instagram.com/p/..."
              ariaLabel={`Post ${i + 1}`}
              className="w-full"
            />
          </div>
        ))}

        <p className="text-xs text-[var(--wf-ink-muted)]">
          Kosongkan field untuk sembunyikan post. URL harus dari instagram.com
        </p>

        {/* Sync Instagram Button */}
        {!readOnly && <MdButton
          variant="outlined"
          disabled={isSyncing || postUrls.every(u => !u.trim())}
          onClick={async () => {
            const validUrls = postUrls.filter(u => u.trim() && u.includes('instagram.com'));
            if (validUrls.length === 0) { setSyncResult('Tidak ada URL valid untuk di-sync'); return; }
            setIsSyncing(true);
            setSyncResult('');
            try {
              // POST /api/v1/instagram-sync → { success, data: { synced } } (staff).
              const data = await apiPost<{ success: boolean; error?: string; data?: { synced: number } }>('/instagram-sync', {
                urls: validUrls,
              });
              if (data.success) {
                setSyncResult(`Berhasil sync ${data.data?.synced ?? validUrls.length} post! Image di-cache ke CDN.`);
              } else {
                setSyncResult(`Gagal: ${data.error}`);
              }
            } catch (err) {
              // Jangan telan pesan asli server: 500 "APIFY_API_TOKEN belum
              // dikonfigurasi", 502 Apify, atau 401 sesi kedaluwarsa semuanya
              // harus terbaca. Hanya kegagalan jaringan (fetch tak sampai)
              // yang pakai kalimat ramah, karena pesan mentahnya ("Failed to
              // fetch") tidak berarti apa-apa bagi pengguna.
              const networkFailure = !(err instanceof ApiError) || err.code === 'NETWORK';
              setSyncResult(`Gagal: ${networkFailure ? 'Gagal terhubung ke server' : err.message}`);
            } finally {
              setIsSyncing(false);
            }
          }}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing via Apify…' : 'Sync & Cache Instagram Posts'}
        </MdButton>}
        {syncResult && (
          <p role={syncResult.includes('Berhasil') ? 'status' : 'alert'} className={`rounded-lg px-3 py-2 text-xs ${syncResult.includes('Berhasil') ? 'bg-[var(--wf-live)]/10 text-[var(--wf-live)]' : 'bg-[var(--wf-action)]/10 text-[var(--wf-action)]'}`}>
            {syncResult}
          </p>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-600/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p>{error} Periksa kembali isian, lalu coba simpan ulang.</p>
          </div>
        )}

        {/* Actions */}
        {!readOnly && <div className="pt-2">
          <MdButton
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Menyimpan…' : 'Simpan'}
          </MdButton>
        </div>}
      </form>
    </div>
  );
}
