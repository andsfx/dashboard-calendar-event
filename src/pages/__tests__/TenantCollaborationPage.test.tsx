import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { TenantCollaborationPage } from '../TenantCollaborationPage';

function mockFetchRoutes(routes: Record<string, { status?: number; body: unknown }>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    const route = routes[url];
    if (!route) {
      return {
        ok: false, status: 404,
        json: async () => ({ success: false, error: `No mock for ${url}` }),
        text: async () => `No mock for ${url}`,
      };
    }
    const status = route.status ?? 200;
    return {
      ok: status >= 200 && status < 300, status,
      json: async () => route.body,
      text: async () => JSON.stringify(route.body),
    };
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Satu gerai master MID seperti bentuk asli `GET /tenant/tenants`. */
const MID_TENANT = {
  id: '1801021146', name: 'Kopi Kenangan', floor: 'LT2', lot: '16 II',
  category: 'FOOD & BEVERAGE', pic: '', picTelp: '', logo: '', status: 'active', participantEvoucher: '',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/kolaborasi-tenant']}>
      <Routes>
        <Route path="/kolaborasi-tenant" element={<TenantCollaborationPage isDark={false} onToggleDark={() => undefined} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const areasRoute = { '/api/v1/areas': { body: { success: true, data: { areas: [], photos: [] } } } };

/** Combobox "Nama gerai" — halaman juga punya <select> jenis kegiatan. */
const geraiPicker = () => screen.getByRole('combobox', { name: /Nama gerai/ });

describe('TenantCollaborationPage — pemilihan gerai', () => {
  it('mengisi nama, unit, dan kategori dari master MID saat gerai dipilih', async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      ...areasRoute,
      '/api/v1/tenant/tenants?q=kopi': { body: { success: true, data: [MID_TENANT] } },
    });
    renderPage();

    await user.type(geraiPicker(), 'kopi');

    const option = await screen.findByRole('option', { name: /Kopi Kenangan/ });
    await user.click(option);

    await waitFor(() => expect(geraiPicker()).toHaveValue('Kopi Kenangan'));
    expect(screen.getByLabelText(/Nomor unit atau lot/)).toHaveValue('16 II');
    expect(screen.getByLabelText(/Kategori gerai/)).toHaveValue('FOOD & BEVERAGE');
    expect(screen.getByText(/FOOD & BEVERAGE · LT2 · Lot 16 II/)).toBeInTheDocument();
  });

  it('menolak submit sebelum gerai dipilih, dengan pesan yang bisa ditindaklanjuti', async () => {
    const user = userEvent.setup();
    mockFetchRoutes(areasRoute);
    renderPage();

    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan/ }));

    expect(await screen.findByText('Pilih gerai dari daftar, atau isi manual.')).toBeInTheDocument();
  });

  it('tidak meninggalkan unit/kategori gerai sebelumnya saat beralih ke isi manual', async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      ...areasRoute,
      '/api/v1/tenant/tenants?q=kopi': { body: { success: true, data: [MID_TENANT] } },
    });
    renderPage();

    await user.type(geraiPicker(), 'kopi');
    await user.click(await screen.findByRole('option', { name: /Kopi Kenangan/ }));
    await waitFor(() => expect(screen.getByLabelText(/Nomor unit atau lot/)).toHaveValue('16 II'));

    await user.click(screen.getByRole('button', { name: 'Gerai saya belum ada di daftar' }));

    expect(screen.getByLabelText(/Nama gerai/)).toHaveValue('');
    expect(screen.getByLabelText(/Nomor unit atau lot/)).toHaveValue('');
    expect(screen.getByLabelText(/Kategori gerai/)).toHaveValue('');
  });

  it('mempertahankan unit yang sudah disunting user saat pilihan gerai dilepas', async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      ...areasRoute,
      '/api/v1/tenant/tenants?q=kopi': { body: { success: true, data: [MID_TENANT] } },
    });
    renderPage();

    await user.type(geraiPicker(), 'kopi');
    await user.click(await screen.findByRole('option', { name: /Kopi Kenangan/ }));

    const unit = screen.getByLabelText(/Nomor unit atau lot/);
    await user.clear(unit);
    await user.type(unit, 'GF-01');

    await user.click(screen.getByRole('button', { name: 'Gerai saya belum ada di daftar' }));

    expect(screen.getByLabelText(/Nomor unit atau lot/)).toHaveValue('GF-01');
  });
});
