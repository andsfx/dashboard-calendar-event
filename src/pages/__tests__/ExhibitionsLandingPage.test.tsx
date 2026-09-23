import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ExhibitionsLandingPage } from '../ExhibitionsLandingPage';

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

const EXHIBITION = {
  id: 'exh-1', title: 'Beauty Fair', theme: 'Kecantikan', description: 'Pameran kecantikan',
  location: 'Atrium', date_start: '2026-10-01', date_end: '2026-10-05',
  collaboration_brief: 'Butuh brand', publication: 'published', accepting_applications: true,
  created_at: '2026-09-01',
};

describe('ExhibitionsLandingPage', () => {
  it('menampilkan daftar pameran publik', async () => {
    mockFetchRoutes({ '/api/v1/exhibitions': { body: { success: true, data: [EXHIBITION] } } });
    render(
      <MemoryRouter initialEntries={['/pameran']}>
        <Routes><Route path="/pameran" element={<ExhibitionsLandingPage isDark={false} onToggleDark={() => undefined} />} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Beauty Fair')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Ajukan Kolaborasi/ })).toHaveAttribute('href', '/pameran/exh-1');
  });

  it('mengirim pengajuan kolaborasi brand/EO', async () => {
    mockFetchRoutes({
      '/api/v1/exhibitions/exh-1': {
        body: {
          success: true,
          data: {
            exhibition: EXHIBITION,
            activations: [{
              event_id: 'ev-1', exhibition_id: 'exh-1', acara: 'Beauty Class',
              date_str: '2026-10-02', date_end: '2026-10-02', jam: '14:00', lokasi: 'Atrium', eo: 'Brand A',
            }],
          },
        },
      },
      '/api/v1/exhibition-leads': { body: { success: true, id: 'lead-1' } },
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/pameran/exh-1']}>
        <Routes><Route path="/pameran/:id" element={<ExhibitionsLandingPage isDark={false} onToggleDark={() => undefined} />} /></Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Beauty Class')).toBeInTheDocument());
    await user.type(screen.getByLabelText(/Nama brand/), 'Brand A');
    await user.type(screen.getByLabelText(/Nama PIC/), 'Rani');
    await user.type(screen.getByLabelText(/Nomor WhatsApp/), '08123456789');
    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan/ }));
    await waitFor(() => expect(screen.getByText(/Pengajuan terkirim/)).toBeInTheDocument());
  });
});
