import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { filterPublicEvents, PublicEventList, sortPublicList } from '../PublicEventList'
import type { EventItem } from '../../types'

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'status' | 'acara'>): EventItem {
  return {
    rowIndex: 0,
    tanggal: '1 Juni 2025',
    dateStr: '2025-06-01',
    day: 'Minggu',
    jam: '10:00 - 12:00',
    lokasi: 'Atrium',
    eo: 'EO Test',
    pic: '',
    phone: '',
    keterangan: 'Deskripsi',
    month: 'Juni',
    category: 'Bazaar',
    categories: ['Bazaar'],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    ...partial,
  } as EventItem
}

const sample: EventItem[] = [
  ev({ id: '1', status: 'ongoing', acara: 'Grand Bazaar', dateStr: '2025-06-01', lokasi: 'Atrium Utama' }),
  ev({ id: '2', status: 'upcoming', acara: 'Workshop Batik', dateStr: '2025-06-10', category: 'Workshop', categories: ['Workshop'], month: 'Juni' }),
  ev({ id: '3', status: 'upcoming', acara: 'Food Fest', dateStr: '2025-06-05', category: 'Festival', categories: ['Festival'], eo: 'Nusantara Culinary' }),
  ev({ id: '4', status: 'past', acara: 'Old Fair', dateStr: '2025-05-01', month: 'Mei' }),
  ev({ id: '5', status: 'draft', acara: 'Draft Secret', dateStr: '2025-07-01' }),
]

describe('filterPublicEvents', () => {
  it('default "all" hides past and draft', () => {
    const result = filterPublicEvents(sample, 'all', 'Semua', 'Semua', '')
    expect(result.map(e => e.id)).toEqual(['1', '3', '2'])
    expect(result.every(e => e.status !== 'past' && e.status !== 'draft')).toBe(true)
  })

  it('chip past only returns past events, newest first', () => {
    const withPast = [
      ...sample,
      ev({ id: '6', status: 'past', acara: 'Older', dateStr: '2025-04-01', month: 'April' }),
    ]
    const result = filterPublicEvents(withPast, 'past', 'Semua', 'Semua', '')
    expect(result.map(e => e.id)).toEqual(['4', '6'])
  })

  it('filters by category and search (AND)', () => {
    const byCat = filterPublicEvents(sample, 'all', 'Workshop', 'Semua', '')
    expect(byCat.map(e => e.id)).toEqual(['2'])

    const bySearch = filterPublicEvents(sample, 'all', 'Semua', 'Semua', 'nusantara')
    expect(bySearch.map(e => e.id)).toEqual(['3'])
  })

  it('sorts ongoing before upcoming by date asc', () => {
    const sorted = sortPublicList([
      ev({ id: 'u2', status: 'upcoming', acara: 'B', dateStr: '2025-06-20' }),
      ev({ id: 'o', status: 'ongoing', acara: 'A', dateStr: '2025-06-01' }),
      ev({ id: 'u1', status: 'upcoming', acara: 'C', dateStr: '2025-06-05' }),
    ])
    expect(sorted.map(e => e.id)).toEqual(['o', 'u1', 'u2'])
  })
})

describe('PublicEventList', () => {
  it('renders default list without past events', () => {
    render(<PublicEventList events={sample} onDetail={vi.fn()} />)
    expect(screen.getByText('Grand Bazaar')).toBeInTheDocument()
    expect(screen.getByText('Workshop Batik')).toBeInTheDocument()
    expect(screen.queryByText('Old Fair')).not.toBeInTheDocument()
    expect(screen.queryByText('Draft Secret')).not.toBeInTheDocument()
  })

  it('shows past when Selesai chip pressed', () => {
    render(<PublicEventList events={sample} onDetail={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Selesai' }))
    expect(screen.getByText('Old Fair')).toBeInTheDocument()
    expect(screen.queryByText('Grand Bazaar')).not.toBeInTheDocument()
  })

  it('calls onDetail when row clicked', () => {
    const onDetail = vi.fn()
    render(<PublicEventList events={sample} onDetail={onDetail} />)
    fireEvent.click(screen.getByText('Grand Bazaar'))
    expect(onDetail).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))
  })

  it('shows empty filter state and reset', () => {
    render(<PublicEventList events={sample} onDetail={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Cari acara/i), { target: { value: 'zzzz-no-match' } })
    expect(screen.getByText('Tidak ada event yang cocok')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }))
    expect(screen.getByText('Grand Bazaar')).toBeInTheDocument()
  })
})
