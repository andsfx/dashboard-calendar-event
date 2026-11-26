import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardHeader } from '../DashboardHeader'

describe('DashboardHeader', () => {
  const mockProps = {
    isAdmin: true,
    primaryAction: { label: 'Tambah', onClick: vi.fn() },
    dashboardPath: '/events',
  }

  it('renders the route heading, not a generic dashboard title', () => {
    render(<DashboardHeader {...mockProps} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Jadwal event')
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
    expect(headings[0]).toHaveTextContent('Jadwal event')
  })

  it('renders public heading when isAdmin is false', () => {
    render(<DashboardHeader {...mockProps} isAdmin={false} />)
    expect(screen.getByText('Jadwal event')).toBeInTheDocument()
    expect(screen.getByText(/Jadwal acara publik/)).toBeInTheDocument()
  })

  it('shows the primary action when the route supplies one', () => {
    render(<DashboardHeader {...mockProps} />)
    expect(screen.getByText('Tambah')).toBeInTheDocument()
  })

  it('calls the primary action when clicked', () => {
    render(<DashboardHeader {...mockProps} />)
    fireEvent.click(screen.getByText('Tambah'))
    expect(mockProps.primaryAction.onClick).toHaveBeenCalled()
  })

  it('hides admin controls when isAdmin is false', () => {
    render(<DashboardHeader {...mockProps} isAdmin={false} />)
    expect(screen.queryByText('Tambah')).not.toBeInTheDocument()
  })

  // Regression: the plate action was passed unconditionally, so on
  // /dashboard/users, /analytics, /activity-log, /registrations and /drafts the
  // button labelled "Tambah" opened the *event* creation form.
  it('renders no primary action when the route supplies none', () => {
    render(<DashboardHeader {...mockProps} primaryAction={undefined} dashboardPath="/users" />)
    expect(screen.queryByText('Tambah')).not.toBeInTheDocument()
  })

  // Regression: the plate search wrote to the shared event filter, so on
  // non-event routes it was a visible control that changed nothing.
  // Pencarian event pindah ke toolbar jadwal (label "Cari nama event"); kepala
  // halaman tidak boleh menawarkan input kedua dengan filter yang sama.
  it('never renders a search field in the plate', () => {
    render(<DashboardHeader {...mockProps} />)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})
