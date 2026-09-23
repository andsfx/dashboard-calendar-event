import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, Eye, Building2, Loader2,
  ToggleLeft, ToggleRight, Pencil, Trash2, Mail, Check, X,
  Crown, BarChart3,
} from 'lucide-react';
import { useConfirmDialog } from '../modals/ConfirmDialog';
import { apiGet, apiPost } from '../../lib/rest';
import { ROLE_DISPLAY_NAMES } from '../../utils/roleDisplay';
import { UserEditModal } from './UserEditModal';

interface UserRecord {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  eo_organization: string;
  assigned_events: string[];
  last_login_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  superadmin: { label: ROLE_DISPLAY_NAMES.superadmin, color: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] border border-[var(--wf-rule)]', icon: <Crown className="h-3 w-3" /> },
  admin: { label: ROLE_DISPLAY_NAMES.admin, color: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] border border-[var(--wf-rule)]', icon: <Shield className="h-3 w-3" /> },
  viewer: { label: ROLE_DISPLAY_NAMES.viewer, color: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] border border-[var(--wf-rule)]', icon: <Eye className="h-3 w-3" /> },
  demo: { label: ROLE_DISPLAY_NAMES.demo, color: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] border border-[var(--wf-rule)]', icon: <Eye className="h-3 w-3" /> },
  eo_tenant: { label: ROLE_DISPLAY_NAMES.eo_tenant, color: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] border border-[var(--wf-rule)]', icon: <Building2 className="h-3 w-3" /> },
  tenant_relation: { label: ROLE_DISPLAY_NAMES.tenant_relation, color: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] border border-[var(--wf-rule)]', icon: <BarChart3 className="h-3 w-3" /> },
};

interface UserManagementProps {
  /** Akun demo: hanya melihat. Tombol mutasi disembunyikan (backend juga menolak). */
  readOnly?: boolean;
  /** Id user yang sedang login — role akun sendiri tidak boleh diubah. */
  currentUserId?: string;
}

