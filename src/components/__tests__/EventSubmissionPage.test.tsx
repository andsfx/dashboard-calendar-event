/**
 * Tes EventSubmissionPage — alur pengajuan event publik:
 * - Submit valid memanggil createDraftEvent dengan progress 'draft' + proxyKind 'public'.
 * - Honeypot terisi → sukses palsu TANPA memanggil createDraftEvent (drop bot).
 * - Validasi: HP invalid → error Indonesia, tidak submit.
 * - Success state render nama acara.
 * - Error API → pesan 'Gagal mengirim pengajuan. Coba lagi nanti.'
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EventSubmissionPage } from '../EventSubmissionPage';
import { createDraftEvent } from '../../utils/supabaseApi';

vi.mock('../../utils/supabaseApi', () => ({
  createDraftEvent: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <EventSubmissionPage isDark={false} onToggleDark={() => {}} />
    </MemoryRouter>,
  );
}

const createDraftEventMock = vi.mocked(createDraftEvent);

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nama Acara/), 'Workshop Batik Modern');
  await user.type(screen.getByLabelText(/Tanggal Mulai/, { selector: '#sub-date' }), '2026-10-20');
  await user.type(screen.getByLabelText(/Nama Organisasi/), 'Kriya Nusantara');
  await user.type(screen.getByLabelText(/Nama PIC/), 'Budi Santoso');
  await user.type(screen.getByLabelText(/No\. HP/), '081234567890');
}

describe('EventSubmissionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createDraftEventMock.mockResolvedValue({ row: 0, id: '' });
  });

  it('submit valid memanggil createDraftEvent dengan progress draft + proxyKind public', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan/i }));

    await waitFor(() => {
      expect(createDraftEventMock).toHaveBeenCalledTimes(1);
    });
    const [payload, proxyKind] = createDraftEventMock.mock.calls[0];
    expect(proxyKind).toBe('public');
    expect(payload.progress).toBe('draft');
    expect(payload.acara).toBe('Workshop Batik Modern');
    expect(payload.pic).toBe('Budi Santoso');
  });

  it('honeypot terisi → sukses palsu tanpa insert', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.type(screen.getByLabelText(/Website/), 'http://spam.example');
    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pengajuan Terkirim/i)).toBeInTheDocument();
    });
    expect(createDraftEventMock).not.toHaveBeenCalled();
  });

  it('HP invalid → error Indonesia, tidak submit', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/Nama Acara/), 'Workshop Batik');
    await user.type(screen.getByLabelText(/Tanggal Mulai/, { selector: '#sub-date' }), '2026-10-20');
    await user.type(screen.getByLabelText(/Nama Organisasi/), 'Kriya Nusantara');
    await user.type(screen.getByLabelText(/Nama PIC/), 'Budi');
    await user.type(screen.getByLabelText(/No\. HP/), 'abc');
    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
    expect(createDraftEventMock).not.toHaveBeenCalled();
  });

  it('wajib diisi kosong → error per kolom, tidak submit', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan/i }));
    expect(await screen.findByText(/Periksa kolom yang ditandai/)).toBeInTheDocument();
    expect(createDraftEventMock).not.toHaveBeenCalled();
  });

  it('success state menampilkan nama acara', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan/i }));

    await waitFor(() => {
      expect(screen.getByText(/Workshop Batik Modern/)).toBeInTheDocument();
    });
  });

  it('gagal API → pesan error Indonesia', async () => {
    createDraftEventMock.mockRejectedValueOnce(new Error('RLS violation'));
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan/i }));

    await waitFor(() => {
      expect(screen.getByText(/Gagal mengirim pengajuan/i)).toBeInTheDocument();
    });
  });
});