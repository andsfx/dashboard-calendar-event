import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserManagement } from '../UserManagement';

/**
 * Mount-smoke test — regresi untuk bug "spinner selamanya":
 * UserManagement tidak pernah memanggil fetchUsers saat mount, sehingga
 * GET /api/v1/users tidak pernah ter-request dan halaman superadmin stuck
 * loading (tidak terdeteksi suite karena tidak ada test yang mount ini).
 * Mock fetch route REST langsung (pola domainApi.test.ts), VITE_API_URL
 * kosong di test → base '/api/v1'.
 */
const USERS_URL = '/api/v1/users';

function mockFetchOnce(status: number, body: unknown) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    calls.push(url);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  }));
  return calls;
}

const userFixture = {
  id: 'u-1', email: 'viewer@x.id', display_name: 'Viewer Test', role: 'viewer',
  is_active: true, eo_organization: '', assigned_events: [], last_login_at: null,
  created_at: '2026-01-01T00:00:00Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('UserManagement (mount-smoke)', () => {
  it('memanggil GET /api/v1/users saat mount — tidak stuck spinner', async () => {
    const calls = mockFetchOnce(200, { users: [userFixture] });
    render(<UserManagement />);

    // Bug lama: fetch tidak pernah dipanggil → spinner Loading... selamanya.
    // Relaks: fetch /users harus terjadi (dengan atau tanpa slash — apiGet
    // menambahkan prefix, jadi cukup assert URL inti).
    await waitFor(() => {
      expect(calls.some(u => u.includes(USERS_URL))).toBe(true);
    }, { timeout: 3000 });

    // Data tampil: nama user + counter — bukan spinner.
    await waitFor(() => {
      expect(screen.getByText('Viewer Test')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(await screen.findByText('1 user terdaftar')).toBeInTheDocument();
    // Spinner (Loader2 animate-spin) harus hilang setelah loading selesai.
    expect(document.querySelector('svg.animate-spin')).not.toBeInTheDocument();
  });

  it('menampilkan pesan error bila GET /users gagal — bukan diam', async () => {
    mockFetchOnce(500, { success: false, error: 'Server error' });
    render(<UserManagement />);

    await waitFor(() => {
      expect(document.querySelector('svg.animate-spin')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    // Error state tampil (setLoading(false) + setError di catch path).
    await waitFor(() => {
      expect(screen.getByText(/gagal|server error/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('tombol toggle user memakai aria-pressed + aria-label', async () => {
    mockFetchOnce(200, { users: [userFixture] });
    render(<UserManagement />);

    const toggle = await screen.findByTitle('Nonaktifkan');
    expect(toggle).toBeInTheDocument();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Nonaktifkan Viewer Test (viewer@x.id)');
  });

  it('mode read-only (demo): daftar terlihat, tombol mutasi tidak ada', async () => {
    mockFetchOnce(200, { users: [userFixture] });
    render(<UserManagement readOnly />);

    // Data tetap tampil
    await waitFor(() => {
      expect(screen.getByText('Viewer Test')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Aksi mutasi disembunyikan
    expect(screen.queryByRole('button', { name: /invite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /buat manual/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Nonaktifkan')).not.toBeInTheDocument();
    // Edit juga tersembunyi — demo tidak boleh menyentuh user.
    expect(screen.queryByRole('button', { name: /^edit /i })).not.toBeInTheDocument();
  });

  it('menampilkan email user di daftar (bukan hanya nama)', async () => {
    mockFetchOnce(200, { users: [userFixture] });
    render(<UserManagement />);
    expect(await screen.findByText('viewer@x.id')).toBeInTheDocument();
  });

  it('label tombol edit unik walau display_name sama (dua user "demo")', async () => {
    // Regresi: display_name tidak unik di data nyata (demo@demo.com dan
    // user@demo.com dua-duanya bernama "demo"), sehingga label "Edit demo"
    // muncul dua kali dan screen reader tak bisa membedakan.
    mockFetchOnce(200, { users: [
      { ...userFixture, id: 'u-1', email: 'demo@demo.com', display_name: 'demo' },
      { ...userFixture, id: 'u-2', email: 'user@demo.com', display_name: 'demo' },
    ] });
    render(<UserManagement />);

    const btnA = await screen.findByRole('button', { name: 'Edit demo (demo@demo.com)' });
    const btnB = await screen.findByRole('button', { name: 'Edit demo (user@demo.com)' });
    expect(btnA).toBeInTheDocument();
    expect(btnB).toBeInTheDocument();
  });
});

/**
 * Mock yang membedakan GET /users dan POST /users-update, dan merekam body
 * POST terakhir — supaya bisa diverifikasi field mana yang benar-benar dikirim.
 */
function mockUserApi(users: unknown[]) {
  const posted: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    const method = (init?.method || 'GET').toUpperCase();
    let body: unknown = { success: true, data: { users } };
    if (method === 'POST' && url.includes('/users-update')) {
      posted.push(JSON.parse(String(init?.body || '{}')));
      body = { success: true };
    }
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  }));
  return posted;
}

describe('UserManagement (edit user)', () => {
  it('membuka modal edit dengan data user terisi', async () => {
    mockUserApi([userFixture]);
    render(<UserManagement />);

    const editBtn = await screen.findByRole('button', { name: 'Edit Viewer Test (viewer@x.id)' });
    editBtn.click();

    expect(await screen.findByRole('heading', { name: 'Edit Pengguna' })).toBeInTheDocument();
    expect((screen.getByLabelText(/^Email$/) as HTMLInputElement).value).toBe('viewer@x.id');
    expect((screen.getByLabelText('Nama Tampilan') as HTMLInputElement).value).toBe('Viewer Test');
    expect((screen.getByLabelText(/^Role$/) as HTMLSelectElement).value).toBe('viewer');
    // Password sengaja kosong — "kosong = jangan ubah", bukan "kosongkan".
    expect((screen.getByLabelText(/Password Baru/) as HTMLInputElement).value).toBe('');
  });

  it('hanya mengirim field yang berubah — password kosong tidak dikirim', async () => {
    const posted = mockUserApi([userFixture]);
    render(<UserManagement />);

    (await screen.findByRole('button', { name: 'Edit Viewer Test (viewer@x.id)' })).click();
    await screen.findByRole('heading', { name: 'Edit Pengguna' });

    // Ubah role saja; email/nama dibiarkan.
    const roleSelect = screen.getByLabelText(/^Role$/) as HTMLSelectElement;
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    (screen.getByRole('button', { name: /^Simpan$/ })).click();

    await waitFor(() => expect(posted.length).toBe(1));
    expect(posted[0]).toEqual({ user_id: 'u-1', role: 'admin' });
    // Password tidak pernah terkirim bila kosong.
    expect(posted[0]).not.toHaveProperty('password');
  });

  it('mengirim email baru bila diubah', async () => {
    const posted = mockUserApi([userFixture]);
    render(<UserManagement />);

    (await screen.findByRole('button', { name: 'Edit Viewer Test (viewer@x.id)' })).click();
    await screen.findByRole('heading', { name: 'Edit Pengguna' });

    const emailInput = screen.getByLabelText(/^Email$/) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: '  Baru@X.id  ' } });
    (screen.getByRole('button', { name: /^Simpan$/ })).click();

    await waitFor(() => expect(posted.length).toBe(1));
    // Dinormalisasi: trim + lowercase (login memakai lower(email)).
    expect(posted[0]).toEqual({ user_id: 'u-1', email: 'baru@x.id' });
  });

  it('menolak password di bawah 6 karakter tanpa memanggil server', async () => {
    const posted = mockUserApi([userFixture]);
    render(<UserManagement />);

    (await screen.findByRole('button', { name: 'Edit Viewer Test (viewer@x.id)' })).click();
    await screen.findByRole('heading', { name: 'Edit Pengguna' });

    const pwInput = screen.getByLabelText(/Password Baru/) as HTMLInputElement;
    fireEvent.change(pwInput, { target: { value: '123' } });
    (screen.getByRole('button', { name: /^Simpan$/ })).click();

    expect(await screen.findByRole('alert')).toHaveTextContent(/minimal 6/i);
    expect(posted.length).toBe(0);
  });

  it('menonaktifkan pilihan role saat mengedit akun sendiri', async () => {
    mockUserApi([{ ...userFixture, role: 'superadmin' }]);
    render(<UserManagement currentUserId="u-1" />);

    (await screen.findByRole('button', { name: 'Edit Viewer Test (viewer@x.id)' })).click();
    await screen.findByRole('heading', { name: 'Edit Pengguna' });

    expect((screen.getByLabelText(/^Role$/) as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(/Role akun sendiri tidak bisa diubah/)).toBeInTheDocument();
  });
});
