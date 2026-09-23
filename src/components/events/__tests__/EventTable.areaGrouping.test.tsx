import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EventTable } from '../EventTable'
import type { EventArea, EventItem } from '../../../types'

/**
 * Regresi: `areaId` yang menunjuk area tak dikenal (area dihapus/nonaktif)
 * dulu membuat `areaMap.get(areaKey)!` mengembalikan undefined lalu membaca
 * `.name` → TypeError → ErrorBoundary → seluruh dashboard layar putih.
 */
function event(id: string, areaId: string | null): EventItem {
  return {
    id,
    rowIndex: 0,
    dateStr: '2026-03-10',
    day: 'Selasa',
    jam: '10:00',
    acara: `Acara ${id}`,
    lokasi: 'Lt. 1',
    areaId,
    eo: 'EO',
    pic: 'PIC',
    phone: '0812',
    keterangan: '',
    month: '2026-03',
    category: 'Bazaar',
    categories: ['Bazaar'],
    priority: 'medium',
    eventModel: 'gratis' as EventItem['eventModel'],
    eventNominal: '0',
    eventModelNotes: '',
    tanggal: '10 Mar 2026',
    status: 'upcoming' as EventItem['status'],
  }
}

function area(id: string, name: string, sortOrder = 0): EventArea {
  return {
    id,
    name,
    description: '',
    coverPhotoUrl: '',
    sortOrder,
    isActive: true,
  }
}

describe('EventTable', () => {
  const noop = vi.fn()

  it('tidak crash saat areaId menunjuk area yang tidak dikenal', () => {
    const areas = [area('era_a', 'Area A'), area('era_b', 'Area B')]
    const events = [
      event('e1', 'era_a'),
      event('e2', 'era_b'),
      // Area ini tidak ada di `areas` — dulu memicu TypeError.
      event('e3', 'era_dihapus'),
    ]

    render(
      <EventTable
        events={events}
        isAdmin
        areas={areas}
        onEdit={noop}
        onDelete={noop}
        onDetail={noop}
      />,
    )

    // Baris tetap dirender dan area tak dikenal jatuh ke "Tanpa lokasi".
    // EventTable merender tampilan desktop + mobile, jadi pakai getAllByText.
    expect(screen.getAllByText('Acara e1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Acara e3').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tanpa lokasi').length).toBeGreaterThan(0)
  })

  it('tetap merender area yang terpetakan dengan namanya', () => {
    const areas = [area('era_a', 'Area A'), area('era_b', 'Area B')]
    const events = [event('e1', 'era_a'), event('e2', 'era_b')]

    render(
      <EventTable
        events={events}
        isAdmin
        areas={areas}
        onEdit={noop}
        onDelete={noop}
        onDetail={noop}
      />,
    )

    expect(screen.getAllByText('Area A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Area B').length).toBeGreaterThan(0)
  })
})
