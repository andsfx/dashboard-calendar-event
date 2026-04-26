import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EventFormDetailsFields } from '../EventFormDetailsFields'

describe('EventFormDetailsFields', () => {
  const mockProps = {
    eo: 'Test EO',
    pic: 'John Doe',
    phone: '08123456789',
    categories: ['Bazaar', 'Festival'],
    priority: 'high' as const,
    errors: {},
    eoSuggestions: ['Test EO', 'Another EO'],
    eoPlaceholder: 'Nama EO',
    onFieldChange: vi.fn(),
    onAddCategory: vi.fn(),
    onRemoveCategory: vi.fn(),
  }

  it('renders all form fields', () => {
    render(<EventFormDetailsFields {...mockProps} />)
    expect(screen.getByText(/Event Organizer/)).toBeInTheDocument()
    expect(screen.getByText(/Penanggung Jawab/)).toBeInTheDocument()
    expect(screen.getByText(/Nomor Handphone/)).toBeInTheDocument()
    expect(screen.getByText(/Jenis Acara/)).toBeInTheDocument()
    expect(screen.getByText('Prioritas')).toBeInTheDocument()
  })

  it('displays field values', () => {
    render(<EventFormDetailsFields {...mockProps} />)
    expect(screen.getByDisplayValue('Test EO')).toBeInTheDocument()
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('08123456789')).toBeInTheDocument()
  })

  it('displays selected categories', () => {
    render(<EventFormDetailsFields {...mockProps} />)
    expect(screen.getByText('Bazaar')).toBeInTheDocument()
    expect(screen.getByText('Festival')).toBeInTheDocument()
  })

  it('calls onRemoveCategory when X button clicked', () => {
    render(<EventFormDetailsFields {...mockProps} />)
    const removeBtn = screen.getByLabelText('Hapus kategori Bazaar')
    fireEvent.click(removeBtn)
    expect(mockProps.onRemoveCategory).toHaveBeenCalledWith('Bazaar')
  })

  it('displays selected categories', () => {
    render(<EventFormDetailsFields {...mockProps} />)
    expect(screen.getByText('Bazaar')).toBeInTheDocument()
    expect(screen.getByText('Festival')).toBeInTheDocument()
  })

  it('shows error messages', () => {
    const propsWithErrors = {
      ...mockProps,
      errors: { pic: 'PIC wajib diisi', phone: 'Nomor telepon tidak valid' },
    }
    render(<EventFormDetailsFields {...propsWithErrors} />)
    expect(screen.getByText('PIC wajib diisi')).toBeInTheDocument()
    expect(screen.getByText('Nomor telepon tidak valid')).toBeInTheDocument()
  })

  it('renders draft mode labels', () => {
    render(<EventFormDetailsFields {...mockProps} isDraft={true} />)
    expect(screen.getByText(/Nama EO/)).toBeInTheDocument()
    expect(screen.getByText(/Nomor Telepon/)).toBeInTheDocument()
  })
})
