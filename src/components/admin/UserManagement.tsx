import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, Eye, Building2, Loader2,
  ToggleLeft, ToggleRight, Pencil, Trash2, Mail, Check, X,
  Crown, BarChart3,
} from 'lucide-react';
import { useConfirmDialog } from '../modals/useConfirmDialog';
import { apiGet, apiPost } from '../../lib/rest';
import { ROLE_DISPLAY_NAMES } from '../../utils/roleDisplay';
import { MdButton, MdIconButton, MdSelect, MdTextField } from '../md';
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
          <MdButton variant="filled" onClick={() => setShowForm('invite')}>
            <Mail className="h-3.5 w-3.5" /> Invite
          </MdButton>
          <MdButton variant="outlined" onClick={() => setShowForm('create')}>
            <UserPlus className="h-3.5 w-3.5" /> Buat Manual
          </MdButton>
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
            <MdIconButton
              ariaLabel="Tutup form"
              onClick={() => { setShowForm(null); setFormError(''); setFormSuccess(''); }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </MdIconButton>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MdTextField type="email" ariaLabel="Alamat email" placeholder="Alamat email" value={formData.email} onChange={v => setFormData(p => ({ ...p, email: v }))} className="w-full" />
            {showForm === 'create' && (
              <MdTextField type="password" ariaLabel="Password (minimal 6 karakter)" placeholder="Password (minimal 6)" value={formData.password} onChange={v => setFormData(p => ({ ...p, password: v }))} className="w-full" />
            )}
            <MdTextField type="text" ariaLabel="Nama tampilan" placeholder="Nama Tampilan" value={formData.display_name} onChange={v => setFormData(p => ({ ...p, display_name: v }))} className="w-full" />
            <MdSelect
              ariaLabel="Peran pengguna"
              value={formData.role}
              onChange={v => setFormData(p => ({ ...p, role: v }))}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'viewer', label: 'Viewer' },
                { value: 'demo', label: 'Demo (hanya lihat)' },
                { value: 'eo_tenant', label: 'EO/Tenant' },
                { value: 'tenant_relation', label: 'Tenant Relation' },
              ]}
              className="w-full"
            />
            {formData.role === 'eo_tenant' && (
              <MdTextField type="text" ariaLabel="Nama organisasi EO" placeholder="Nama Organisasi EO" value={formData.eo_organization} onChange={v => setFormData(p => ({ ...p, eo_organization: v }))} className="w-full sm:col-span-2" />
            )}
          </div>
          {formError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{formError}</p>}
          {formSuccess && <p className="mt-2 text-xs text-[var(--wf-live)]">{formSuccess}</p>}
          <MdButton variant="filled" className="mt-3" onClick={handleSubmitForm} disabled={formLoading || !formData.email || !formData.role}>
            {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {showForm === 'invite' ? 'Kirim Undangan' : 'Buat User'}
          </MdButton>
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
                  {/* `flex-wrap`: badge peran + "Nonaktif" tidak menyusut, jadi
                      tanpa wrap keduanya memakan seluruh baris dan nama user
                      ter-squeeze sampai ~14px di layar 375px (hanya "…"). */}
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-[var(--wf-ink)]">{u.display_name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleInfo.color}`}>
                      {roleInfo.icon} {roleInfo.label}
                    </span>
                    {!u.is_active && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">Nonaktif</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[var(--wf-ink-muted)]">{u.email}</p>
                </div>
                {!readOnly && (
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Edit tersedia untuk semua baris — superadmin pun perlu
                        bisa mengganti email/password miliknya sendiri. */}
                    <MdIconButton
                      onClick={() => setEditingUser(u)}
                      title="Edit user"
                      ariaLabel={`Edit ${userLabel}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </MdIconButton>
                    {/* Toggle/delete sengaja tidak tersedia untuk superadmin:
                        mencegah akun superadmin terakhir terkunci. */}
                    {u.role !== 'superadmin' && (<>
                    <MdIconButton
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      ariaLabel={`${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${userLabel}`}
                      toggle
                      selected={u.is_active}
                    >
                      {u.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </MdIconButton>
                    <MdIconButton
                      onClick={() => handleDelete(u.id)}
                      title="Nonaktifkan user"
                      ariaLabel={`Nonaktifkan ${userLabel}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </MdIconButton>
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

