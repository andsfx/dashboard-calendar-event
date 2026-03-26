import { useEffect, useState } from 'react';
import { Shield, X, Eye, EyeOff } from 'lucide-react';
import { isRateLimited, recordFailedAttempt, resetRateLimit } from '../utils/rateLimit';
import { INPUT_LIMITS } from '../constants';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => boolean;
  isConfigured: boolean;
}

export default function AdminLoginModal({ isOpen, onClose, onLogin, isConfigured }: AdminLoginModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [tick, setTick] = useState(0);

  const rateLimit = isRateLimited();
  const isLocked = rateLimit.limited;
  const lockRemainingSec = rateLimit.remainingSec;

  // Force re-render every 500ms to update lock countdown
  // tick is used to trigger re-renders for countdown updates
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => setTick(t => t + 1), 500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tick]);

  // Check rate limit on open
  useEffect(() => {
    if (isOpen && isLocked) {
      setError(`Terlalu banyak percobaan. Coba lagi dalam ${lockRemainingSec} detik.`);
    }
  }, [isOpen, isLocked, lockRemainingSec]);

  function handleClose() {
    setPassword('');
    setError('');
    setShowPassword(false);
    onClose();
  }

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfigured) {
      setError('Akses admin belum dikonfigurasi. Set VITE_ADMIN_PASSWORD di file .env.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (isLocked) {
      setError(`Terlalu banyak percobaan. Coba lagi dalam ${lockRemainingSec} detik.`);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    
    const success = onLogin(password);
    if (success) {
      setPassword('');
      setError('');
      resetRateLimit();
      handleClose();
    } else {
      const state = recordFailedAttempt();
      if (state.lockUntil) {
        const remainingSec = Math.ceil((state.lockUntil - Date.now()) / 1000);
        setError(`Terlalu banyak percobaan gagal. Login dikunci selama ${remainingSec} detik.`);
      } else {
        const attemptsLeft = 5 - state.failedAttempts;
        setError(`Password salah! ${attemptsLeft} percobaan tersisa.`);
      }
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className={`relative bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-in ${shake ? 'animate-shake' : ''}`}>
        <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Admin Access</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Masukkan password untuk mengelola acara.</p>
          <p
            className={`text-xs mt-2 font-medium ${
              isConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {isConfigured ? 'Konfigurasi admin aktif.' : 'Konfigurasi admin belum aktif (set VITE_ADMIN_PASSWORD).'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="Masukkan password admin..."
                maxLength={INPUT_LIMITS.PASSWORD}
                autoFocus
                disabled={!isConfigured || isLocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!isConfigured || isLocked}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={!isConfigured || isLocked}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLocked ? `Coba lagi ${lockRemainingSec} dtk` : 'Masuk sebagai Admin'}
          </button>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Hubungi administrator untuk kredensial akses.
          </p>
        </form>
      </div>
    </div>
  );
}
