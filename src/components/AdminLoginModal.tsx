import { useState, useEffect } from 'react';
import { Lock, X, Eye, EyeOff } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';
import type { LoginResult } from '../types/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEmailLogin: (email: string, password: string) => Promise<LoginResult>;
}

export function AdminLoginModal({ isOpen, onClose, onEmailLogin }: Props) {
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
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await onEmailLogin(email, pw);

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

  const canSubmit = email.trim() && pw.trim() && !loading;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" ariaLabelledBy="admin-login-title">
      <div className={`rounded-[var(--wf-radius-board)] bg-[var(--wf-board)] overflow-hidden transition-transform ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
        {/* Header gradient */}
        <div className="bg-[var(--wf-accent)] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--wf-accent-ink)]/20 backdrop-blur-sm">
                <Lock className="h-5 w-5 text-[var(--wf-accent-ink)]" />
              </div>
              <div>
                <p id="admin-login-title" className="font-bold text-[var(--wf-accent-ink)]">Login Admin</p>
                <p className="text-xs text-[var(--wf-accent-ink)]/70">Masuk ke mode admin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--wf-accent-ink)]/70 transition hover:bg-[var(--wf-accent-ink)]/20 hover:text-[var(--wf-accent-ink)]"
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
              <label htmlFor="admin-login-email" className="mb-1.5 block text-xs font-semibold text-[var(--wf-ink-muted)]">
                Email
              </label>
              <input
                id="admin-login-email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@example.com"
                autoFocus
                className="w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-4 py-2.5 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent)]/20"
              />
            </div>

            <div>
              <label htmlFor="admin-login-password" className="mb-1.5 block text-xs font-semibold text-[var(--wf-ink-muted)]">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-login-password"
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(''); }}
                  placeholder="Masukkan password…"
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? 'admin-login-error' : undefined}
                  className={`w-full rounded-xl border bg-[var(--wf-board)] px-4 py-2.5 pr-10 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2 ${
                    error
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-500/20'
                      : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent)]/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--wf-ink-muted)] transition hover:text-[var(--wf-ink)]"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && (
                <p id="admin-login-error" role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-red-700 dark:text-red-300">
                  <span aria-hidden="true">⚠</span> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-[var(--wf-accent)] py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </form>
        </div>
      </div>
    </ModalWrapper>
  );
}
