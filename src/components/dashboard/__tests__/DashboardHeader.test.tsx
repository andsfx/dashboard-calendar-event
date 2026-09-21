import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardHeader } from '../DashboardHeader'

describe('DashboardHeader', () => {
  const mockProps = {
    isAdmin: true,
    searchQuery: '',
    onSearchChange: vi.fn(),
    onAddNew: vi.fn(),
    dashboardPath: '/events',
  }

  it('renders the route heading, not a generic dashboard title', () => {
    render(<DashboardHeader {...mockProps} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Jadwal Event')
    expect(screen.getByText('Kelola semua event dalam berbagai tampilan')).toBeInTheDocument()
  })

  it('renders the route description for the overview path', () => {
    render(<DashboardHeader {...mockProps} dashboardPath="/" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pusat Komando')
  })

  it('marks the current location through the single level-1 heading', () => {
    render(<DashboardHeader {...mockProps} />)
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Jadwal Event')
  })

  it('renders public heading when isAdmin is false', () => {
    render(<DashboardHeader {...mockProps} isAdmin={false} />)
    expect(screen.getByText('Jadwal Event')).toBeInTheDocument()
    expect(screen.getByText(/Jadwal acara publik/)).toBeInTheDocument()
  })

  it('shows admin controls when isAdmin is true', () => {
    render(<DashboardHeader {...mockProps} />)
    expect(screen.getByText('Tambah')).toBeInTheDocument()
  })

  it('hides admin controls when isAdmin is false', () => {
    render(<DashboardHeader {...mockProps} isAdmin={false} />)
    expect(screen.queryByText('Tambah')).not.toBeInTheDocument()
  })

  it('calls onAddNew when Tambah button clicked', () => {
    render(<DashboardHeader {...mockProps} />)
    fireEvent.click(screen.getByText('Tambah'))
    expect(mockProps.onAddNew).toHaveBeenCalled()
  })
})
