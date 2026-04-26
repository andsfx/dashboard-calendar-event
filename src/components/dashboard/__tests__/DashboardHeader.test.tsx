import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardHeader } from '../DashboardHeader'

describe('DashboardHeader', () => {
  const mockProps = {
    isAdmin: true,
    searchQuery: '',
    onSearchChange: vi.fn(),
    showSettingsMenu: false,
    onToggleSettingsMenu: vi.fn(),
    onCloseSettingsMenu: vi.fn(),
    onOpenInstagramSettings: vi.fn(),
    onOpenAlbumManager: vi.fn(),
    onOpenLetterPicker: vi.fn(),
    onAddNew: vi.fn(),
  }

  it('renders admin heading when isAdmin is true', () => {
    render(<DashboardHeader {...mockProps} />)
    expect(screen.getByText('Dashboard Event')).toBeInTheDocument()
    expect(screen.getByText('Pantau & kelola semua acara')).toBeInTheDocument()
  })

  it('renders public heading when isAdmin is false', () => {
    render(<DashboardHeader {...mockProps} isAdmin={false} />)
    expect(screen.getByText('Jadwal Event')).toBeInTheDocument()
    expect(screen.getByText(/Jadwal acara publik/)).toBeInTheDocument()
  })

  it('shows admin controls when isAdmin is true', () => {
    render(<DashboardHeader {...mockProps} />)
    expect(screen.getByText('Tambah')).toBeInTheDocument()
    expect(screen.getByText('Buat Surat')).toBeInTheDocument()
  })

  it('hides admin controls when isAdmin is false', () => {
    render(<DashboardHeader {...mockProps} isAdmin={false} />)
    expect(screen.queryByText('Tambah')).not.toBeInTheDocument()
    expect(screen.queryByText('Buat Surat')).not.toBeInTheDocument()
  })

  it('calls onAddNew when Tambah button clicked', () => {
    render(<DashboardHeader {...mockProps} />)
    fireEvent.click(screen.getByText('Tambah'))
    expect(mockProps.onAddNew).toHaveBeenCalled()
  })

  it('toggles settings menu', () => {
    render(<DashboardHeader {...mockProps} />)
    const settingsBtn = screen.getByLabelText('Menu pengaturan')
    fireEvent.click(settingsBtn)
    expect(mockProps.onToggleSettingsMenu).toHaveBeenCalled()
  })

  it('shows settings menu items when open', () => {
    render(<DashboardHeader {...mockProps} showSettingsMenu={true} />)
    expect(screen.getByText('Landing Page')).toBeInTheDocument()
    expect(screen.getByText('Album Gallery')).toBeInTheDocument()
  })
})
