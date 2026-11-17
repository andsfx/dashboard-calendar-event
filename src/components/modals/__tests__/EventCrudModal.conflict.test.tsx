/**
 * Test perilaku override bentrok area di EventCrudModal.
 *
 * Kontrak yang dijaga:
 * - `overrideAck` hanya berlaku untuk area/tanggal yang dilihat saat dicentang.
 *   Mengubah area atau tanggal setelah mencentang membatalkan persetujuan,
 *   sehingga `onSave` menerima argumen ketiga `false`.
 * - Submit saat konflik belum di-ack memberi pesan inline (bukan diam), dan
 *   `onSave` tidak dipanggil.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventCrudModal } from '../EventCrudModal';
import type { EventArea, EventItem } from '../../../types';

vi.mock('../../../utils/domainApi', () => ({ uploadToR2: vi.fn() }));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const AREAS: EventArea[] = [
  { id: 'area-1', name: 'Atrium', description: '', coverPhotoUrl: '', sortOrder: 1, isActive: true },
  { id: 'area-2', name: 'Hall', description: '', coverPhotoUrl: '', sortOrder: 2, isActive: true },
];

function makeEvent(partial: Partial<EventItem> = {}): EventItem {
  return {
    id: 'evt_1',
    rowIndex: 0,
    tanggal: '10 September 2026',
    dateStr: '2026-09-10',
    day: 'Kamis',
    jam: '10:00',
    acara: 'Acara Uji',
    lokasi: 'Atrium',
    eo: 'EO',
    pic: '',
    phone: '',
    keterangan: '',
    month: 'September',
    status: 'upcoming',
    category: 'Umum',
    categories: ['Umum'],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    isMultiDay: false,
    eventType: 'single',
    areaId: 'area-1',
    ...partial,
  } as EventItem;
}

const editingEvent = makeEvent();
const conflictingEvent = makeEvent({ id: 'evt_2', acara: 'Acara Lain' });

function renderModal() {
  const onSave = vi.fn().mockResolvedValue(true);
  render(
    <EventCrudModal
      isOpen
      onClose={() => {}}
      onSave={onSave}
      editingEvent={editingEvent}
      events={[editingEvent, conflictingEvent]}
      eventAreas={AREAS}
    />,
  );
  return onSave;
}

async function submitForm() {
  // ModalWrapper memuat md-dialog dengan React.lazy → tombol baru ada setelah render kedua.
  const btn = await screen.findByRole('button', { name: /simpan/i });
  fireEvent.submit(btn.closest('form')!);
}

describe('EventCrudModal — override bentrok area', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submit tanpa centang menampilkan pesan inline dan tidak memanggil onSave', async () => {
    const onSave = renderModal();

    await submitForm();

    expect(
      await screen.findByText(
        'Area ini sudah dipakai event lain pada tanggal tersebut. Centang izin bentrok atau ubah area/tanggal.',
      ),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('centang lalu ganti area mengirim overrideAck=false', async () => {
    const onSave = renderModal();

    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());

    fireEvent.change(screen.getByLabelText(/Area \(opsional\)/), { target: { value: 'area-2' } });
    await submitForm();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][2]).toBe(false);
  });

  it('centang lalu ganti tanggal mengirim overrideAck=false', async () => {
    const onSave = renderModal();

    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());

    fireEvent.change(screen.getByLabelText(/^Tanggal/), { target: { value: '2026-09-11' } });
    await submitForm();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][2]).toBe(false);
  });
});
