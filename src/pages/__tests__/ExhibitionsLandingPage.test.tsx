import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ExhibitionsLandingPage } from '../ExhibitionsLandingPage';

function mockFetchRoutes(routes: Record<string, { status?: number; body: unknown }>) {
  const calls: { url: string; body: unknown }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    if (init?.body) calls.push({ url, body: JSON.parse(String(init.body)) });
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
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const PROGRAM = {
  id: 'exh-1',
  slug: 'sarapan-di-metmal',
  title: 'Sarapan di Metmal',
  subtitle: 'Kolaborasi komunitas Minggu pagi',
  program_type: 'aktivasi_marcomm',
  theme: '',
  description: 'Ruang interaksi publik Minggu pagi.',
  location: 'Area Parkir Timur',
  date_start: '2026-11-29',
  date_end: '2026-12-27',
  schedule_note: 'Setiap hari Minggu, 06.30 - 10.00 WIB',
  target_audience: 'Terbuka untuk umum',
  collaboration_brief: '',
  looking_for_summary: 'Terbuka untuk komunitas dan UMKM lokal.',
  looking_for_tags: ['Olahraga & Senam Santai'],
  benefits: [{ title: 'Arus pengunjung pagi', description: 'Komunitas menjangkau keluarga.' }],
  cover_image_url: '',
  publication: 'published',
  status: 'open',
  is_featured: false,
  accepting_applications: true,
  default_organization_type: 'komunitas',
  form_config: { show_technical_needs: true, show_participant_estimate: true },
  created_at: '2026-11-01',
};

const SLOT = {
  id: 'slot-1',
  exhibition_id: 'exh-1',
  slot_date: '2026-11-29',
  start_time: '06:30:00',
  end_time: '10:00:00',
  zone_name: 'Area Parkir Timur',
  capacity: 3,
  slot_status: 'open',
  public_note: '',
};

describe('ExhibitionsLandingPage (Kolaborasi)', () => {
  it('menampilkan daftar program dengan tautan detail baru', async () => {
    mockFetchRoutes({ '/api/v1/exhibitions': { body: { success: true, data: [PROGRAM] } } });
    render(
      <MemoryRouter initialEntries={['/kolaborasi']}>
        <Routes><Route path="/kolaborasi" element={<ExhibitionsLandingPage isDark={false} onToggleDark={() => undefined} />} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Sarapan di Metmal')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Lihat detail & gabung/ })).toHaveAttribute('href', '/kolaborasi/sarapan-di-metmal');
    expect(screen.getByText('Dibuka untuk Kolaborasi')).toBeInTheDocument();
  });

  it('memilih slot lalu mengirim pengajuan dan menampilkan kode referensi', async () => {
    const calls = mockFetchRoutes({
      '/api/v1/exhibitions/sarapan-di-metmal': {
        body: {
          success: true,
          data: {
            exhibition: PROGRAM,
            activations: [],
            slots: [SLOT],
            agenda: [{
              id: 'lead-0', program_id: 'exh-1', slot_id: 'slot-1',
              organization_name: 'Komunitas Senam', organization_type: 'komunitas',
              contribution_type: 'pengisi_aktivasi', public_activity_title: 'Senam Pagi Bersama',
              public_activity_summary: 'Senam santai untuk semua usia.', status: 'scheduled',
              slot_date: '2026-11-29', start_time: '06:30:00', end_time: '10:00:00', zone_name: 'Area Parkir Timur',
            }],
          },
        },
      },
      '/api/v1/exhibition-leads': { body: { success: true, id: 'lead-1', referenceCode: 'KOL-2611-A4F2' } },
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/kolaborasi/sarapan-di-metmal']}>
        <Routes><Route path="/kolaborasi/:id" element={<ExhibitionsLandingPage isDark={false} onToggleDark={() => undefined} />} /></Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Senam Pagi Bersama')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Pilih tanggal ini' }));
    expect(screen.getByText(/Tanggal sudah dipilih/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pilih tanggal yang diminati/)).toHaveValue('slot-1');

    await user.type(screen.getByLabelText(/Nama komunitas, brand, atau tim/), 'Komunitas Senam Bekasi');
    await user.type(
      screen.getByLabelText(/Ceritakan rencana kegiatan Anda/),
      'Kami ingin mengadakan senam bersama selama 45 menit untuk keluarga.',
    );
    await user.type(screen.getByLabelText(/Nama lengkap PIC/), 'Rani');
    await user.type(screen.getByLabelText(/Nomor WhatsApp aktif/), '081234567890');
    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan Kolaborasi/ }));

    await waitFor(() => expect(screen.getByText('Pengajuan Anda Sudah Kami Terima!')).toBeInTheDocument());
    expect(screen.getByText('KOL-2611-A4F2')).toBeInTheDocument();

    const submitted = calls.find(call => call.url.includes('/exhibition-leads'));
    expect(submitted?.body).toMatchObject({
      exhibitionId: 'exh-1',
      preferredSlotId: 'slot-1',
      organizationName: 'Komunitas Senam Bekasi',
      contactName: 'Rani',
      phone: '081234567890',
      flexibleDate: false,
    });
  });

  it('menampilkan kartu info saat slot program penuh', async () => {
    mockFetchRoutes({
      '/api/v1/exhibitions/exh-full': {
        body: {
          success: true,
          data: {
            exhibition: { ...PROGRAM, id: 'exh-full', slug: 'exh-full', status: 'full' },
            activations: [], slots: [], agenda: [],
          },
        },
      },
    });
    render(
      <MemoryRouter initialEntries={['/kolaborasi/exh-full']}>
        <Routes><Route path="/kolaborasi/:id" element={<ExhibitionsLandingPage isDark={false} onToggleDark={() => undefined} />} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Slot periode ini sudah penuh')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Kirim Pengajuan Kolaborasi/ })).not.toBeInTheDocument();
  });

  it('menutup formulir saat program sudah selesai', async () => {
    mockFetchRoutes({
      '/api/v1/exhibitions/exh-done': {
        body: {
          success: true,
          data: {
            exhibition: { ...PROGRAM, id: 'exh-done', slug: 'exh-done', status: 'completed' },
            activations: [], slots: [], agenda: [],
          },
        },
      },
    });
    render(
      <MemoryRouter initialEntries={['/kolaborasi/exh-done']}>
        <Routes><Route path="/kolaborasi/:id" element={<ExhibitionsLandingPage isDark={false} onToggleDark={() => undefined} />} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Program Telah Selesai')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Kirim Pengajuan Kolaborasi/ })).not.toBeInTheDocument();
  });
});
