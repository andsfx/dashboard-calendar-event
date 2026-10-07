import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EventCrudModal } from '../EventCrudModal'
import type { EventItem } from '../../../types'

/**
 * Kontrak kontrol visibilitas di modal edit (jadi opsi tampil/sembunyi juga
 * tersedia dari tampilan Kanban/Linimasa/Kalender, bukan hanya baris tabel):
 * - switch mencerminkan status event ('draft' → mati, selain itu → hidup)
 * - mengubahnya mengirim lewat jalur eksplisit `onToggleVisibility`
 * - TIDAK berubah → jalur itu tidak dipanggil (edit biasa tak sentuh lifecycle)
 * - saat membuat event baru, kontrol tidak ditawarkan
 */
vi.mock('../../../utils/domainApi', () => ({ uploadToR2: vi.fn() }));

function makeEvent(status: EventItem['status']): EventItem {
  return {
    id: 'evt_1',
    rowIndex: 1,
    dateStr: '2026-09-10',
    day: 'Kamis',
    tanggal: '10 September 2026',
    jam: '10:00',
    acara: 'Acara Uji',
    lokasi: 'Atrium',
    eo: 'EO',
    pic: 'PIC',
    phone: '0812',
    keterangan: '',
    month: 'September',
    category: 'Umum',
    categories: ['Umum'],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    status,
  } as EventItem
}

function renderModal(editingEvent: EventItem | null, handlers: {
  onSave: (data: Partial<EventItem>, lifecycle?: 'draft' | 'published') => Promise<boolean>
}) {
  render(
    <EventCrudModal
      isOpen
      onClose={() => {}}
      onSave={handlers.onSave}
      editingEvent={editingEvent}
      events={editingEvent ? [editingEvent] : []}
      eventAreas={[]}
    />,
  )
}

function submitForm() {
  fireEvent.submit(screen.getByRole('button', { name: /simpan/i }).closest('form')!)
}

describe('EventCrudModal — kontrol visibilitas halaman publik', () => {
  beforeEach(() => vi.clearAllMocks())

  it('switch ON untuk event yang tampil, dan tidak mengirim lifecycle bila tidak diubah', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    renderModal(makeEvent('upcoming'), { onSave })

    const sw = screen.getByRole('switch', { name: 'Tampilkan di halaman publik' })
    expect(sw).toBeChecked()

    submitForm()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    // Argumen kedua undefined → edit biasa tidak menyentuh kolom lifecycle.
    expect(onSave.mock.calls[0]![1]).toBeUndefined()
  })

  it('switch OFF untuk event tersembunyi ("draft")', () => {
    renderModal(makeEvent('draft'), { onSave: vi.fn().mockResolvedValue(true) })
    expect(screen.getByRole('switch', { name: 'Tampilkan di halaman publik' })).not.toBeChecked()
  })

  it('mematikan switch mengirim lifecycle "draft" pada request yang sama', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    renderModal(makeEvent('upcoming'), { onSave })

    fireEvent.click(screen.getByRole('switch', { name: 'Tampilkan di halaman publik' }))
    submitForm()

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0]![1]).toBe('draft')
  })

  it('menyalakan switch mengirim lifecycle "published"', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    renderModal(makeEvent('draft'), { onSave })

    fireEvent.click(screen.getByRole('switch', { name: 'Tampilkan di halaman publik' }))
    submitForm()

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0]![1]).toBe('published')
  })

  it('saat membuat event baru kontrol tidak ditawarkan', () => {
    renderModal(null, { onSave: vi.fn().mockResolvedValue(true) })
    expect(screen.queryByRole('switch', { name: 'Tampilkan di halaman publik' })).toBeNull()
  })
})
