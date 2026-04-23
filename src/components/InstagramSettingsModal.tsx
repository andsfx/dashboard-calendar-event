import { useState, useEffect, useRef } from 'react';
import { Settings, Save, X, Globe, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  posts: string[];
  onSave: (posts: string[]) => Promise<boolean>;
  heroImageUrl?: string;
  onSaveHeroImage?: (url: string) => Promise<boolean>;
}

export function InstagramSettingsModal({ isOpen, onClose, posts, onSave, heroImageUrl = '', onSaveHeroImage }: Props) {
  const [postUrls, setPostUrls] = useState<[string, string, string]>(['', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [heroUploading, setHeroUploading] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPostUrls([
        posts[0] || '',
        posts[1] || '',
        posts[2] || '',
      ]);
      setHeroUrl(heroImageUrl);
      setError('');
      setIsSubmitting(false);
      setHeroUploading(false);
    }
  }, [isOpen, posts, heroImageUrl]);

  const handleHeroUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('File harus berupa gambar'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Ukuran file maksimal 10MB'); return; }

    setHeroUploading(true);
    setError('');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `hero_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('event-photos').upload(fileName, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(fileName);
      setHeroUrl(urlData.publicUrl);
    } catch (err: any) {
      setError(`Upload gagal: ${err.message || 'Unknown error'}`);
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
      const url = postUrls[i].trim();
      if (url && !url.includes('instagram.com')) {
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
    const igSuccess = await onSave(trimmed);
    const heroSuccess = onSaveHeroImage ? await onSaveHeroImage(heroUrl) : true;
    if (igSuccess && heroSuccess) {
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">Landing Page Settings</p>
              <p className="text-xs text-slate-400">Hero background & Instagram gallery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 px-4 py-5 sm:px-6">
          {/* Hero Background Image */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Hero Background</p>
            {heroUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-black/[0.06] dark:border-slate-700">
                <img src={heroUrl} alt="Hero background" className="h-32 w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <button
                  type="button"
                  onClick={handleRemoveHero}
                  className="absolute right-2 top-2 rounded-lg bg-red-500/80 p-1.5 text-white transition hover:bg-red-600"
                  title="Hapus foto hero"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <p className="absolute bottom-2 left-3 text-xs font-medium text-white/80">Hero background aktif</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => heroFileRef.current?.click()}
                disabled={heroUploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-sm text-slate-500 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-violet-600"
              >
                {heroUploading ? (
                  <span>Mengupload...</span>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5" />
                    <span>Upload foto hero background</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={heroFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); e.target.value = ''; }}
            />
            {heroUrl && (
              <button
                type="button"
                onClick={() => heroFileRef.current?.click()}
                disabled={heroUploading}
                className="text-xs font-medium text-violet-600 transition hover:text-violet-700 dark:text-violet-400 disabled:opacity-60"
              >
                {heroUploading ? 'Mengupload...' : 'Ganti foto'}
              </button>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* Instagram Posts */}
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Instagram Gallery</p>
          {[0, 1, 2].map(i => (
            <div key={i}>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Globe className="h-3.5 w-3.5" />
                Post {i + 1}:
              </label>
              <input
                value={postUrls[i]}
                onChange={e => setUrl(i, e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          ))}

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Kosongkan field untuk sembunyikan post. URL harus dari instagram.com
          </p>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-violet-900/30"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
