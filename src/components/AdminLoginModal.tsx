import { useState, useEffect } from 'react';
import { Lock, X, Eye, EyeOff, Mail, KeyRound } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';
import type { LoginResult } from '../types/auth';

type LoginTab = 'email' | 'legacy';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEmailLogin: (email: string, password: string) => Promise<LoginResult>;
  onLegacyLogin: (password: string) => Promise<LoginResult>;
}

export function AdminLoginModal({ isOpen, onClose, onEmailLogin, onLegacyLogin }: Props) {
  const [tab, setTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPw('');
      setError('');
      setShowPw(false);
      setLoading(false);
    }
  }, [isOpen]);

  // Clear error on tab switch
  useEffect(() => {
    setError('');
    setPw('');
  }, [tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result: LoginResult;

      if (tab === 'email') {
        result = await onEmailLogin(email, pw);
      } else {
        result = await onLegacyLogin(pw);
      }

      if (result.ok) {
        setPw('');
        setEmail('');
        setError('');
        onClose();
      } else {
        setError(result.error || 'Login gagal. Coba lagi.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = tab === 'email'
    ? email.trim() && pw.trim() && !loading
    : pw.trim() && !loading;

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
                <p className="text-xs text-white/70">Masuk ke mode admin</p>
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition ${
              tab === 'email'
                ? 'border-b-2 border-violet-500 text-violet-600 dark:text-violet-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email Login
          </button>
          <button
            type="button"
            onClick={() => setTab('legacy')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition ${
              tab === 'legacy'
                ? 'border-b-2 border-violet-500 text-violet-600 dark:text-violet-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Password
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field (only for email tab) */}
            {tab === 'email' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@example.com"
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700/60 dark:text-white dark:focus:ring-violet-900/30"
                />
              </div>
            )}

            {/* Password field */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Password{tab === 'legacy' ? ' Admin' : ''}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(''); }}
                  placeholder={tab === 'email' ? 'Masukkan password…' : 'Masukkan password admin…'}
                  autoFocus={tab === 'legacy'}
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
              disabled={!canSubmit}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow transition hover:from-violet-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses…
                </span>
              ) : (
                'Masuk sebagai Admin'
              )}
            </button>

            {/* Legacy tab hint */}
            {tab === 'legacy' && (
              <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
                Login password akan dihapus. Gunakan Email Login.
              </p>
            )}
          </form>
        </div>
      </div>
    </ModalWrapper>
  );
}
