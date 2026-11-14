import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SponsorLandingPage } from '../SponsorLandingPage';
import { RegistrationPage } from '../RegistrationPage';
import { TenantParticipationPage } from '../TenantParticipationPage';

/**
 * Konvensi repo: subtree interaktif (form/input) tidak boleh berada di dalam
 * `RevealSection` — wrapper reveal pernah memindahkan node subtree-nya saat
 * tween GSAP mulai dan mencabut fokus elemen yang sedang diketik (insiden CI
 * 3x; lihat TenantCollaborationPage.test.tsx). Pola perbaikan: judul tetap
 * dianimasikan, form di luar `.reveal-stage`.
 */
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

describe('form publik tidak berada di dalam subtree reveal', () => {
  it('SponsorLandingPage: form minat dukungan di luar .reveal-stage', async () => {
    mockFetchRoutes({
      '/api/v1/sponsor/events': {
        body: {
          success: true,
          data: [{
            id: 'ev-1', date_str: '2026-12-01', acara: 'Bazar Akhir Tahun', lokasi: 'Atrium',
            jam: '10:00', eo: 'EO A',
            event_proposals: { id: 'prp-1', file_url: 'https://x/proposal.pdf', file_name: 'p.pdf', mime_type: 'application/pdf' },
          }],
        },
      },
    });
    render(
      <MemoryRouter initialEntries={['/sponsor']}>
        <Routes><Route path="/sponsor" element={<SponsorLandingPage isDark={false} onToggleDark={() => undefined} />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: /Kirim minat dukungan/ });
    // Guard ini harus menjaga sesuatu: halaman memang punya subtree reveal.
    expect(document.querySelector('.reveal-stage')).not.toBeNull();
    const form = document.querySelector('form');
    expect(form).not.toBeNull();
    expect(form?.closest('.reveal-stage')).toBeNull();
    // Kartu event juga berisi <a> interaktif — tidak boleh di subtree reveal.
    for (const anchor of document.querySelectorAll('a')) {
      expect(anchor.closest('.reveal-stage')).toBeNull();
    }
  });

  it('RegistrationPage: form pendaftaran di luar .reveal-stage', () => {
    mockFetchRoutes({});
    render(
      <MemoryRouter initialEntries={['/daftar']}>
        <Routes><Route path="/daftar" element={<RegistrationPage isDark={false} onToggleDark={() => undefined} />} /></Routes>
      </MemoryRouter>,
    );
    const form = document.querySelector('form');
    expect(document.querySelector('.reveal-stage')).not.toBeNull();
    expect(form).not.toBeNull();
    expect(form?.closest('.reveal-stage')).toBeNull();
  });

  it('TenantParticipationPage: kedua form (pengajuan + cek status) di luar .reveal-stage', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-participations/events': { body: { success: true, data: [] } },
      '/api/v1/tenant-participations/options': { body: { success: true, data: [] } },
    });
    render(
      <MemoryRouter initialEntries={['/partisipasi-tenant']}>
        <Routes><Route path="/partisipasi-tenant" element={<TenantParticipationPage isDark={false} onToggleDark={() => undefined} />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByText(/Cek status pengajuan/);
    expect(document.querySelector('.reveal-stage')).not.toBeNull();
    for (const form of document.querySelectorAll('form')) {
      expect(form.closest('.reveal-stage')).toBeNull();
    }
  });
});

