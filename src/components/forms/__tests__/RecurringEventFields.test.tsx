import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RecurringEventFields } from '../RecurringEventFields'

describe('RecurringEventFields', () => {
  const mockProps = {
    dateStr: '2024-01-15',
    jam: '10:00',
    recurrenceFrequency: 'weekly' as const,
    recurrenceDaysOfWeek: [1, 3],
    recurrenceDayOfMonth: 15,
    recurrenceInterval: 1,
    recurrenceEndDate: '2024-03-15',
    errors: {},
    onFieldChange: vi.fn(),
    onToggleDayOfWeek: vi.fn(),
  }

  it('renders frequency selector', () => {
    render(<RecurringEventFields {...mockProps} />)
    expect(screen.getByText('Frekuensi')).toBeInTheDocument()
  })

  it('shows day selector for weekly frequency', () => {
    render(<RecurringEventFields {...mockProps} />)
    expect(screen.getByText('Min')).toBeInTheDocument()
    expect(screen.getByText('Sen')).toBeInTheDocument()
    expect(screen.getByText('Sel')).toBeInTheDocument()
  })

  it('highlights selected days', () => {
    render(<RecurringEventFields {...mockProps} />)
    const senButton = screen.getByText('Sen')
    expect(senButton).toHaveClass('bg-violet-600')
  })

  it('calls onToggleDayOfWeek when day clicked', () => {
    render(<RecurringEventFields {...mockProps} />)
    fireEvent.click(screen.getByText('Rab'))
    expect(mockProps.onToggleDayOfWeek).toHaveBeenCalledWith(3)
  })

  it('shows day of month input for monthly frequency', () => {
    render(<RecurringEventFields {...mockProps} recurrenceFrequency="monthly" />)
    expect(screen.getByText('Setiap tanggal')).toBeInTheDocument()
  })

  it('shows interval input for custom frequency', () => {
    render(<RecurringEventFields {...mockProps} recurrenceFrequency="custom" />)
    expect(screen.getByText('Setiap berapa hari?')).toBeInTheDocument()
  })

  it('renders end date field', () => {
    render(<RecurringEventFields {...mockProps} />)
    expect(screen.getByText(/Sampai tanggal/)).toBeInTheDocument()
  })

  it('shows error messages', () => {
    const propsWithErrors = {
      ...mockProps,
      errors: { recurrenceEndDate: 'Tanggal akhir wajib diisi' },
    }
    render(<RecurringEventFields {...propsWithErrors} />)
    expect(screen.getByText('Tanggal akhir wajib diisi')).toBeInTheDocument()
  })
})