export function UserManagement({ readOnly = false, currentUserId }: UserManagementProps = {}) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialog: confirmDialogEl } = useConfirmDialog();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState<'invite' | 'create' | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'viewer', display_name: '', eo_organization: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/v1/users → { success, data: { users } } (superadmin).
      const data = await apiGet<{ users: UserRecord[] }>('/users');
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Ambil daftar user saat mount (dulu absen — spinner berputar selamanya).
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = useCallback(async (userId: string, currentActive: boolean) => {
    const target = users.find(u => u.id === userId);
    const ok = await confirm({
      title: currentActive ? 'Nonaktifkan user ini?' : 'Aktifkan user ini?',
      message: currentActive ? 'User tidak akan bisa login sampai diaktifkan kembali.' : 'User akan bisa login kembali.',
      subject: target?.display_name || target?.email,
      confirmLabel: currentActive ? 'Nonaktifkan' : 'Aktifkan',
    });
    if (!ok) return;
    const result = await apiPost<{ success: boolean; error?: string }>('/users-update', {
      user_id: userId,
      is_active: !currentActive,
    });
    if (result.success) fetchUsers();
    else setError(result.error || 'Gagal memperbarui status user');
  }, [confirm, fetchUsers, users]);
  const handleDelete = useCallback(async (userId: string) => {
    const ok = await confirm({
      title: 'Nonaktifkan user ini?',
      message: 'User tidak akan bisa login sampai diaktifkan kembali.',
      confirmLabel: 'Nonaktifkan',
    });
    if (!ok) return;
    const result = await apiPost<{ success: boolean; error?: string }>('/users-delete', {
      user_id: userId,
    });
    if (result.success) fetchUsers();
  }, [confirm, fetchUsers]);


  const handleSubmitForm = useCallback(async () => {
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    const path = showForm === 'invite' ? '/users-invite' : '/users-create';
    const body: Record<string, string> = {
      email: formData.email,
      role: formData.role,
      display_name: formData.display_name,
      eo_organization: formData.eo_organization,
    };
    if (showForm === 'create') body.password = formData.password;

    try {
      const json = await apiPost<{ success: boolean; error?: string }>(path, body);
      if (json.success) {
        setFormSuccess(showForm === 'invite' ? 'Undangan terkirim!' : 'User berhasil dibuat!');
        setFormData({ email: '', password: '', role: 'viewer', display_name: '', eo_organization: '' });
        fetchUsers();
        setTimeout(() => { setShowForm(null); setFormSuccess(''); }, 2000);
      } else {
        setFormError(json.error || 'Gagal');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal terhubung ke server');
    } finally {
      setFormLoading(false);
    }
  }, [showForm, formData, fetchUsers]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--wf-accent)]" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--wf-ink-muted)]">{users.length} user terdaftar</p>
        </div>
        <div className="flex gap-2">
          {!readOnly && (<>
          <button onClick={() => setShowForm('invite')} className="flex items-center gap-1.5 rounded-lg bg-[var(--wf-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-accent-ink)] hover:bg-[var(--wf-accent-hover)]">
            <Mail className="h-3.5 w-3.5" /> Invite
          </button>
          <button onClick={() => setShowForm('create')} className="flex items-center gap-1.5 rounded-lg border border-[var(--wf-rule)] px-3 py-1.5 text-xs font-medium text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]">
            <UserPlus className="h-3.5 w-3.5" /> Buat Manual
          </button>
          </>)}
        </div>
      </div>

      {/* Error */}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</div>}

      {/* Create/Invite Form */}
      {showForm && !readOnly && (
        <div className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--wf-ink)]">
              {showForm === 'invite' ? 'Undang User Baru' : 'Buat User Manual'}
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(null); setFormError(''); setFormSuccess(''); }}
              aria-label="Tutup form"
              className="rounded-lg p-1.5 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="email" aria-label="Alamat email" placeholder="Alamat email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)]" />
            {showForm === 'create' && (
              <input type="password" aria-label="Password (minimal 6 karakter)" placeholder="Password (minimal 6)" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)]" />
            )}
            <input type="text" aria-label="Nama tampilan" placeholder="Nama Tampilan" value={formData.display_name} onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))}
              className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)]" />
            <select aria-label="Peran pengguna" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
              className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)]">
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
              <option value="demo">Demo (hanya lihat)</option>
              <option value="eo_tenant">EO/Tenant</option>
              <option value="tenant_relation">Tenant Relation</option>
            </select>
            {formData.role === 'eo_tenant' && (
              <input type="text" aria-label="Nama organisasi EO" placeholder="Nama Organisasi EO" value={formData.eo_organization} onChange={e => setFormData(p => ({ ...p, eo_organization: e.target.value }))}
                className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] sm:col-span-2" />
            )}
          </div>
          {formError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{formError}</p>}
          {formSuccess && <p className="mt-2 text-xs text-[var(--wf-live)]">{formSuccess}</p>}
          <button onClick={handleSubmitForm} disabled={formLoading || !formData.email || !formData.role}
            className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--wf-accent)] px-4 py-2 text-sm font-semibold text-[var(--wf-accent-ink)] hover:bg-[var(--wf-accent-hover)] disabled:opacity-50">
            {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {showForm === 'invite' ? 'Kirim Undangan' : 'Buat User'}
          </button>
        </div>
      )}

      {/* Users table */}
      <div className="ui-dashboard-surface">
        <div className="divide-y divide-[var(--wf-rule)]">
          {users.map((u) => {
            const roleInfo = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] border border-[var(--wf-rule)]', icon: <Shield className="h-3 w-3" /> };
            // Label aksesibel harus unik: display_name boleh sama (dua user
            // bernama "demo"), email tidak — jadi email disertakan.
            const userLabel = u.display_name ? `${u.display_name} (${u.email})` : u.email;
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] ">
                  <Users className="h-4 w-4" />
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[var(--wf-ink)]">{u.display_name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleInfo.color}`}>
                      {roleInfo.icon} {roleInfo.label}
                    </span>
                    {!u.is_active && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">Nonaktif</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[var(--wf-ink-muted)]">{u.email}</p>
                </div>
                {!readOnly && (
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Edit tersedia untuk semua baris — superadmin pun perlu
                        bisa mengganti email/password miliknya sendiri. */}
                    <button
                      onClick={() => setEditingUser(u)}
                      className="rounded-lg p-1.5 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-accent)]"
                      title="Edit user"
                      aria-label={`Edit ${userLabel}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {/* Toggle/delete sengaja tidak tersedia untuk superadmin:
                        mencegah akun superadmin terakhir terkunci. */}
                    {u.role !== 'superadmin' && (<>
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`rounded-lg p-1.5 transition-colors ${u.is_active ? 'text-[var(--wf-live)] hover:bg-[var(--wf-live)]/10' : 'text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]'}`}
                      title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      aria-label={`${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${userLabel}`}
                      aria-pressed={u.is_active}
                    >
                      {u.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="rounded-lg p-1.5 text-[var(--wf-ink-muted)] transition-colors hover:bg-red-600/10 hover:text-red-700 dark:hover:text-red-300"
                      title="Nonaktifkan user"
                      aria-label={`Nonaktifkan ${userLabel}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    </>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <UserEditModal
        isOpen={!!editingUser}
        user={editingUser}
        currentUserId={currentUserId}
        onClose={() => setEditingUser(null)}
        onSaved={fetchUsers}
      />
      {confirmDialogEl}
    </div>
  );
}

