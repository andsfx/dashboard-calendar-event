import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EventFormModelFields } from '../EventFormModelFields'

describe('EventFormModelFields', () => {
  const mockProps = {
    eventModel: '' as const,
    eventNominal: '',
    eventModelNotes: '',
    errors: {},
    onFieldChange: vi.fn(),
  }

  it('renders model selector', () => {
    render(<EventFormModelFields {...mockProps} />)
    expect(screen.getByText('Model Event')).toBeInTheDocument()
  })

  it('shows all model options', () => {
    render(<EventFormModelFields {...mockProps} />)
    expect(screen.getByText('Pilih model')).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('Bayar')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
  })

  it('hides detail fields when model is empty or free', () => {
    render(<EventFormModelFields {...mockProps} />)
    expect(screen.queryByLabelText(/Nominal/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Keterangan Model Event/)).not.toBeInTheDocument()
  })

  it('shows detail fields when model is bayar', () => {
    render(<EventFormModelFields {...mockProps} eventModel="bayar" />)
    expect(screen.getByText(/Nominal/)).toBeInTheDocument()
    expect(screen.getByText(/Keterangan Model Event/)).toBeInTheDocument()
  })

  it('shows detail fields when model is support', () => {
    render(<EventFormModelFields {...mockProps} eventModel="support" />)
    expect(screen.getByText(/Nominal/)).toBeInTheDocument()
    expect(screen.getByText(/Keterangan Model Event/)).toBeInTheDocument()
  })

  it('calls onFieldChange when model changes', () => {
    const { container } = render(<EventFormModelFields {...mockProps} />)
    const select = container.querySelector('select')
    if (select) {
      fireEvent.change(select, { target: { value: 'bayar' } })
      expect(mockProps.onFieldChange).toHaveBeenCalledWith('eventModel', 'bayar')
    }
  })

  it('shows error messages', () => {
    const propsWithErrors = {
      ...mockProps,
      eventModel: 'bayar' as const,
      errors: { eventNominal: 'Nominal wajib diisi', eventModelNotes: 'Keterangan wajib diisi' },
    }
    render(<EventFormModelFields {...propsWithErrors} />)
    expect(screen.getByText('Nominal wajib diisi')).toBeInTheDocument()
    expect(screen.getByText('Keterangan wajib diisi')).toBeInTheDocument()
  })
})
