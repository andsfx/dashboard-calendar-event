/**
 * Test EventCrudModal — semantik keanggotaan series reguler saat edit.
 *
 * Kontrak yang dijaga:
 * - Edit anggota series (isRecurring=true) TANPA centang "Lepas dari series":
 *   payload tetap isRecurring=true + recurrenceGroupId asli — edit biasa
 *   (nama/jam/dll) tidak diam-diam melepaskan event dari seriesnya.
 * - Centang "Lepas dari series" → payload isRecurring=false, recurrenceGroupId=''
 *   (ditulis eksplisit ke DB, bukan di-skip mapper).
 * - Ubah tipe ke "Rangkaian acara" (multi_day) → auto-detach (recurring dan
 *   multi-day mutually exclusive).
 * - Banner "bagian dari series" hanya muncul untuk anggota series.
 * - Opsi "Event reguler" disabled saat edit (batch create hanya untuk acara baru).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventCrudModal } from '../EventCrudModal';
import type { EventItem } from '../../types';

vi.mock('../../utils/supabaseApi', () => ({ uploadToR2: vi.fn() }));

function makeSeriesEvent(partial: Partial<EventItem> = {}): EventItem {
  return {
    id: 'evt_1',
    rowIndex: 0,
    tanggal: '10 September 2026',
    dateStr: '2026-09-10',
    day: 'Kamis',
    jam: '10:00 - 21:00',
    acara: 'Senam Sehat',
    lokasi: 'Atrium Utama',
    eo: 'Internal MMB',
    pic: '',
    phone: '',
    keterangan: '',
    month: 'September',
    status: 'upcoming',
    category: 'Komunitas',
    categories: ['Komunitas'],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    sourceDraftId: '',
    isMultiDay: false,
    eventType: 'single',
    recurrenceGroupId: 'grp_abc123',
    isRecurring: true,
    posterUrl: '',
    organizationId: '',
    ...partial,
  } as EventItem;
}

function renderModal(editingEvent: EventItem | null, onSave: (ev: Partial<EventItem>) => Promise<boolean>) {
  render(
    <EventCrudModal
      isOpen
      onClose={() => {}}
      onSave={onSave}
      onSaveBatch={undefined}
      editingEvent={editingEvent}
      events={editingEvent ? [editingEvent] : []}
      eventAreas={[]}
    />
  );
}

function submitForm() {
  fireEvent.submit(screen.getByRole('button', { name: /simpan/i }).closest('form')!);
}

describe('EventCrudModal — keanggotaan series reguler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('edit anggota series tanpa detach → payload pertahankan isRecurring=true + groupId', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    renderModal(makeSeriesEvent(), onSave);
    submitForm();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0]![0] as Partial<EventItem>;
    expect(payload.isRecurring).toBe(true);
    expect(payload.recurrenceGroupId).toBe('grp_abc123');
  });

  it('centang "Lepas dari series" → payload isRecurring=false, groupId kosong', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    renderModal(makeSeriesEvent(), onSave);
    fireEvent.click(screen.getByRole('checkbox'));
    submitForm();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0]![0] as Partial<EventItem>;
    expect(payload.isRecurring).toBe(false);
    expect(payload.recurrenceGroupId).toBe('');
  });

  it('ubah tipe ke rangkaian acara → auto-detach series', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    renderModal(makeSeriesEvent(), onSave);
    fireEvent.click(screen.getByLabelText('Rangkaian acara'));
    // isi tanggal selesai agar validasi multi-day lolos
    const dateEndInput = screen.getAllByLabelText(/tanggal selesai/i)[0] as HTMLInputElement;
    fireEvent.change(dateEndInput, { target: { value: '2026-09-12' } });
    submitForm();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0]![0] as Partial<EventItem>;
    expect(payload.isRecurring).toBe(false);
    expect(payload.recurrenceGroupId).toBe('');
    expect(payload.isMultiDay).toBe(true);
  });

  it('banner series hanya untuk anggota series (event biasa tidak render banner)', () => {
    renderModal(makeSeriesEvent({ isRecurring: false, recurrenceGroupId: '' }), vi.fn());
    expect(screen.queryByText(/bagian dari series reguler/i)).not.toBeInTheDocument();
  });

  it('opsi "Event reguler" disabled saat edit', () => {
    renderModal(makeSeriesEvent(), vi.fn());
    const radio = screen.getByLabelText('Event reguler') as HTMLInputElement;
    expect(radio.disabled).toBe(true);
  });
});
