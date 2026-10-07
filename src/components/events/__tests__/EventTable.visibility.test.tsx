import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EventTable } from '../EventTable'
import type { EventItem } from '../../../types'

/**
 * Kontrak tombol visibilitas publik di tabel event (dashboard):
 * - event tampil  → tombol "Sembunyikan dari halaman publik" (mata tertutup)
 * - event tersembunyi ('draft') → tombol "Tampilkan di halaman publik" (mata terbuka)
 * - tanpa izin edit (`onToggleVisibility` undefined) tombol TIDAK dirender
 */
function event(id: string, status: EventItem['status']): EventItem {
  return {
    id,
    rowIndex: 0,
    dateStr: '2026-03-10',
    day: 'Selasa',
    jam: '10:00',
    acara: `Acara ${id}`,
    lokasi: 'Lt. 1',
    areaId: null,
    eo: 'EO',
    pic: 'PIC',
    phone: '0812',
    keterangan: '',
    month: '2026-03',
    category: 'Bazaar',
    categories: ['Bazaar'],
    priority: 'medium',
    eventModel: 'free',
    eventNominal: '0',
    eventModelNotes: '',
    tanggal: '10 Mar 2026',
    status,
  }
}

describe('EventTable — tombol visibilitas publik', () => {
  it('event tampil menawarkan "Sembunyikan dari halaman publik"', () => {
    const onToggleVisibility = vi.fn()
    render(
      <EventTable
        events={[event('evt_1', 'upcoming')]}
        isAdmin
        onToggleVisibility={onToggleVisibility}
        onDetail={vi.fn()}
      />,
    )
    const buttons = screen.getAllByLabelText('Sembunyikan dari halaman publik')
    fireEvent.click(buttons[0]!)
    expect(onToggleVisibility).toHaveBeenCalledTimes(1)
    expect(onToggleVisibility.mock.calls[0]![0].id).toBe('evt_1')
  })

  it('event tersembunyi menawarkan "Tampilkan di halaman publik"', () => {
    const onToggleVisibility = vi.fn()
    render(
      <EventTable
        events={[event('evt_2', 'draft')]}
        isAdmin
        onToggleVisibility={onToggleVisibility}
        onDetail={vi.fn()}
      />,
    )
    const buttons = screen.getAllByLabelText('Tampilkan di halaman publik')
    fireEvent.click(buttons[0]!)
    expect(onToggleVisibility.mock.calls[0]![0].id).toBe('evt_2')
  })

  it('tanpa izin edit, tombol visibilitas tidak dirender', () => {
    render(<EventTable events={[event('evt_3', 'upcoming')]} isAdmin onDetail={vi.fn()} />)
    expect(screen.queryByLabelText('Sembunyikan dari halaman publik')).toBeNull()
    expect(screen.queryByLabelText('Tampilkan di halaman publik')).toBeNull()
  })
})
