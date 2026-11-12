import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { Label } from '../components/shadcn/label';
import type { LoginResult } from '../types/auth';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

interface Props {
  onEmailLogin: (email: string, password: string) => Promise<LoginResult>;
}

export function AdminLoginPage({ onEmailLogin }: Props) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await onEmailLogin(email, pw);

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

  const canSubmit = email.trim() && pw.trim() && !loading;

  return (
    <div className="ui-dashboard-page flex min-h-screen flex-col bg-[var(--wf-board)]">
      {/* Top bar */}
      <header className="ui-dashboard-chrome border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto" />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-[var(--wf-ink)]">Dashboard operasional event</p>
              <p className="text-[10px] text-[var(--wf-ink-muted)]">Metropolitan Mall Bekasi</p>
            </div>
          </div>
          <Link
            to="/"
            className="ui-focus-ring flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--wf-rule)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Kembali ke beranda
          </Link>
        </div>
      </header>

      {/* Center login card */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div
          className={`w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--wf-board)] shadow-2xl  transition-transform ${
            shake ? 'animate-[shake_0.4s_ease]' : ''
          }`}
        >
          {/* Header gradient */}
          <div className="bg-[var(--wf-accent)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 id="admin-login-title" className="font-bold text-[var(--wf-accent-ink)]">Masuk admin</h1>
                <p className="text-xs text-[var(--wf-accent-ink)]/90">Masuk ke dashboard admin</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="admin-login-email" className="mb-1.5 block text-xs font-semibold text-[var(--wf-ink-muted)]">
                  Email
                </Label>
                <Input
                  id="admin-login-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@example.com"
                  autoFocus
                  className="w-full rounded-xl border border-[var(--wf-rule)] h-auto bg-[var(--wf-board)] px-4 py-2.5 text-sm text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent)]"
                />
              </div>
              <div>
                <Label htmlFor="admin-login-pw" className="mb-1.5 block text-xs font-semibold text-[var(--wf-ink-muted)]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="admin-login-pw"
                    type={showPw ? 'text' : 'password'}
                    value={pw}
                    onChange={e => { setPw(e.target.value); setError(''); }}
                    placeholder="Masukkan kata sandi…"
                    className={`w-full rounded-xl border h-auto bg-[var(--wf-board)] px-4 py-2.5 pr-10 text-sm text-[var(--wf-ink)] outline-none transition focus:ring-2   ${
                      error
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/30'
                        : 'border-[var(--wf-rule)] focus:border-[var(--wf-accent)] focus:ring-[var(--wf-accent)]'
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--wf-ink-muted)] hover:bg-transparent"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                {error && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <span>⚠</span> {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl bg-[var(--wf-accent)] h-auto py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] shadow transition hover:bg-[var(--wf-accent)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Memproses…
                  </span>
                ) : (
                  'Masuk sebagai admin'
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <footer className="pb-6 text-center text-[11px] text-[var(--wf-ink-muted)]">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
