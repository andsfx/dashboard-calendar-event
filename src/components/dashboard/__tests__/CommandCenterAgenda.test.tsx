import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { CommandCenterAgenda } from '../CommandCenterAgenda';
import type { EventItem } from '../../../types';

const event = (id: string, acara: string, lokasi: string, dateStr: string, jam: string, status: EventItem['status']): EventItem => ({
  id,
  sheetRow: 1,
  rowIndex: 0,
  dateStr,
  day: 'Selasa',
  jam,
  acara,
  lokasi,
  eo: 'EO',
  pic: 'Andi',
  phone: '08123',
  keterangan: '',
  month: 'Oktober',
  category: 'Pameran',
  categories: ['Pameran'],
  priority: 'medium',
  eventModel: 'Paid',
  eventNominal: '',
  eventModelNotes: '',
  tanggal: dateStr,
  status,
});

function renderAgenda(props: Partial<Parameters<typeof CommandCenterAgenda>[0]> = {}) {
  const onDetail = vi.fn();
  render(
    <MemoryRouter>
      <CommandCenterAgenda ongoingEvents={[]} upcomingEvents={[]} onDetail={onDetail} {...props} />
    </MemoryRouter>,
  );
  return { onDetail };
}

describe('CommandCenterAgenda: pintu masuk jadwal', () => {
  it('menautkan ke rute yang memiliki jadwal penuh, bukan menyalinnya', () => {
    renderAgenda();

    expect(screen.getByRole('link', { name: /Buka Jadwal Event/ })).toHaveAttribute('href', '/dashboard/events');
  });

  it('menyebut event berjalan beserta lokasi dan waktunya', () => {
    renderAgenda({
      ongoingEvents: [event('e1', 'Talkshow Brand Lokal', 'Sky Garden', '2026-10-13', '10:00 - 12:00', 'ongoing')],
    });

    const row = screen.getByRole('button', { name: /Talkshow Brand Lokal/ });
    expect(within(row).getByText('Sky Garden')).toBeInTheDocument();
    expect(within(row).getByText('13 Oktober 2026')).toBeInTheDocument();
    expect(within(row).getByText('10:00 - 12:00')).toBeInTheDocument();
    expect(within(row).getByText('Berlangsung')).toBeInTheDocument();
  });

  it('membuka detail event saat baris ditekan', () => {
    const { onDetail } = renderAgenda({
      upcomingEvents: [event('e2', 'Launching Produk', 'Atrium Utama', '2026-10-20', '10:00 - 22:00', 'upcoming')],
    });

    screen.getByRole('button', { name: /Launching Produk/ }).click();
    expect(onDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 'e2' }));
  });

  it('membatasi daftar pada agenda triage, bukan jadwal penuh', () => {
    renderAgenda({
      upcomingEvents: Array.from({ length: 7 }, (_, i) =>
        event(`u${i}`, `Event ${i}`, 'Atrium Utama', '2026-10-20', '10:00', 'upcoming'),
      ),
    });

    expect(screen.getAllByText(/^Event \d$/)).toHaveLength(3);
  });

  it('menyatakan kosong beserta langkah berikutnya, bukan menyembunyikan bagiannya', () => {
    renderAgenda();

    expect(screen.getByText(/Tidak ada event yang sedang berlangsung sekarang/)).toBeInTheDocument();
    expect(screen.getByText(/Belum ada event mendatang di jadwal/)).toBeInTheDocument();
  });

  it('menyebut sebab dan langkah pemulihan saat jadwal gagal dimuat', () => {
    renderAgenda({ error: 'Koneksi ke server gagal.' });

    expect(screen.getByText(/Jadwal event gagal dimuat: Koneksi ke server gagal\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buka Jadwal Event/ })).toBeInTheDocument();
  });
});
