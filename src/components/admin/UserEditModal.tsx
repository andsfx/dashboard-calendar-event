import { useEffect, useState } from 'react';
import { X, Check, Loader2, KeyRound, Mail, Shield } from 'lucide-react';
import { ModalWrapper } from '../ModalWrapper';
import { apiPost, ApiError } from '../../lib/rest';

export interface EditableUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

interface Props {
  isOpen: boolean;
  user: EditableUser | null;
  /** Id user yang sedang login — role akun sendiri tidak boleh diubah. */
  currentUserId?: string;
  onClose: () => void;
  /** true bila server menerima perubahan (pemanggil me-refresh daftar). */
  onSaved: () => void;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
  { value: 'demo', label: 'Demo (hanya lihat)' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'eo_tenant', label: 'EO/Tenant' },
  { value: 'tenant_relation', label: 'Tenant Relation' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

/**
 * Edit pengguna: email, nama tampilan, role, dan password.
 *
 * Hanya field yang benar-benar berubah yang dikirim ke `/users-update`, dan
 * password kosong berarti "jangan ubah" — bukan "kosongkan".
 */
export function UserEditModal({ isOpen, user, currentUserId, onClose, onSaved }: Props) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('viewer');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Isi ulang form tiap kali modal dibuka untuk user berbeda.
  useEffect(() => {
    if (!isOpen || !user) return;
    setEmail(user.email);
    setDisplayName(user.display_name);
    setRole(user.role);
    setPassword('');
    setError('');
    setIsSubmitting(false);
  }, [isOpen, user]);

  const isSelf = !!user && user.id === currentUserId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');

    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) return setError('Email wajib diisi.');
    if (!EMAIL_RE.test(nextEmail)) return setError('Format email tidak valid.');
    if (password && password.length < MIN_PASSWORD) {
      return setError(`Password minimal ${MIN_PASSWORD} karakter.`);
    }

    // Kirim hanya yang berubah — server menolak payload kosong.
    const body: Record<string, string> = { user_id: user.id };
    if (nextEmail !== user.email.toLowerCase()) body.email = nextEmail;
    if (displayName.trim() !== user.display_name) body.display_name = displayName.trim();
    if (role !== user.role) body.role = role;
    if (password) body.password = password;

    if (Object.keys(body).length === 1) {
      setError('Tidak ada perubahan.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPost<{ success: boolean }>('/users-update', body);
      onSaved();
      onClose();
    } catch (err) {
      // apiPost melempar ApiError pada 4xx/5xx — pesan server (mis. "Email
      // sudah terdaftar", "Tidak bisa mengubah role sendiri") ditampilkan apa adanya.
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan perubahan.');
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white';
  const labelClass = 'mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300';

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" ariaLabelledBy="user-edit-title">
      <div className="overflow-hidden rounded-2xl bg-[var(--brand-card-light)] shadow-2xl dark:bg-slate-800">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-primary-500 to-brand-primary-700" />

        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <h3 id="user-edit-title" className="text-base font-bold text-slate-900 dark:text-white">Edit Pengguna</h3>
            <p className="mt-0.5 text-xs ui-text-muted">{user.display_name || user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-70 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 pb-5">
          <div>
            <label htmlFor="ue-email" className={labelClass}>
              <Mail className="mr-1 inline h-3 w-3" aria-hidden="true" />Email
            </label>
            <input
              id="ue-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="ue-name" className={labelClass}>Nama Tampilan</label>
            <input
              id="ue-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="ue-role" className={labelClass}>
              <Shield className="mr-1 inline h-3 w-3" aria-hidden="true" />Role
            </label>
            <select
              id="ue-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isSelf}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {isSelf && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Role akun sendiri tidak bisa diubah.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="ue-password" className={labelClass}>
              <KeyRound className="mr-1 inline h-3 w-3" aria-hidden="true" />Password Baru
            </label>
            <input
              id="ue-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Kosongkan bila tidak diubah (min. ${MIN_PASSWORD})`}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-700 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
