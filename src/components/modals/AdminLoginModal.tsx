import { useState, useEffect } from 'react';
import { Lock, X, Eye, EyeOff } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';
import { MdButton, MdIconButton, MdTextField } from '../md';
import type { LoginResult } from '../../types/auth';

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
            <MdIconButton
              ariaLabel="Tutup"
              onClick={onClose}
              className="text-[var(--wf-accent-ink)]/70 transition hover:text-[var(--wf-accent-ink)]"
            >
              <X className="h-4 w-4" />
            </MdIconButton>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <MdTextField
                id="admin-login-email"
                type="email"
                label="Email"
                value={email}
                onChange={value => { setEmail(value); setError(''); }}
                placeholder="admin@example.com"
                autoFocus
                className="w-full"
              />
            </div>

            <div>
              <div className="relative">
                <MdTextField
                  id="admin-login-password"
                  type={showPw ? 'text' : 'password'}
                  label="Password"
                  value={pw}
                  onChange={value => { setPw(value); setError(''); }}
                  placeholder="Masukkan password…"
                  error={!!error}
                  /* Ruang trailing md diperlebar agar teks password tidak
                     berjalan di bawah tombol mata. Token md yang dipakai:
                     `--md-outlined-text-field-trailing-space` (default 16px,
                     node_modules/@material/web/textfield/internal/outlined-styles.css
                     → `--_trailing-space: var(--md-outlined-text-field-trailing-space, 16px)`,
                     dipakai sebagai `padding-inline-end` konten field).
                     Nilai = inset tombol (right-3 = 12px) + lebar tombol md
                     (40px) + jarak aman 8px. */
                  className="w-full [--md-outlined-text-field-trailing-space:calc(12px_+_40px_+_8px)]"
                />
                <MdIconButton
                  ariaLabel={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                  title={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                  onClick={() => setShowPw(v => !v)}
                  toggle
                  selected={showPw}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--wf-ink-muted)] transition hover:text-[var(--wf-ink)]"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </MdIconButton>
              </div>
              {error && (
                <p id="admin-login-error" role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-red-700 dark:text-red-300">
                  <span aria-hidden="true">⚠</span> {error}
                </p>
              )}
            </div>

            <MdButton
              type="submit"
              disabled={!canSubmit}
              className="w-full"
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
            </MdButton>
          </form>
        </div>
      </div>
    </ModalWrapper>
  );
}
