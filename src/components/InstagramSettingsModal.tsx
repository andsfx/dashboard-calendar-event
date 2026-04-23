import { useState, useEffect } from 'react';
import { Settings, Save, X, Globe } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  posts: string[];
  onSave: (posts: string[]) => Promise<boolean>;
}

export function InstagramSettingsModal({ isOpen, onClose, posts, onSave }: Props) {
  const [postUrls, setPostUrls] = useState<[string, string, string]>(['', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPostUrls([
        posts[0] || '',
        posts[1] || '',
        posts[2] || '',
      ]);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, posts]);

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
    const success = await onSave(trimmed);
    if (success) {
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
              <p className="font-bold text-slate-800 dark:text-white">Instagram Gallery</p>
              <p className="text-xs text-slate-400">Kelola link post Instagram</p>
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
        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-5 sm:px-6">
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
