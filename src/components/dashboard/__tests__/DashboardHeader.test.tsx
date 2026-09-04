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
    stats: { total: 42, ongoing: 7 },
  }

  it('renders admin heading with real stats when isAdmin is true', () => {
    render(<DashboardHeader {...mockProps} />)
    expect(screen.getByText('Dashboard Event')).toBeInTheDocument()
    expect(screen.getByText('42 acara dalam pipeline · 7 sedang berlangsung')).toBeInTheDocument()
  })

  it('renders loading subtitle when stats not provided', () => {
    render(<DashboardHeader isAdmin searchQuery="" onSearchChange={vi.fn()} />)
    expect(screen.getByText('Memuat statistik acara…')).toBeInTheDocument()
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
