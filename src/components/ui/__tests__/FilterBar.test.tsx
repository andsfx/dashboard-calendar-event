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

  it('renders every filter as a labelled toolbar field', () => {
    render(<FilterBar {...mockProps} />)
    // Prototipe menaruh label di atas kontrol, bukan hanya aria-label.
    expect(screen.getByLabelText('Status')).toHaveValue('upcoming')
    expect(screen.getByLabelText('Kategori')).toBeInTheDocument()
    expect(screen.getByLabelText('Bulan')).toBeInTheDocument()
    expect(screen.getByLabelText('Prioritas')).toBeInTheDocument()
    expect(screen.getByLabelText('Cari nama event')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('offers every status option, with Semua as the unfiltered label', () => {
    render(<FilterBar {...mockProps} />)
    const status = screen.getByLabelText('Status')
    const options = within(status).getAllByRole('option').map(option => option.textContent)
    expect(options).toEqual(['Semua status', 'Internal', 'Berlangsung', 'Mendatang', 'Selesai'])
  })

  it('calls onFilterChange with the chosen status', () => {
    render(<FilterBar {...mockProps} />)
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ongoing' } })
    expect(mockProps.onFilterChange).toHaveBeenCalledWith('ongoing')
  })

  it('maps the Semua option back to the unfiltered state', () => {
    const onFilterChange = vi.fn()
    render(<FilterBar {...mockProps} onFilterChange={onFilterChange} />)
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Semua' } })
    expect(onFilterChange).toHaveBeenCalledWith('Semua')
  })

  it('keeps the status select in sync with the active filter', () => {
    render(<FilterBar {...mockProps} activeFilter="past" />)
    expect(screen.getByLabelText('Status')).toHaveValue('past')
  })

  it('hides the internal draft option when showDraft is false', () => {
    render(<FilterBar {...mockProps} showDraft={false} />)
    expect(within(screen.getByLabelText('Status')).queryByText('Internal')).not.toBeInTheDocument()
  })

  it('forwards the search query to onSearchChange', () => {
    const onSearchChange = vi.fn()
    render(<FilterBar {...mockProps} searchQuery="" onSearchChange={onSearchChange} />)
    fireEvent.change(screen.getByLabelText('Cari nama event'), { target: { value: 'bazaar' } })
    expect(onSearchChange).toHaveBeenCalledWith('bazaar')
  })

  it('renders month dropdown', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByLabelText('Bulan')).toBeInTheDocument()
  })

  it('renders category dropdown', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByLabelText('Kategori')).toBeInTheDocument()
  })

  it('renders priority dropdown when showPriority is true', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByLabelText('Prioritas')).toBeInTheDocument()
  })

  it('hides priority dropdown when showPriority is false', () => {
    render(<FilterBar {...mockProps} showPriority={false} />)
    expect(screen.queryByLabelText('Prioritas')).not.toBeInTheDocument()
  })

  it('dropdown bulan memuat semua opsi dan meneruskan perubahan', async () => {
    render(<FilterBar {...mockProps} />)
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    // shadcn Select (Radix): trigger membuka portal daftar opsi.
    await user.click(screen.getByLabelText('Bulan'))
    const option = await screen.findByRole('option', { name: 'Januari' })
    await user.click(option)
    expect(mockProps.onMonthChange).toHaveBeenCalledWith('Januari')
  })
})
