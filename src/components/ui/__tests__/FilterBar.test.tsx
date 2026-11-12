import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { useState } from 'react'
import type { EventStatus } from '../../../types'
import { FilterBar } from '../FilterBar'

describe('FilterBar', () => {
  const mockProps = {
    activeFilter: 'upcoming' as const,
    onFilterChange: vi.fn(),
    categories: ['Semua', 'Bazaar', 'Festival'],
    activeCategory: 'Semua',
    onCategoryChange: vi.fn(),
    activePriority: 'Semua',
    onPriorityChange: vi.fn(),
    months: ['Semua', 'Januari', 'Februari'],
    activeMonth: 'Semua',
    onMonthChange: vi.fn(),
  }

  it('renders the status filter as a labelled group of toggle chips', () => {
    render(<FilterBar {...mockProps} />)
    // Grup toggle, bukan tablist: tidak ada tabpanel di bawah baris ini.
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Filter status acara' })).toBeInTheDocument()
    expect(screen.getByText('Semua')).toBeInTheDocument()
    expect(screen.getByText('Internal')).toBeInTheDocument()
    expect(screen.getByText('Berlangsung')).toBeInTheDocument()
    expect(screen.getByText('Mendatang')).toBeInTheDocument()
    expect(screen.getByText('Selesai')).toBeInTheDocument()

    // Titik status berwarna hadir di chip non-'Semua'; chip 'Semua' tanpa titik.
    const mendatangChip = screen.getByRole('button', { name: 'Mendatang' })
    const semuaChip = screen.getByRole('button', { name: 'Semua' })
    expect(mendatangChip.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(semuaChip.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('marks the active status chip as pressed', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByRole('button', { name: 'Mendatang' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Berlangsung' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onFilterChange when a status chip is clicked', () => {
    render(<FilterBar {...mockProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Berlangsung' }))
    expect(mockProps.onFilterChange).toHaveBeenCalledWith('ongoing')
  })

  it('chip status yang sudah aktif tetap terpilih setelah diklik ulang', () => {
    function Harness() {
      const [activeFilter, setActiveFilter] = useState<EventStatus | 'Semua'>('Semua')
      return <FilterBar {...mockProps} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
    }
    render(<Harness />)

    const selesai = screen.getByRole('button', { name: 'Selesai' })
    fireEvent.click(selesai)
    expect(selesai).toHaveAttribute('aria-pressed', 'true')

    // Klik kedua: filter yang sama diterapkan ulang, state React tidak berubah.
    fireEvent.click(selesai)
    expect(selesai).toHaveAttribute('aria-pressed', 'true')
    expect(selesai).toHaveAttribute('data-state', 'on')
    // Filternya memang masih berlaku — chip "Filter aktif" masih ada.
    expect(screen.getByRole('button', { name: 'Hapus filter Status: Selesai' })).toBeInTheDocument()
  })

  it('chip "Filter aktif" tetap memakai klik sebagai aksi hapus, bukan toggle', () => {
    const onFilterChange = vi.fn()
    render(<FilterBar {...mockProps} onFilterChange={onFilterChange} />)

    const chip = screen.getByRole('button', { name: 'Hapus filter Status: Mendatang' })
    fireEvent.click(chip)

    expect(onFilterChange).toHaveBeenCalledWith('Semua')
    expect(chip).not.toHaveAttribute('aria-pressed')
  })

  it('hides internal draft chip when showDraft is false', () => {
    render(<FilterBar {...mockProps} showDraft={false} />)
    expect(screen.queryByText('Internal')).not.toBeInTheDocument()
  })

  it('renders month dropdown', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByLabelText('Semua bulan')).toBeInTheDocument()
  })

  it('renders category dropdown', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByLabelText('Semua kategori')).toBeInTheDocument()
  })

  it('renders priority dropdown when showPriority is true', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByLabelText('Semua prioritas')).toBeInTheDocument()
  })

  it('hides priority dropdown when showPriority is false', () => {
    render(<FilterBar {...mockProps} showPriority={false} />)
    expect(screen.queryByLabelText('Semua prioritas')).not.toBeInTheDocument()
  })

  it('dropdown bulan memuat semua opsi dan meneruskan perubahan', async () => {
    render(<FilterBar {...mockProps} />)
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    // shadcn Select (Radix): trigger membuka portal daftar opsi.
    await user.click(screen.getByLabelText('Semua bulan'))
    const option = await screen.findByRole('option', { name: 'Januari' })
    await user.click(option)
    expect(mockProps.onMonthChange).toHaveBeenCalledWith('Januari')
  })
})
