/**
 * Test EventDetailContent — shared body detail (modal admin + halaman publik).
 *
 * Kontrak yang dijaga:
 * - Rupiah: "1000000" → "Rp 1.000.000"; sudah berformat ("Rp 5.000.000") dibiarkan; "0" → "Rp 0".
 * - Admin (isAdmin=true): PIC, Nomor Handphone, Model Event, Nominal, Keterangan Model Event tampil.
 * - Publik (isAdmin=false): field internal TIDAK tampil (PIC/phone/nominal dll), hanya data publik.
 * - Field kosong tidak render InfoRow kosong (string kosong → tidak tampil).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventDetailContent } from '../EventDetailContent';
import type { EventItem } from '../../types';

function makeEvent(partial: Partial<EventItem> = {}): EventItem {
  return {
    id: 'evt_1',
    rowIndex: 0,
    tanggal: '10 September 2026',
    dateStr: '2026-09-10',
    day: 'Kamis',
    jam: '10:00 - 21:00',
    acara: 'Festival Minang 2026',
    lokasi: 'Atrium Utama',
    eo: 'Komunitas Minang',
    pic: 'PIC Rahasia',
    phone: '081234567890',
    keterangan: 'Deskripsi',
    month: 'September',
    status: 'upcoming',
    category: 'Festival',
    categories: ['Festival'],
    priority: 'medium',
    eventModel: 'support',
    eventNominal: '1000000',
    eventModelNotes: 'notes internal',
    sourceDraftId: '',
    isMultiDay: false,
    eventType: 'single',
    recurrenceGroupId: '',
    posterUrl: '',
    organizationId: '',
    ...partial,
  } as EventItem;
}

describe('EventDetailContent', () => {
  it('nominal polos "1000000" → "Rp 1.000.000" (admin)', () => {
    render(<EventDetailContent event={makeEvent({ eventNominal: '1000000' })} isAdmin />);
    expect(screen.getByText('Rp 1.000.000')).toBeInTheDocument();
  });

  it('nominal sudah berformat "Rp 5.000.000" tidak diubah', () => {
    render(<EventDetailContent event={makeEvent({ eventNominal: 'Rp 5.000.000' })} isAdmin />);
    expect(screen.getByText('Rp 5.000.000')).toBeInTheDocument();
  });

  it('nominal "0" → "Rp 0"', () => {
    render(<EventDetailContent event={makeEvent({ eventNominal: '0' })} isAdmin />);
    expect(screen.getByText('Rp 0')).toBeInTheDocument();
  });

  it('nominal teks non-numerik dibiarkan apa adanya', () => {
    render(<EventDetailContent event={makeEvent({ eventNominal: 'Nego' })} isAdmin />);
    expect(screen.getByText('Nego')).toBeInTheDocument();
  });

  it('admin melihat field internal: PIC, phone, model, nominal, keterangan model', () => {
    render(<EventDetailContent event={makeEvent()} isAdmin />);
    expect(screen.getByText('PIC Rahasia')).toBeInTheDocument();
    expect(screen.getByText('081234567890')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Rp 1.000.000')).toBeInTheDocument();
    expect(screen.getByText('notes internal')).toBeInTheDocument();
  });

  it('publik (isAdmin=false) TIDAK melihat PIC/phone/nominal/model/notes; hanya data publik', () => {
    render(<EventDetailContent event={makeEvent()} isAdmin={false} />);
    expect(screen.queryByText('PIC Rahasia')).not.toBeInTheDocument();
    expect(screen.queryByText('081234567890')).not.toBeInTheDocument();
    expect(screen.queryByText('Rp 1.000.000')).not.toBeInTheDocument();
    expect(screen.queryByText('notes internal')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Penanggung Jawab/)).not.toBeInTheDocument();
  });

  it('field kosong tidak render InfoRow (nominal kosong → tidak ada elemen Nominal Event)', () => {
    render(<EventDetailContent event={makeEvent({ eventNominal: '', eventModel: '', pic: '', phone: '' })} isAdmin />);
    expect(screen.queryByText('Nominal Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Model Event')).not.toBeInTheDocument();
  });
});
