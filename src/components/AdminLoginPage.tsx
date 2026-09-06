import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Lock, Eye, EyeOff, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import type { LoginResult } from '../types/auth';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

type LoginTab = 'email' | 'legacy';

interface Props {
  onEmailLogin: (email: string, password: string) => Promise<LoginResult>;
  onLegacyLogin: (password: string) => Promise<LoginResult>;
}

export function AdminLoginPage({ onEmailLogin, onLegacyLogin }: Props) {
  const [tab, setTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setPw('');
  }, [tab]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = tab === 'email'
        ? await onEmailLogin(email, pw)
        : await onLegacyLogin(pw);

      if (!result.ok) {
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
    <div className="ui-dashboard-page flex min-h-screen flex-col bg-[var(--brand-card)] dark:bg-slate-950">
      {/* Top bar */}
      <header className="ui-dashboard-chrome border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
            <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">
              Dashboard Admin
            </span>
          </div>
          <a
            href="/events"
            className="ui-focus-ring inline-flex shrink-0 items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-brand-primary-600 dark:text-slate-300 dark:hover:text-brand-primary-400"
          >
            <ArrowLeft className="h-4 w-4" /> Jadwal Publik
          </a>
        </div>
      </header>

      {/* Center login card */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div
          className={`w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--brand-card-light)] shadow-2xl dark:bg-slate-800 transition-transform ${
            shake ? 'animate-[shake_0.4s_ease]' : ''
          }`}
        >
          {/* Header gradient */}
          <div className="bg-brand-primary-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p id="admin-login-title" className="font-bold text-white">Login Admin</p>
                <p className="text-xs text-white/70">Masuk ke dashboard admin</p>
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setTab('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition ${
                tab === 'email'
                  ? 'border-b-2 border-brand-primary-500 text-brand-primary-600 dark:text-brand-primary-400'
                  : 'text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Login Email
            </button>
            <button
              type="button"
              onClick={() => setTab('legacy')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition ${
                tab === 'legacy'
                  ? 'border-b-2 border-brand-primary-500 text-brand-primary-600 dark:text-brand-primary-400'
                  : 'text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Password
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'email' && (
                <div>
                  <label htmlFor="admin-login-email" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    id="admin-login-email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="admin@example.com"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-[var(--brand-card)] px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700/60 dark:text-white dark:focus:ring-brand-primary-900/30"
                  />
                </div>
              )}
              <div>
                <label htmlFor="admin-login-pw" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Password{tab === 'legacy' ? ' Admin' : ''}
                </label>
                <div className="relative">
                  <input
                    id="admin-login-pw"
                    type={showPw ? 'text' : 'password'}
                    value={pw}
                    onChange={e => { setPw(e.target.value); setError(''); }}
                    placeholder={tab === 'email' ? 'Masukkan password…' : 'Masukkan password admin…'}
                    autoFocus={tab === 'legacy'}
                    className={`w-full rounded-xl border bg-[var(--brand-card)] px-4 py-2.5 pr-10 text-sm text-slate-800 outline-none transition focus:ring-2 dark:bg-slate-700/60 dark:text-white ${
                      error
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/30'
                        : 'border-slate-200 focus:border-brand-primary-400 focus:ring-brand-primary-100 dark:border-slate-600 dark:focus:ring-brand-primary-900/30'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-600 dark:hover:text-slate-200"
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
                className="w-full rounded-xl bg-brand-primary-600 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-brand-primary-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

              {tab === 'legacy' && (
                <p className="text-center text-[10px] text-slate-500 dark:text-slate-300">
                  Login password akan dihapus. Gunakan Login Email.
                </p>
              )}
            </form>
          </div>
        </div>
      </main>

      <footer className="pb-6 text-center text-[11px] text-slate-500 dark:text-slate-300">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life
      </footer>
    </div>
  );
}