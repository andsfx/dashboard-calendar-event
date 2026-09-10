import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    expect(toggle.getAttribute('aria-label')).toBe('Nonaktifkan Viewer Test');
  });
});
