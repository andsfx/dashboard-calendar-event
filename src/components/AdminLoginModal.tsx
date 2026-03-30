import { useState, useEffect } from 'react';
import { Lock, X, Eye, EyeOff } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (pw: string) => boolean;
}

export function AdminLoginModal({ isOpen, onClose, onLogin }: Props) {
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) { setPw(''); setError(''); setShowPw(false); }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(pw);
    if (ok) {
      setPw(''); setError(''); onClose();
    } else {
      setError('Password salah. Coba lagi.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className={`rounded-2xl bg-white shadow-2xl dark:bg-slate-800 overflow-hidden transition-transform ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">Login Admin</p>
                <p className="text-xs text-white/70">Mode admin terbatas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Password Admin
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(''); }}
                  placeholder="Masukkan password…"
                  autoFocus
                  className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700/60 dark:text-white ${
                    error
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/30'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600 dark:focus:ring-violet-900/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                  <span>⚠</span> {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={!pw.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow transition hover:from-violet-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Masuk sebagai Admin
            </button>
          </form>
        </div>
      </div>
    </ModalWrapper>
  );
}
