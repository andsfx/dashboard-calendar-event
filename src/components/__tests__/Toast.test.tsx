import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Toast from '../Toast'

describe('Toast', () => {
  const mockToasts = [
    { id: '1', type: 'success' as const, title: 'Success', message: 'Operation completed' },
    { id: '2', type: 'error' as const, title: 'Error', message: 'Something went wrong' },
  ]

  it('renders nothing when no toasts', () => {
    const { container } = render(<Toast toasts={[]} onRemove={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all toast messages', () => {
    render(<Toast toasts={mockToasts} onRemove={vi.fn()} />)
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Operation completed')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('calls onRemove when close button clicked', () => {
    const onRemove = vi.fn()
    render(<Toast toasts={[mockToasts[0]]} onRemove={onRemove} />)
    fireEvent.click(screen.getByLabelText('Tutup notifikasi'))
    expect(onRemove).toHaveBeenCalledWith('1')
  })

  it('renders success toast with correct styling', () => {
    const { container } = render(<Toast toasts={[mockToasts[0]]} onRemove={vi.fn()} />)
    const toast = container.querySelector('[class*="bg-emerald"]')
    expect(toast).toBeInTheDocument()
  })

  it('renders error toast with correct styling', () => {
    const { container } = render(<Toast toasts={[mockToasts[1]]} onRemove={vi.fn()} />)
    const toast = container.querySelector('[class*="bg-red"]')
    expect(toast).toBeInTheDocument()
  })

  it('renders info toast', () => {
    const infoToast = { id: '3', type: 'info' as const, title: 'Info', message: 'Information message' }
    render(<Toast toasts={[infoToast]} onRemove={vi.fn()} />)
    expect(screen.getByText('Info')).toBeInTheDocument()
  })
})
