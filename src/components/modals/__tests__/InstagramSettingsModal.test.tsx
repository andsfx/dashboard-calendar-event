import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InstagramSettingsModal } from '../InstagramSettingsModal';

/**
 * Regresi: tombol "Sync & Cache Instagram Posts" dulu menelan SEMUA kegagalan
 * menjadi "Gagal terhubung ke server" — termasuk 500 "APIFY_API_TOKEN belum
 * dikonfigurasi", 502 dari Apify, dan 401 sesi kedaluwarsa. Pesan asli server
 * sekarang diteruskan lewat ApiError.message.
 */
describe('InstagramSettingsModal — pesan galat sync', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const renderModal = () =>
    render(<InstagramSettingsModal posts={['https://instagram.com/p/abc']} onSave={async () => true} />);

  const clickSync = () =>
    fireEvent.click(screen.getByRole('button', { name: /Sync & Cache Instagram Posts/ }));

  it('menampilkan pesan asli server (500 token Apify kosong), bukan pesan generik', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'APIFY_API_TOKEN belum dikonfigurasi' }),
      } as unknown as Response),
    );

    renderModal();
    clickSync();

    await waitFor(() =>
      expect(screen.getByText(/APIFY_API_TOKEN belum dikonfigurasi/)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Gagal terhubung ke server/)).not.toBeInTheDocument();
  });

  it('menampilkan pesan generik HANYA saat koneksi benar-benar gagal (network)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    renderModal();
    clickSync();

    await waitFor(() =>
      expect(screen.getByText(/Gagal terhubung ke server/)).toBeInTheDocument(),
    );
  });
});
