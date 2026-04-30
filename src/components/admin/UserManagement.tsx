import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, Eye, Building2, Loader2,
  ToggleLeft, ToggleRight, Pencil, Trash2, Mail, Check, X,
  Crown,
} from 'lucide-react';

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
  superadmin: { label: 'Superadmin', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <Crown className="h-3 w-3" /> },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: <Shield className="h-3 w-3" /> },
  viewer: { label: 'Viewer', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', icon: <Eye className="h-3 w-3" /> },
  eo_tenant: { label: 'EO/Tenant', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: <Building2 className="h-3 w-3" /> },
};

export function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState<'invite' | 'create' | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'viewer', display_name: '', eo_organization: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth?action=users', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) setUsers(json.users);
      else setError(json.error || 'Gagal memuat data');
    } catch { setError('Gagal terhubung ke server'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = useCallback(async (userId: string, currentActive: boolean) => {
    const res = await fetch('/api/auth?action=update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ user_id: userId, is_active: !currentActive }),
    });
    if ((await res.json()).success) fetchUsers();
  }, [fetchUsers]);

  const handleDelete = useCallback(async (userId: string) => {
    if (!confirm('Nonaktifkan user ini?')) return;
    const res = await fetch('/api/auth?action=delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ user_id: userId }),
    });
    if ((await res.json()).success) fetchUsers();
  }, [fetchUsers]);

  const handleSubmitForm = useCallback(async () => {
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    const action = showForm === 'invite' ? 'invite' : 'create-user';
    const body: Record<string, string> = {
      email: formData.email,
      role: formData.role,
      display_name: formData.display_name,
      eo_organization: formData.eo_organization,
    };
    if (showForm === 'create') body.password = formData.password;

    try {
      const res = await fetch(`/api/auth?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setFormSuccess(showForm === 'invite' ? 'Undangan terkirim!' : 'User berhasil dibuat!');
        setFormData({ email: '', password: '', role: 'viewer', display_name: '', eo_organization: '' });
        fetchUsers();
        setTimeout(() => { setShowForm(null); setFormSuccess(''); }, 2000);
      } else {
        setFormError(json.error || 'Gagal');
      }
    } catch { setFormError('Gagal terhubung ke server'); }
    finally { setFormLoading(false); }
  }, [showForm, formData, fetchUsers]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">User Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{users.length} user terdaftar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm('invite')} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
            <Mail className="h-3.5 w-3.5" /> Invite
          </button>
          <button onClick={() => setShowForm('create')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
            <UserPlus className="h-3.5 w-3.5" /> Buat Manual
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</div>}

      {/* Create/Invite Form */}
      {showForm && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {showForm === 'invite' ? 'Undang User Baru' : 'Buat User Manual'}
            </h3>
            <button onClick={() => { setShowForm(null); setFormError(''); setFormSuccess(''); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            {showForm === 'create' && (
              <input type="password" placeholder="Password (min 6)" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            )}
            <input type="text" placeholder="Nama Tampilan" value={formData.display_name} onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            <select value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
              <option value="eo_tenant">EO/Tenant</option>
            </select>
            {formData.role === 'eo_tenant' && (
              <input type="text" placeholder="Nama Organisasi EO" value={formData.eo_organization} onChange={e => setFormData(p => ({ ...p, eo_organization: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:col-span-2" />
            )}
          </div>
          {formError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{formError}</p>}
          {formSuccess && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{formSuccess}</p>}
          <button onClick={handleSubmitForm} disabled={formLoading || !formData.email || !formData.role}
            className="mt-3 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
            {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {showForm === 'invite' ? 'Kirim Undangan' : 'Buat User'}
          </button>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {users.map((u) => {
            const roleInfo = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-700', icon: <Shield className="h-3 w-3" /> };
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  <Users className="h-4 w-4" />
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{u.display_name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleInfo.color}`}>
                      {roleInfo.icon} {roleInfo.label}
                    </span>
                    {!u.is_active && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">Nonaktif</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {u.email}
                    {u.eo_organization && ` · ${u.eo_organization}`}
                    {u.last_login_at && ` · Login: ${new Date(u.last_login_at).toLocaleDateString('id-ID')}`}
                  </p>
                </div>
                {/* Actions */}
                {u.role !== 'superadmin' && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`rounded-lg p-1.5 transition ${u.is_active ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {u.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      title="Nonaktifkan user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getToken(): string {
  try {
    const keys = Object.keys(localStorage);
    const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) { return JSON.parse(localStorage.getItem(sbKey) || '{}').access_token || ''; }
  } catch {}
  return '';
}
