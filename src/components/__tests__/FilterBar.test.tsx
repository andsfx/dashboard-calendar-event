import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
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

  it('renders status tabs', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByText('Semua')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Berlangsung')).toBeInTheDocument()
    expect(screen.getByText('Mendatang')).toBeInTheDocument()
    expect(screen.getByText('Selesai')).toBeInTheDocument()
  })

  it('highlights active status tab', () => {
    render(<FilterBar {...mockProps} />)
    const upcomingTab = screen.getByText('Mendatang')
    expect(upcomingTab).toHaveClass('bg-white')
  })

  it('calls onFilterChange when status tab clicked', () => {
    render(<FilterBar {...mockProps} />)
    fireEvent.click(screen.getByText('Berlangsung'))
    expect(mockProps.onFilterChange).toHaveBeenCalledWith('ongoing')
  })

  it('hides draft tab when showDraft is false', () => {
    render(<FilterBar {...mockProps} showDraft={false} />)
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('renders month dropdown', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByLabelText('Semua Bulan')).toBeInTheDocument()
  })

  it('renders category dropdown', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByLabelText('Semua Kategori')).toBeInTheDocument()
  })

  it('renders priority dropdown when showPriority is true', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByLabelText('Semua Prioritas')).toBeInTheDocument()
  })

  it('hides priority dropdown when showPriority is false', () => {
    render(<FilterBar {...mockProps} showPriority={false} />)
    expect(screen.queryByLabelText('Semua Prioritas')).not.toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    render(<FilterBar {...mockProps} />)
    const monthDropdown = screen.getByLabelText('Semua Bulan')
    fireEvent.click(monthDropdown)
    expect(screen.getByText('Januari')).toBeInTheDocument()
    expect(screen.getByText('Februari')).toBeInTheDocument()
  })
})
