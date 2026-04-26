import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AdminBanner } from '../AdminBanner'

describe('AdminBanner', () => {
  it('renders admin mode message', () => {
    const onLogout = vi.fn()
    render(<AdminBanner onLogout={onLogout} />)
    expect(screen.getByText('Mode Admin Aktif')).toBeInTheDocument()
    expect(screen.getByText('Bisa tambah, edit, hapus acara')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    const onLogout = vi.fn()
    render(<AdminBanner onLogout={onLogout} />)
    expect(screen.getByText('Keluar')).toBeInTheDocument()
  })

  it('calls onLogout when logout button clicked', () => {
    const onLogout = vi.fn()
    render(<AdminBanner onLogout={onLogout} />)
    fireEvent.click(screen.getByText('Keluar'))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
